import { auth } from './firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

class CourseService {
  private static instance: CourseService;
  
  static getInstance(): CourseService {
    if (!CourseService.instance) {
      CourseService.instance = new CourseService();
    }
    return CourseService.instance;
  }

  // Get authentication headers
  private async getAuthHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add auth token if user is logged in with Firebase (not local users)
    const user = auth.currentUser;
    if (user && !user.uid.startsWith('local-')) {
      try {
        const token = await user.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      } catch (error) {
        console.error('Failed to get auth token:', error);
        // Fallback to guest mode
        const guestId = await this.getGuestId();
        headers['x-guest-id'] = guestId;
      }
    } else {
      // For guests and local users, add a unique identifier
      const guestId = await this.getGuestId();
      headers['x-guest-id'] = guestId;
    }

    return headers;
  }

  // Get or create guest ID
  private async getGuestId(): Promise<string> {
    try {
      let guestId = await AsyncStorage.getItem('guestId');
      
      if (!guestId) {
        // Create unique guest ID using UUID and timestamp
        const deviceId = uuidv4();
        const timestamp = Date.now();
        guestId = `guest_${deviceId}_${timestamp}`;
        await AsyncStorage.setItem('guestId', guestId);
      }
      
      return guestId;
    } catch (error) {
      console.error('Error managing guest ID:', error);
      return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  // Check course generation limits
  async checkCourseGenerationLimits(): Promise<{
    canGenerate: boolean;
    coursesGenerated: number;
    limit: number;
    remaining: number;
    message?: string;
  }> {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${process.env.EXPO_PUBLIC_HTTP_SERVER}/api/course-limits`, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        return await response.json();
      } else {
        // Default for authenticated users or on error
        return {
          canGenerate: true,
          coursesGenerated: 0,
          limit: Infinity,
          remaining: Infinity
        };
      }
    } catch (error) {
      console.error('Error checking course limits:', error);
      return {
        canGenerate: true,
        coursesGenerated: 0,
        limit: Infinity,
        remaining: Infinity
      };
    }
  }

  // Generate course with authentication
  async generateCourse(data: {
    topic: string;
    level: string;
    time: string;
    language: string;
    requestId: string;
    files?: any[];
  }): Promise<Response> {
    const headers = await this.getAuthHeaders();
    
    const formData = new FormData();
    
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

    return fetch(`${process.env.EXPO_PUBLIC_HTTP_SERVER}/generate-course`, {
      method: 'POST',
      headers: {
        // Don't set Content-Type for FormData - let browser set it
        ...headers,
        'Content-Type': undefined as any,
      },
      body: formData,
    });
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
}

export default CourseService.getInstance();
