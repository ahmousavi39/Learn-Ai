import React, { createContext, useContext, useEffect, useState } from 'react';
import authService, { AuthUser } from '../services/authService';
import { retryFirestoreConnection } from '../utils/firestoreConnectionTest';

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
      
      // Test Firestore connection first
      console.log('🔍 Testing Firestore connection before auth...');
      await retryFirestoreConnection(2); // Only 2 quick attempts
      
      // Wait for Firebase auth state to initialize properly
      console.log('⏳ Waiting for Firebase auth state to load...');
      
      // Create a promise that resolves when auth state is determined
      const authStatePromise = new Promise<AuthUser | null>((resolve) => {
        const unsubscribe = authService.onAuthStateChange((firebaseUser) => {
          unsubscribe(); // Stop listening after first state change
          
          if (firebaseUser) {
            console.log('✅ Found persisted Firebase user:', firebaseUser.uid);
            // Convert Firebase User to AuthUser
            const authUser: AuthUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              emailVerified: firebaseUser.emailVerified,
              isAnonymous: firebaseUser.isAnonymous,
              coursesGenerated: 0
            };
            resolve(authUser);
          } else {
            console.log('ℹ️ No persisted Firebase user found');
            resolve(null);
          }
        });
      });
      
      // Wait for auth state with timeout
      const timeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Auth state timeout')), 3000)
      );
      
      const currentUser = await Promise.race([
        authStatePromise,
        timeoutPromise
      ]) as AuthUser | null;
      
      if (currentUser) {
        if (currentUser.isAnonymous) {
          setUser(currentUser);
        } else {
          // For regular users, verify subscription
          try {
            const hasValidSubscription = await authService.checkSubscriptionStatus(currentUser.uid);
            if (hasValidSubscription) {
              setUser(currentUser);
            } else {
              await authService.signOut();
              await signInAnonymouslyInternal();
            }
          } catch (subError) {
            console.warn('Subscription check failed, allowing user:', subError);
            setUser(currentUser);
          }
        }
      } else {
        // No user found, sign in anonymously
        await signInAnonymouslyInternal();
      }
    } catch (error) {
      console.error('Auth state error:', error);
      // Only fall back to local user if there's a persistent problem
      console.log('� Falling back to local user due to connection issues');
      const fallbackUser: AuthUser = {
        uid: 'local-' + Date.now(),
        email: null,
        displayName: 'Local User',
        emailVerified: false,
        isAnonymous: true,
        coursesGenerated: 0
      };
      setUser(fallbackUser);
    } finally {
      setLoading(false);
    }
  };

  const signInAnonymouslyInternal = async () => {
    try {
      // Check if we already have a stored anonymous user first
      const storedUser = await authService.getCurrentUser();
      if (storedUser && storedUser.isAnonymous) {
        console.log('✅ Using existing stored anonymous user:', storedUser.uid);
        setUser(storedUser);
        return;
      }
      
      console.log('🔄 Creating new Firebase anonymous user...');
      const anonymousUser = await authService.signInAnonymously();
      if (anonymousUser) {
        console.log('✅ New Firebase anonymous user created:', anonymousUser.uid);
        setUser(anonymousUser);
      } else {
        throw new Error('Failed to create anonymous user');
      }
    } catch (error) {
      console.error('❌ Firebase anonymous auth failed:', error);
      console.log('� Creating local fallback user');
      const fallbackUser: AuthUser = {
        uid: 'local-' + Date.now(),
        email: null,
        displayName: 'Local User',
        emailVerified: false,
        isAnonymous: true,
        coursesGenerated: 0
      };
      setUser(fallbackUser);
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
