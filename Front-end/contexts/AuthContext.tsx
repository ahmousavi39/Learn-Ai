import React, { createContext, useContext, useEffect, useState } from 'react';
import authService, { AuthUser } from '../services/authService';
import AnonymousAccountService, { LocalUserData } from '../services/anonymousAccountService_simple';
import { APP_CONFIG } from '../config/appConfig';

interface AuthContextType {
  user: AuthUser | null;
  localUserData: LocalUserData | null;
  loading: boolean;
  checkAuthState: () => Promise<void>;
  incrementCourseCount: () => Promise<void>;
  canGenerateCourse: () => boolean;
  courseGenerationStatus: {
    canGenerate: boolean;
    isLimitReached: boolean;
    remainingCourses: number;
    resetDate?: string;
  } | null;
  syncWithBackend: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [localUserData, setLocalUserData] = useState<LocalUserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [courseGenerationStatus, setCourseGenerationStatus] = useState<{
    canGenerate: boolean;
    isLimitReached: boolean;
    remainingCourses: number;
    resetDate?: string;
  } | null>(null);

  const anonymousService = AnonymousAccountService.getInstance();

  const checkAuthState = async () => {
    try {
      setLoading(true);
      console.log('🔍 Starting device initialization...');

      // Initialize device hash approach
      const userData = await anonymousService.initializeDevice();
      setLocalUserData(userData);

      // Create AuthUser object for compatibility
      const authUser: AuthUser = {
        uid: userData.deviceHash,
        email: null,
        displayName: null,
        emailVerified: false,
        isAnonymous: true,
        coursesGenerated: userData.courseCount
      };

      setUser(authUser);
      console.log('✅ Device initialization complete!');
      console.log('📱 Device hash:', userData.deviceHash.substring(0, 20) + '...');
      console.log('📊 Course count:', userData.courseCount);

      // Set course generation status
      const remainingCourses = APP_CONFIG.COURSE_LIMITS.FREE_USER_MONTHLY_LIMIT - userData.courseCount;
      setCourseGenerationStatus({
        canGenerate: remainingCourses > 0,
        isLimitReached: remainingCourses <= 0,
        remainingCourses: Math.max(0, remainingCourses)
      });

    } catch (error) {
      console.error('❌ Device initialization error:', error);
      setUser(null);
      setLocalUserData(null);
      setCourseGenerationStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const incrementCourseCount = async () => {
    try {
      await anonymousService.incrementCourseCount();
      
      // Update local state
      const updatedData = await anonymousService.getUserData();
      if (updatedData) {
        setLocalUserData(updatedData);
        
        // Update AuthUser object
        if (user) {
          setUser({
            ...user,
            coursesGenerated: updatedData.courseCount
          });
        }

        // Update course generation status
        const remainingCourses = APP_CONFIG.COURSE_LIMITS.FREE_USER_MONTHLY_LIMIT - updatedData.courseCount;
        setCourseGenerationStatus({
          canGenerate: remainingCourses > 0,
          isLimitReached: remainingCourses <= 0,
          remainingCourses: Math.max(0, remainingCourses)
        });
      }
    } catch (error) {
      console.error('❌ Error incrementing course count:', error);
      throw error;
    }
  };

  const syncWithBackend = async () => {
    try {
      console.log('🔄 Syncing with backend...');
      await checkAuthState();
      console.log('✅ Backend sync complete');
    } catch (error) {
      console.error('❌ Backend sync failed:', error);
      throw error;
    }
  };

  const canGenerateCourse = (): boolean => {
    if (!localUserData) return false;
    
    // Use app config for anonymous user limit
    return localUserData.courseCount < APP_CONFIG.COURSE_LIMITS.FREE_USER_MONTHLY_LIMIT;
  };

  useEffect(() => {
    checkAuthState();
  }, []);

  const value: AuthContextType = {
    user,
    localUserData,
    loading,
    checkAuthState,
    incrementCourseCount,
    canGenerateCourse,
    courseGenerationStatus,
    syncWithBackend
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
