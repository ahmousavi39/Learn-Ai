import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Dimensions, Alert } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { APP_CONFIG } from '../config/appConfig';

export interface LocalUserData {
  deviceHash: string;
  courseCount: number;
  userType: 'anonymous' | 'premium';
  isNew: boolean;
  createdAt: string;
}

class AnonymousAccountService {
  private static instance: AnonymousAccountService;
  private readonly STORAGE_KEY = 'device_user_data';
  private readonly BACKEND_URL = process.env.EXPO_PUBLIC_HTTP_SERVER || 'https://learn-ai-w8ke.onrender.com';

  static getInstance(): AnonymousAccountService {
    if (!AnonymousAccountService.instance) {
      AnonymousAccountService.instance = new AnonymousAccountService();
    }
    return AnonymousAccountService.instance;
  }

  /**
   * Generate a unique device hash using expo-application APIs for true device uniqueness
   */
  private async generateUniqueDeviceHash(): Promise<string> {
    try {
      Alert.alert('DEBUG', 'Step 8: generateUniqueDeviceHash starting');
      console.log('📱 Generating unique device hash using device APIs...');
      
      let uniqueDeviceId = '';
      
      if (Platform.OS === 'android') {
        Alert.alert('DEBUG', 'Step 8a: About to call getAndroidId()');
        // For Android, use Android ID (unique per device per app installation)
        uniqueDeviceId = await Application.getAndroidId() || '';
        Alert.alert('DEBUG', 'Step 8a: getAndroidId() completed');
        console.log('🤖 Android ID retrieved:', uniqueDeviceId ? 'Yes' : 'No');
      } else if (Platform.OS === 'ios') {
        Alert.alert('DEBUG', 'Step 8b: About to call getIosIdForVendorAsync() - CRITICAL FREEZE POINT');
        // For iOS, use Identifier for Vendor (unique per device per vendor)
        uniqueDeviceId = await Application.getIosIdForVendorAsync() || '';
        Alert.alert('DEBUG', 'Step 8b: getIosIdForVendorAsync() completed successfully!');
        console.log('🍎 iOS Vendor ID retrieved:', uniqueDeviceId ? 'Yes' : 'No');
      }
      
      Alert.alert('DEBUG', 'Step 8c: Platform-specific ID retrieval completed');
      
      // Fallback to Installation ID if platform-specific ID not available
      if (!uniqueDeviceId) {
        Alert.alert('DEBUG', 'Step 8d: Using installation ID fallback');
        uniqueDeviceId = Constants.installationId || Constants.sessionId || '';
        console.log('🔄 Using installation ID as fallback:', uniqueDeviceId ? 'Yes' : 'No');
      }
      
      // If still no ID, check for stored fallback
      if (!uniqueDeviceId) {
        console.log('⚠️ No device API ID available, checking stored fallback...');
        Alert.alert('DEBUG', 'Step 8e: Using stored fallback');
        uniqueDeviceId = await this.getOrCreateStoredFallback();
      }
      
      // Create device hash with device info for readability
      const deviceInfo = {
        platform: Platform.OS,
        screenWidth: Dimensions.get('window').width,
        screenHeight: Dimensions.get('window').height,
      };
      
      // Use first 8 characters of the unique ID for shorter hash
      const shortId = uniqueDeviceId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
      const deviceHash = `device_${deviceInfo.platform}_${deviceInfo.screenWidth}x${deviceInfo.screenHeight}_${shortId}`;
      
      console.log('✅ Generated unique device hash:', deviceHash);
      return deviceHash;
    } catch (error) {
      console.error('❌ Error generating unique device hash:', error);
      // Final emergency fallback
      return await this.getOrCreateStoredFallback();
    }
  }
  
  /**
   * Get or create a stored fallback ID for devices without proper APIs
   */
  private async getOrCreateStoredFallback(): Promise<string> {
    const FALLBACK_KEY = `${this.STORAGE_KEY}_fallback`;
    
    try {
      let fallbackId = await AsyncStorage.getItem(FALLBACK_KEY);
      
      if (!fallbackId) {
        // Create a timestamp-based ID that's deterministic per installation
        const timestamp = Date.now().toString(36);
        const installationInfo = Constants.installationId || Constants.sessionId || 'unknown';
        fallbackId = `fallback_${timestamp}_${installationInfo}`;
        
        await AsyncStorage.setItem(FALLBACK_KEY, fallbackId);
        console.log('🆕 Created stored fallback ID:', fallbackId);
      } else {
        console.log('📱 Retrieved stored fallback ID:', fallbackId);
      }
      
      return `device_${Platform.OS}_${fallbackId}`;
    } catch (error) {
      console.error('❌ Error with stored fallback:', error);
      return `device_${Platform.OS}_emergency_${Date.now()}`;
    }
  }

  /**
   * Main startup flow implementation
   */
  async initializeDevice(): Promise<LocalUserData> {
    try {
      Alert.alert('DEBUG', 'Step 7: initializeDevice() starting');
      console.log('🚀 Starting device initialization...');

      // Step 1: Check if hash is stored locally
      Alert.alert('DEBUG', 'Step 7a: Checking stored device hash');
      let deviceHash = await this.getStoredDeviceHash();
      Alert.alert('DEBUG', 'Step 7a: getStoredDeviceHash completed');
      
      if (!deviceHash) {
        console.log('🆕 No stored device hash found, generating new one...');
        Alert.alert('DEBUG', 'Step 7b: About to generate unique device hash - THIS MAY FREEZE');
        deviceHash = await this.generateUniqueDeviceHash();
        Alert.alert('DEBUG', 'Step 7b: generateUniqueDeviceHash completed successfully!');
      } else {
        console.log('✅ Found stored device hash:', deviceHash.substring(0, 20) + '...');
      }

      // Step 2: Post hash to backend
      console.log('📤 Posting device hash to backend...');
      Alert.alert('DEBUG', 'Step 7c: About to post to backend');
      const backendResponse = await this.postHashToBackend(deviceHash);
      Alert.alert('DEBUG', 'Step 7c: Backend request completed');

      // Step 3: Store hash locally
      console.log('💾 Storing device hash locally...');
      Alert.alert('DEBUG', 'Step 7d: About to store device hash');
      await this.storeDeviceHash(deviceHash);
      Alert.alert('DEBUG', 'Step 7d: Device hash stored successfully');

      // Step 4: Create local user data with course count from backend
      const userData: LocalUserData = {
        deviceHash: deviceHash,
        courseCount: backendResponse.courseCount,
        userType: backendResponse.userType,
        isNew: backendResponse.isNew,
        createdAt: backendResponse.createdAt
      };

      // Step 5: Store complete user data locally
      console.log('💾 Storing user data locally...');
      await this.storeUserData(userData);

      console.log('🎯 Device initialization complete!');
      console.log('📊 Course count:', userData.courseCount);
      console.log('👤 User type:', userData.userType);
      console.log('🆕 Is new user:', userData.isNew);

      return userData;
    } catch (error) {
      console.error('❌ Error in device initialization:', error);
      throw error;
    }
  }

  /**
   * Post device hash to backend
   */
  private async postHashToBackend(deviceHash: string): Promise<any> {
    try {
      const response = await fetch(`${this.BACKEND_URL}/api/auth/initialize-device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          deviceHash: deviceHash
        })
      });

      if (!response.ok) {
        throw new Error(`Backend request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Backend response:', result);
      return result;
    } catch (error) {
      console.error('❌ Error posting to backend:', error);
      throw error;
    }
  }

  /**
   * Get stored device hash from local storage
   */
  private async getStoredDeviceHash(): Promise<string | null> {
    try {
      const stored = await AsyncStorage.getItem(`${this.STORAGE_KEY}_hash`);
      return stored;
    } catch (error) {
      console.error('❌ Error getting stored device hash:', error);
      return null;
    }
  }

  /**
   * Store device hash locally
   */
  private async storeDeviceHash(deviceHash: string): Promise<void> {
    try {
      await AsyncStorage.setItem(`${this.STORAGE_KEY}_hash`, deviceHash);
      console.log('💾 Device hash stored locally');
    } catch (error) {
      console.error('❌ Error storing device hash:', error);
      throw error;
    }
  }

  /**
   * Store complete user data locally
   */
  private async storeUserData(userData: LocalUserData): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(userData));
      console.log('💾 User data stored locally');
    } catch (error) {
      console.error('❌ Error storing user data:', error);
      throw error;
    }
  }

  /**
   * Get stored user data
   */
  async getUserData(): Promise<LocalUserData | null> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const userData = JSON.parse(stored);
        console.log('📖 Retrieved user data:', userData.deviceHash.substring(0, 20) + '...', 'courses:', userData.courseCount);
        return userData;
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting user data:', error);
      return null;
    }
  }

  /**
   * Update course count by syncing with backend (more accurate than local increment)
   */
  async incrementCourseCount(): Promise<void> {
    try {
      console.log('📈 Syncing course count with backend after course generation...');
      
      // Get fresh data from backend to ensure accuracy
      const userData = await this.getUserData();
      if (!userData) {
        throw new Error('No user data found');
      }

      // Post current hash to backend to get updated count
      const backendData = await this.postHashToBackend(userData.deviceHash);
      
      // Update local data with backend response
      const updatedUserData: LocalUserData = {
        deviceHash: userData.deviceHash,
        courseCount: backendData.courseCount,
        userType: backendData.userType || 'anonymous',
        isNew: false,
        createdAt: userData.createdAt
      };

      await this.storeUserData(updatedUserData);
      console.log('📈 Course count synced to:', updatedUserData.courseCount);
      
    } catch (error) {
      console.error('❌ Error syncing course count:', error);
      
      // Fallback: increment locally if backend sync fails
      try {
        const userData = await this.getUserData();
        if (userData) {
          userData.courseCount += 1;
          await this.storeUserData(userData);
          console.log('📈 Course count incremented locally to:', userData.courseCount);
        }
      } catch (fallbackError) {
        console.error('❌ Fallback increment also failed:', fallbackError);
      }
      
      throw error;
    }
  }

  /**
   * Check if user can generate more courses
   */
  async canGenerateCourse(): Promise<{
    canGenerate: boolean;
    needsSubscription?: boolean;
    resetDate?: string;
    remainingCourses?: number;
  }> {
    try {
      const userData = await this.getUserData();
      if (!userData) {
        // If no user data, they can generate (will be created during generation)
        return { canGenerate: true };
      }

      const monthlyLimit = userData.userType === 'premium' 
        ? APP_CONFIG.COURSE_LIMITS.PREMIUM_USER_MONTHLY_LIMIT 
        : APP_CONFIG.COURSE_LIMITS.FREE_USER_MONTHLY_LIMIT;

      const canGenerate = userData.courseCount < monthlyLimit;
      const remainingCourses = Math.max(0, monthlyLimit - userData.courseCount);

      return {
        canGenerate,
        needsSubscription: !canGenerate && userData.userType === 'anonymous',
        remainingCourses
      };
    } catch (error) {
      console.error('❌ Error checking course generation limits:', error);
      // On error, deny generation for safety
      return { canGenerate: false };
    }
  }

  /**
   * Clear all local data (for testing/reset)
   */
  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      await AsyncStorage.removeItem(`${this.STORAGE_KEY}_hash`);
      console.log('🗑️ All local data cleared');
    } catch (error) {
      console.error('❌ Error clearing data:', error);
      throw error;
    }
  }
}

export default AnonymousAccountService;
