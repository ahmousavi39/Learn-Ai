import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';

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
   * Simple device hash generation with minimal API calls
   */
  private async generateSimpleDeviceHash(): Promise<string> {
    try {
      // Use the most reliable identifiers first
      let uniqueId = Constants.installationId || Constants.sessionId || '';
      
      // Only try platform-specific IDs with aggressive timeout
      if (!uniqueId) {
        try {
          if (Platform.OS === 'ios') {
            // Set very short timeout for iOS vendor ID
            const timeoutPromise = new Promise<string>((_, reject) => 
              setTimeout(() => reject(new Error('timeout')), 2000)
            );
            const idPromise = Application.getIosIdForVendorAsync();
            uniqueId = await Promise.race([idPromise, timeoutPromise]) || '';
          } else if (Platform.OS === 'android') {
            uniqueId = await Application.getAndroidId() || '';
          }
        } catch (error) {
          // Ignore errors and use fallback
          uniqueId = '';
        }
      }

      // Final fallback - use timestamp and random
      if (!uniqueId) {
        uniqueId = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      // Create simple hash
      const shortId = uniqueId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
      return `device_${Platform.OS}_${shortId}`;
    } catch (error) {
      // Emergency fallback
      return `device_${Platform.OS}_emergency_${Date.now()}`;
    }
  }

  /**
   * Simplified initialization with aggressive timeouts
   */
  async initializeDevice(): Promise<LocalUserData> {
    try {
      // First try to get existing data
      const existingData = await this.getStoredUserData();
      if (existingData && existingData.deviceHash) {
        return existingData;
      }

      // Generate device hash with timeout
      const hashPromise = this.generateSimpleDeviceHash();
      const hashTimeoutPromise = new Promise<string>((_, reject) => 
        setTimeout(() => reject(new Error('hash timeout')), 5000)
      );
      
      const deviceHash = await Promise.race([hashPromise, hashTimeoutPromise]);

      // Try backend with aggressive timeout
      let backendData;
      try {
        const backendPromise = this.postHashToBackend(deviceHash);
        const backendTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('backend timeout')), 8000)
        );
        backendData = await Promise.race([backendPromise, backendTimeoutPromise]);
      } catch (error) {
        // Use fallback if backend fails
        backendData = {
          courseCount: 3,
          userType: 'anonymous',
          isNew: true,
          createdAt: new Date().toISOString()
        };
      }

      // Create user data
      const userData: LocalUserData = {
        deviceHash: deviceHash,
        courseCount: backendData.courseCount,
        userType: backendData.userType,
        isNew: backendData.isNew,
        createdAt: backendData.createdAt
      };

      // Store locally with timeout
      try {
        await Promise.race([
          this.storeUserData(userData),
          new Promise((_, reject) => setTimeout(() => reject(new Error('storage timeout')), 3000))
        ]);
      } catch (error) {
        // Continue even if storage fails
      }

      return userData;
    } catch (error) {
      // Final emergency fallback
      const emergencyData: LocalUserData = {
        deviceHash: `emergency_${Date.now()}`,
        courseCount: 3,
        userType: 'anonymous',
        isNew: true,
        createdAt: new Date().toISOString()
      };
      
      try {
        await this.storeUserData(emergencyData);
      } catch (e) {
        // Ignore storage errors in emergency mode
      }
      
      return emergencyData;
    }
  }

  private async postHashToBackend(deviceHash: string): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(`${this.BACKEND_URL}/api/auth/initialize-device`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceHash: deviceHash }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async getStoredUserData(): Promise<LocalUserData | null> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }

  private async storeUserData(userData: LocalUserData): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(userData));
    } catch (error) {
      // Ignore storage errors
    }
  }

  async getUserData(): Promise<LocalUserData | null> {
    return await this.getStoredUserData();
  }

  async incrementCourseCount(): Promise<void> {
    try {
      const userData = await this.getStoredUserData();
      if (userData) {
        userData.courseCount += 1;
        await this.storeUserData(userData);
      }
    } catch (error) {
      // Ignore errors
    }
  }

  canGenerateCourse(): boolean {
    // Always allow for now - implement limits later
    return true;
  }

  async syncWithBackend(): Promise<void> {
    // Implement if needed
  }

  async clearUserData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      // Ignore errors
    }
  }
}

export default AnonymousAccountService;
