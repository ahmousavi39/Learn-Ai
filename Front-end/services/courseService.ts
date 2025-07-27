import { auth } from './firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getItem, putItem } from '../app/services/AsyncStorage';
import { Platform } from 'react-native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import APP_CONFIG from '../config/appConfig';
import AnonymousAccountService from './anonymousAccountService';

class CourseService {
  private static instance: CourseService;
  
  static getInstance(): CourseService {
    if (!CourseService.instance) {
      CourseService.instance = new CourseService();
    }
    return CourseService.instance;
  }

  // Check if user can generate course (local check first)
  async canGenerateCourse(): Promise<{ canGenerate: boolean; message?: string; needsSubscription?: boolean }> {
    try {
      const anonymousService = AnonymousAccountService.getInstance();
      const result = await anonymousService.canGenerateCourse();
      
      if (!result.canGenerate) {
        return {
          canGenerate: false,
          message: result.needsSubscription 
            ? `You've reached your limit of ${APP_CONFIG.COURSE_LIMITS.FREE_USER_MONTHLY_LIMIT} courses this month. Upgrade to Premium for more courses!`
            : `You've reached your monthly course limit. Resets on ${new Date(result.resetDate || '').toLocaleDateString()}`,
          needsSubscription: result.needsSubscription
        };
      }

      return { canGenerate: true };
    } catch (error) {
      console.error('❌ Failed to check course generation limits:', error);
      return { 
        canGenerate: false, 
        message: 'Unable to check course limits. Please try again.' 
      };
    }
  }

  // Get authentication headers using device hash for anonymous users
  private async getAuthHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    try {
      // Get device hash from anonymous account service
      const anonymousService = AnonymousAccountService.getInstance();
      const userData = await anonymousService.getUserData();
      
      if (userData && userData.deviceHash) {
        // Use device hash as authorization for anonymous users
        headers['Authorization'] = `Bearer ${userData.deviceHash}`;
        headers['x-user-uid'] = userData.deviceHash;
        headers['x-user-type'] = userData.userType;
        headers['x-device-hash'] = userData.deviceHash;
        
        console.log(`🔐 Auth headers set for device: ${userData.deviceHash.substring(0, 20)}... (${userData.userType})`);
      } else {
        console.warn('⚠️ No device hash found for course generation');
        throw new Error('Device authentication required for course generation');
      }
    } catch (error) {
      console.error('Failed to get device authentication:', error);
      throw new Error('Authentication required for course generation');
    }

    return headers;
  }

  // Get or create guest ID
  private async getGuestId(): Promise<string> {
    try {
      let guestId = await getItem('guestId');
      
      if (!guestId) {
        // Create unique guest ID using UUID and timestamp
        const deviceId = uuidv4();
        const timestamp = Date.now();
        guestId = `guest_${deviceId}_${timestamp}`;
        await putItem('guestId', guestId);
      }
      
      return guestId;
    } catch (error) {
      console.error('Error managing guest ID:', error);
      return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  // Check course generation limits using Firebase UID for better tracking
  async checkCourseGenerationLimits(): Promise<{
    canGenerate: boolean;
    coursesGenerated: number;
    limit: number;
    remaining: number;
    message?: string;
  }> {
    try {
      console.log('📊 Checking course generation limits with Firebase UID...');
      
      // Get Firebase user UID (required for tracking)
      const user = auth.currentUser;
      if (!user) {
        console.warn('⚠️ No authenticated user found');
        return {
          canGenerate: false,
          coursesGenerated: 0,
          limit: APP_CONFIG.COURSE_LIMITS.FREE_USER_MONTHLY_LIMIT,
          remaining: 0,
          message: 'Authentication required to generate courses.'
        };
      }
      
      // Use Firebase UID for course count tracking
      const userId = user.uid;
      console.log(`👤 Checking limits for user: ${userId.substring(0, 8)}...`);
      
      // Get course count from local storage using Firebase UID
      const courseCountKey = `courseCount_${userId}`;
      const coursesGenerated = await getItem(courseCountKey) || 0;
      
      // Use local config limits
      const limit = APP_CONFIG.COURSE_LIMITS.FREE_USER_MONTHLY_LIMIT;
      const remaining = Math.max(0, limit - coursesGenerated);
      const canGenerate = remaining > 0;
      
      console.log(`📊 User limits: ${coursesGenerated}/${limit} (${remaining} remaining)`);
      
      return {
        canGenerate,
        coursesGenerated,
        limit,
        remaining,
        message: canGenerate ? undefined : 'You have reached your monthly course generation limit. Upgrade to premium for more courses.'
      };
    } catch (error) {
      console.error('Error checking course limits:', error);
      // On error, deny generation for security
      return {
        canGenerate: false,
        coursesGenerated: 0,
        limit: APP_CONFIG.COURSE_LIMITS.FREE_USER_MONTHLY_LIMIT,
        remaining: 0,
        message: 'Unable to verify course limits. Please try again.'
      };
    }
  }

  // Generate course with device hash authentication
  async generateCourse(data: {
    topic: string;
    level: string;
    time: string;
    language: string;
    requestId: string;
    files?: any[];
  }): Promise<Response> {
    
    // First check if user can generate course locally
    const limitCheck = await this.canGenerateCourse();
    if (!limitCheck.canGenerate) {
      throw new Error(limitCheck.message || 'Course generation limit reached');
    }

    const headers = await this.getAuthHeaders();
    
    const formData = new FormData();
    
    // Get device hash for backend verification
    const anonymousService = AnonymousAccountService.getInstance();
    const userData = await anonymousService.getUserData();
    
    if (userData) {
      // Remove Authorization from headers since we're using FormData
      const { Authorization, ...otherHeaders } = headers as any;
      
      // Add device hash to form data for backend verification
      formData.append('deviceHash', userData.deviceHash);
      formData.append('userType', userData.userType);
    }
    
    // Add files if provided
    if (data.files && data.files.length > 0) {
      data.files.forEach(file => {
        formData.append('files', {
          uri: file.uri,
          name: file.name || 'upload.jpg',
          type: file.type || 'image/jpeg',
        } as any);
      });
    }
    
    formData.append('topic', data.topic);
    formData.append('level', data.level);
    formData.append('time', data.time);
    formData.append('language', data.language);
    formData.append('requestId', data.requestId);

    // Make the API call
    const response = await fetch(`${process.env.EXPO_PUBLIC_HTTP_SERVER}/generate-course`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userData?.deviceHash}`,
        // Don't set Content-Type for FormData - let browser set it with boundary
      },
      body: formData,
    });

    // If successful, increment local course count
    if (response.ok) {
      try {
        const anonymousService = AnonymousAccountService.getInstance();
        await anonymousService.incrementCourseCount();
        console.log('✅ Local course count incremented after successful generation');
      } catch (error) {
        console.error('❌ Failed to increment local course count:', error);
        // Don't fail the entire operation for this
      }
    }

    return response;
  }

  // Get user's saved courses
  async getUserCourses(): Promise<any[]> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${process.env.EXPO_PUBLIC_HTTP_SERVER}/api/courses`, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        return data.courses || [];
      } else {
        console.error('Failed to fetch user courses:', response.status);
        return [];
      }
    } catch (error) {
      console.error('Error fetching user courses:', error);
      return [];
    }
  }

  // Delete a course
  async deleteCourse(courseId: string): Promise<boolean> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${process.env.EXPO_PUBLIC_HTTP_SERVER}/api/courses/${courseId}`, {
        method: 'DELETE',
        headers,
      });

      return response.ok;
    } catch (error) {
      console.error('Error deleting course:', error);
      return false;
    }
  }

  // Regenerate lesson with authentication
  async regenerateLesson(data: {
    bulletpoints: string[];
    level: string;
    language: string;
  }): Promise<Response> {
    const headers = await this.getAuthHeaders();
    
    return fetch(`${process.env.EXPO_PUBLIC_HTTP_SERVER}/regenerate-lesson`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
  }

  // Increment course count using Firebase UID for better tracking
  async incrementCourseCount(): Promise<void> {
    try {
      // Require authenticated Firebase user
      const user = auth.currentUser;
      if (!user) {
        console.warn('⚠️ Cannot increment course count: No authenticated user');
        return;
      }
      
      // Use Firebase UID for tracking
      const userId = user.uid;
      console.log(`📈 Incrementing course count for user: ${userId.substring(0, 8)}...`);
      
      // Get current count and increment
      const courseCountKey = `courseCount_${userId}`;
      const currentCount = await getItem(courseCountKey) || 0;
      const newCount = currentCount + 1;
      
      // Store updated count
      await putItem(courseCountKey, newCount);
      
      console.log(`📈 Course count updated for user: ${currentCount} → ${newCount}`);
      console.log(`💾 Course count stored in AsyncStorage: ${courseCountKey} = ${newCount}`);
      
      // Log all course-related storage after update
      const allKeys = await AsyncStorage.getAllKeys();
      const courseKeys = allKeys.filter(key => key.includes('courseCount') || key.includes('course'));
      if (courseKeys.length > 0) {
        console.log(`📋 All course-related storage:`, courseKeys);
        for (const key of courseKeys) {
          const value = await getItem(key);
          console.log(`   ${key}: ${value}`);
        }
      }
    } catch (error) {
      console.error('Error incrementing course count:', error);
    }
  }

  // Reset course count for current Firebase user (useful for testing)
  async resetCourseCount(): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.warn('⚠️ Cannot reset course count: No authenticated user');
        return;
      }
      
      const userId = user.uid;
      const courseCountKey = `courseCount_${userId}`;
      await AsyncStorage.removeItem(courseCountKey);
      
      console.log(`🔄 Course count reset for user: ${userId.substring(0, 8)}...`);
    } catch (error) {
      console.error('Error resetting course count:', error);
    }
  }
}

export default CourseService.getInstance();
