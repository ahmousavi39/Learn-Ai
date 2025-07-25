import React, { createContext, useContext, useEffect, useState } from 'react';
import authService, { AuthUser } from '../services/authService';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInAnonymously: () => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  canGenerateCourse: boolean;
  incrementCourseCount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      setLoading(true);
      const currentUser = await authService.getCurrentUser();
      
      if (currentUser) {
        if (currentUser.isAnonymous) {
          // For anonymous users, always allow them
          setUser(currentUser);
        } else {
          // For regular users, verify subscription is still valid
          const hasValidSubscription = await authService.checkSubscriptionStatus(currentUser.uid);
          
          if (hasValidSubscription) {
            setUser(currentUser);
          } else {
            // Subscription expired, sign out
            await authService.signOut();
            setUser(null);
          }
        }
      } else {
        // No user found, sign in anonymously
        await signInAnonymouslyInternal();
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      // If error, try to sign in anonymously
      try {
        await signInAnonymouslyInternal();
      } catch (anonymousError) {
        console.error('Error signing in anonymously:', anonymousError);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const signInAnonymouslyInternal = async () => {
    try {
      const anonymousUser = await authService.signInAnonymously();
      if (anonymousUser) {
        setUser(anonymousUser);
      }
    } catch (error) {
      console.error('Error signing in anonymously:', error);
      throw error;
    }
  };

  const signInAnonymously = async () => {
    setLoading(true);
    try {
      await signInAnonymouslyInternal();
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const result = await authService.signIn(email, password);
    if (result.user && result.hasSubscription) {
      setUser(result.user);
    } else {
      throw new Error('Invalid credentials or no active subscription');
    }
  };

  const signOut = async () => {
    await authService.signOut();
    // After signing out, sign in anonymously again
    await signInAnonymouslyInternal();
  };

  const incrementCourseCount = async () => {
    if (user && user.isAnonymous) {
      // Use device-based counting instead of user-based
      const newCount = await authService.incrementDeviceCoursesGenerated();
      setUser({ ...user, coursesGenerated: newCount });
    }
  };

  const canGenerateCourse = user ? 
    (!user.isAnonymous || (user.coursesGenerated ?? 0) < 2) : 
    false;

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signInAnonymously,
    signOut,
    isAuthenticated: !!user && !user.isAnonymous,
    canGenerateCourse,
    incrementCourseCount,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
