import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  User,
  sendPasswordResetEmail,
  updateProfile,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithCredential,
  OAuthProvider
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, DocumentSnapshot } from 'firebase/firestore';
import { auth, db, isFirestoreActive } from './firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Dimensions } from 'react-native';
import Constants from 'expo-constants';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  coursesGenerated?: number;
  requiresPremiumSignup?: boolean; // Flag to indicate invalid user needs premium signup
}

class AuthService {
  private static instance: AuthService;
  private firestoreEnabled = true; // Can be disabled if connection issues persist
  
  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Disable Firestore if experiencing persistent connection issues
  disableFirestore(): void {
    this.firestoreEnabled = false;
    console.log('Firestore disabled - using local storage only');
  }

  // Re-enable Firestore
  enableFirestore(): void {
    this.firestoreEnabled = true;
    console.log('Firestore re-enabled');
  }

  // Create device fingerprint using multiple device characteristics
  private async createDeviceFingerprint(): Promise<string> {
    try {
      const { width, height } = Dimensions.get('window');
      const screenInfo = `${width}x${height}`;
      
      // Combine device characteristics for fingerprint
      const deviceInfo = {
        platform: Platform.OS,
        version: Platform.Version,
        screen: screenInfo,
        brand: Constants.deviceName || 'unknown',
        model: Constants.platform?.ios?.model || Constants.platform?.android?.model || 'unknown',
        installationId: Constants.installationId || 'unknown'
      };
      
      // Create hash-like string from device info
      const deviceString = JSON.stringify(deviceInfo);
      let hash = 0;
      for (let i = 0; i < deviceString.length; i++) {
        const char = deviceString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      
      return `device_${Math.abs(hash)}_${Platform.OS}`;
    } catch (error) {
      console.error('Error creating device fingerprint:', error);
      // Fallback to random ID if fingerprinting fails
      return `device_${uuidv4()}_${Platform.OS}`;
    }
  }

  // Get device-based course count (prioritize local storage, sync with Firestore when available)
  async getDeviceCoursesGenerated(): Promise<number> {
    try {
      const deviceId = await this.createDeviceFingerprint();
      
      // Always get from local storage first (most reliable and fast)
      const localCount = await AsyncStorage.getItem(`device_courses_${deviceId}`);
      const localCountNumber = localCount ? parseInt(localCount, 10) : 0;
      
      // Try to sync with Firestore in background (non-blocking)
      this.syncWithFirestoreBackground(deviceId, localCountNumber);
      
      return localCountNumber;
    } catch (error) {
      console.error('Error getting device course count:', error);
      return 0;
    }
  }

  // Background sync with Firestore (non-blocking)
  private async syncWithFirestoreBackground(deviceId: string, localCount: number): Promise<void> {
    if (!db || !this.firestoreEnabled || !isFirestoreActive()) return; // Skip if Firestore not available or disabled
    
    try {
      const docRef = doc(db, 'deviceCourses', deviceId);
      
      // Quick timeout for background sync
      const docSnap = await Promise.race([
        getDoc(docRef),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Background sync timeout')), 2000)
        )
      ]) as DocumentSnapshot;
      
      if (docSnap && docSnap.exists()) {
        const firestoreData = docSnap.data();
        const firestoreCount = firestoreData.count || 0;
        
        // If Firestore has a higher count, update local storage
        if (firestoreCount > localCount) {
          await AsyncStorage.setItem(`device_courses_${deviceId}`, firestoreCount.toString());
        }
        // If local count is higher, update Firestore
        else if (localCount > firestoreCount) {
          await setDoc(docRef, {
            deviceId,
            count: localCount,
            lastUpdated: new Date().toISOString(),
            platform: Platform.OS
          });
        }
      } else if (localCount > 0) {
        // Create Firestore document if it doesn't exist and we have local data
        await setDoc(docRef, {
          deviceId,
          count: localCount,
          lastUpdated: new Date().toISOString(),
          platform: Platform.OS
        });
      }
    } catch (error) {
      // Silently fail background sync - local storage is primary
      console.debug('Background Firestore sync failed:', error);
      
      // If we get too many errors, consider disabling Firestore temporarily
      if (error.message?.includes('transport errored') || error.message?.includes('timeout')) {
        console.warn('Persistent Firestore connection issues detected');
      }
    }
  }

  // Increment device-based course count (local-first approach)
  async incrementDeviceCoursesGenerated(): Promise<number> {
    try {
      const deviceId = await this.createDeviceFingerprint();
      const currentCount = await this.getDeviceCoursesGenerated();
      const newCount = currentCount + 1;
      
      // Always update local storage immediately (primary source)
      await AsyncStorage.setItem(`device_courses_${deviceId}`, newCount.toString());
      console.log(`💾 Device course count stored: device_courses_${deviceId.substring(0, 8)}... = ${newCount}`);
      
      // Try to sync with Firestore in background (non-blocking)
      this.updateFirestoreBackground(deviceId, newCount);
      
      return newCount;
    } catch (error) {
      console.error('Error incrementing device course count:', error);
      throw error;
    }
  }

  // Background Firestore update (non-blocking)
  private async updateFirestoreBackground(deviceId: string, count: number): Promise<void> {
    if (!db || !this.firestoreEnabled || !isFirestoreActive()) return; // Skip if Firestore not available or disabled
    
    try {
      const docRef = doc(db, 'deviceCourses', deviceId);
      
      // Quick timeout for background update
      await Promise.race([
        setDoc(docRef, {
          deviceId,
          count,
          lastUpdated: new Date().toISOString(),
          platform: Platform.OS
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Background update timeout')), 2000)
        )
      ]);
    } catch (error) {
      // Silently fail background update - local storage is primary
      console.debug('Background Firestore update failed:', error);
      
      // If we get too many errors, consider disabling Firestore temporarily
      if (error.message?.includes('transport errored') || error.message?.includes('timeout')) {
        console.warn('Persistent Firestore connection issues detected');
      }
    }
  }

  // Check if device can generate more courses (device-based limit)
  async canDeviceGenerateCourse(): Promise<boolean> {
    const count = await this.getDeviceCoursesGenerated();
    return count < 2; // Allow 2 courses per device
  }

  // Create simple guest user (no Firebase needed for free users)
  private async createGuestUser(): Promise<AuthUser> {
    const deviceId = await this.createDeviceFingerprint();
    const coursesGenerated = await this.getDeviceCoursesGenerated();
    
    return {
      uid: `guest_${deviceId}`,
      email: null,
      displayName: 'Guest User',
      emailVerified: false,
      isAnonymous: true,
      coursesGenerated
    };
  }

  // Test Firebase connection and configuration
  async testFirebaseConnection(): Promise<boolean> {
    try {
      console.log('🔧 Testing Firebase connection...');
      
      // Check environment variables first
      console.log('🔍 Firebase Config Status:');
      console.log('- API Key:', process.env.EXPO_PUBLIC_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing');
      console.log('- Project ID:', process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '❌ Missing');
      console.log('- Auth Domain:', process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '❌ Missing');
      
      // Check if auth is initialized
      if (!auth) {
        console.error('❌ Firebase Auth not initialized');
        return false;
      }
      
      // Check if we can access auth properties
      const authReady = !!auth.app;
      console.log('🔧 Firebase Auth app ready:', authReady);
      
      if (!authReady) {
        console.error('❌ Firebase Auth app not ready');
        return false;
      }
      
      console.log('📍 Firebase App Info:');
      console.log('- Auth Domain:', auth.app.options.authDomain);
      console.log('- Project ID:', auth.app.options.projectId);
      console.log('- API Key:', auth.app.options.apiKey ? '✅ Set' : '❌ Missing');
      
      // Try to get current auth state (this will trigger connection)
      const currentUser = auth.currentUser;
      console.log('🔧 Current Firebase user:', currentUser?.uid || 'none');
      
      // Test network connectivity with auth state listener
      console.log('🌐 Testing Firebase network connectivity...');
      
      const connectionTest = new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          console.warn('⏰ Firebase connection timeout - may indicate network issues');
          resolve(true); // Don't fail on timeout, just warn
        }, 3000);
        
        const unsubscribe = auth.onAuthStateChanged((user) => {
          clearTimeout(timeout);
          console.log('🔍 Auth state listener triggered:', user ? `User: ${user.uid}` : 'No user');
          unsubscribe();
          resolve(true);
        }, (error) => {
          clearTimeout(timeout);
          console.error('❌ Auth state change error:', error);
          unsubscribe();
          resolve(false);
        });
      });
      
      const isConnected = await connectionTest;
      
      if (isConnected) {
        console.log('✅ Firebase connection test passed');
      } else {
        console.error('❌ Firebase connection test failed');
      }
      
      return isConnected;
      
    } catch (error) {
      console.error('❌ Firebase connection test failed:', error);
      return false;
    }
  }

  // Sign in anonymously using device hash as consistent identifier
  async signInAnonymously(): Promise<AuthUser | null> {
    try {
      console.log('🔍 Starting anonymous sign-in process...');
      console.log('🔍 Step 1: Skipping connection test (might be causing hang)...');
      
      console.log('🔍 Step 2: Checking Firebase auth state...');
      console.log('🔧 Firebase auth state:', {
        isAuthReady: !!auth,
        currentUser: auth?.currentUser?.uid || 'none'
      });
      
      console.log('🔍 Step 3: Attempting to restore existing session...');
      // First, try to restore existing anonymous session for this device
      const existingUser = await this.restoreAnonymousSession();
      if (existingUser) {
        console.log('✅ Restored existing anonymous session:', existingUser.uid);
        return existingUser;
      }

      console.log('� Step 4: No existing session, creating new Firebase user...');
      console.log('�🔄 Creating new Firebase anonymous user...');
      console.log('🔧 Auth instance ready:', !!auth);
      
      // Ensure we have a valid Firebase auth instance
      if (!auth) {
        throw new Error('Firebase Auth not initialized');
      }
      
      console.log('� Step 5: Pre-flight checks...');
      console.log('�🔧 Pre-flight Firebase auth checks:');
      console.log('- Auth instance exists:', !!auth);
      console.log('- Auth app exists:', !!auth.app);
      console.log('- Auth app name:', auth.app?.name);
      console.log('- Auth app options valid:', !!auth.app?.options);
      console.log('- Project ID:', auth.app?.options?.projectId);
      console.log('- API Key length:', auth.app?.options?.apiKey?.length || 0);
      
      // Test auth readiness with a simple property access
      try {
        const currentUserBeforeSignIn = auth.currentUser;
        console.log('- Current user before sign-in:', currentUserBeforeSignIn?.uid || 'none');
      } catch (accessError) {
        console.error('❌ Error accessing auth.currentUser:', accessError);
        throw new Error('Firebase Auth instance not accessible');
      }
      
      console.log('🔍 Step 6: Calling Firebase signInAnonymously...');
      // Create new anonymous Firebase user with better error handling
      console.log('📞 Calling Firebase signInAnonymously...');
      
      try {
        // Ultra-simplified approach - direct call without timeout protection
        console.log('⚡ Attempting ultra-simple Firebase signInAnonymously call...');
        
        const result = await signInAnonymously(auth);
        console.log('🎉 Firebase signInAnonymously completed successfully!');
        
        const user = result.user;
        
        console.log('🎉 Firebase signInAnonymously completed:', {
          success: !!user,
          uid: user?.uid,
          isAnonymous: user?.isAnonymous
        });
        
        if (!user) {
          throw new Error('Firebase returned null user');
        }
        
        console.log('✅ Firebase anonymous user created successfully:', user.uid);
        const deviceId = await this.createDeviceFingerprint();
        
        // Update the user's display name to include device hash for identification
        try {
          await updateProfile(user, { 
            displayName: `Device_${deviceId}` 
          });
          console.log('✅ User profile updated with device ID');
        } catch (profileError) {
          console.warn('⚠️ Failed to update profile, continuing...', profileError);
        }

        // Store device information in Firestore for better tracking
        if (this.firestoreEnabled && isFirestoreActive()) {
          try {
            const userDocRef = doc(db, 'users', user.uid);
            await setDoc(userDocRef, {
              deviceId,
              deviceFingerprint: deviceId,
              platform: Platform.OS,
              isAnonymous: true,
              createdAt: new Date().toISOString(),
              lastSeen: new Date().toISOString(),
              coursesGenerated: 0
            }, { merge: true });
          } catch (error) {
            console.warn('Failed to store user data in Firestore:', error);
          }
        }

        // Get current device course count
        const coursesGenerated = await this.getDeviceCoursesGenerated();
        
        const authUser: AuthUser = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          emailVerified: user.emailVerified,
          isAnonymous: user.isAnonymous,
          coursesGenerated
        };

        // Store the mapping between device hash and Firebase UID
        await AsyncStorage.setItem(`device_firebase_${deviceId}`, user.uid);
        await AsyncStorage.setItem(`firebase_device_${user.uid}`, deviceId);
        
        // Store the full user data for persistence
        await AsyncStorage.setItem('authUser', JSON.stringify(authUser));
        console.log('💾 Anonymous user stored locally for persistence');
        
        return authUser;
        
      } catch (firebaseError) {
        console.error('❌ Firebase signInAnonymously failed:', firebaseError);
        throw new Error(`Firebase authentication failed: ${firebaseError.message}`);
      }
      
    } catch (error) {
      console.error('❌ Error signing in anonymously:', error);
      // Don't create fallback user here - Firebase MUST work for backend course generation
      throw error;
    }
  }

  // Restore existing anonymous session for this device
  private async restoreAnonymousSession(): Promise<AuthUser | null> {
    try {
      const deviceId = await this.createDeviceFingerprint();
      const existingUid = await AsyncStorage.getItem(`device_firebase_${deviceId}`);
      
      if (existingUid) {
        // Check if current Firebase user matches stored UID
        if (auth.currentUser?.uid === existingUid) {
          console.log('✅ Firebase user already matches device UID:', existingUid);
          const coursesGenerated = await this.getDeviceCoursesGenerated();
          
          // Update last seen timestamp in Firestore
          if (this.firestoreEnabled && isFirestoreActive()) {
            try {
              const userDocRef = doc(db, 'users', auth.currentUser.uid);
              await setDoc(userDocRef, {
                lastSeen: new Date().toISOString(),
                deviceId
              }, { merge: true });
            } catch (error) {
              console.warn('Failed to update last seen in Firestore:', error);
            }
          }
          
          return {
            uid: auth.currentUser.uid,
            email: auth.currentUser.email,
            displayName: auth.currentUser.displayName,
            emailVerified: auth.currentUser.emailVerified,
            isAnonymous: auth.currentUser.isAnonymous,
            coursesGenerated
          };
        } else {
          // We have a stored UID but no current Firebase user
          // This suggests Firebase auth hasn't loaded yet or session was lost
          console.log('ℹ️ Found stored UID but no current Firebase user. UID:', existingUid);
          
          // Try to get user data from local storage as fallback
          const storedUserData = await AsyncStorage.getItem('authUser');
          if (storedUserData) {
            const userData = JSON.parse(storedUserData);
            if (userData.uid === existingUid) {
              console.log('✅ Using stored user data for device:', deviceId);
              const coursesGenerated = await this.getDeviceCoursesGenerated();
              return {
                ...userData,
                coursesGenerated
              };
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error restoring anonymous session:', error);
      return null;
    }
  }

  // Get course generation count for anonymous users (now device-based)
  async getAnonymousCoursesGenerated(uid: string): Promise<number> {
    // Use device-based counting instead of user-based
    return await this.getDeviceCoursesGenerated();
  }

  // Increment course generation count for anonymous users (now device-based)
  async incrementAnonymousCoursesGenerated(uid: string): Promise<number> {
    // Use device-based counting instead of user-based
    return await this.incrementDeviceCoursesGenerated();
  }

  // Check if anonymous user can generate more courses (now device-based)
  async canAnonymousUserGenerateCourse(uid: string): Promise<boolean> {
    // Use device-based counting instead of user-based
    return await this.canDeviceGenerateCourse();
  }

  // Check if user has valid subscription
  async checkSubscriptionStatus(uid: string): Promise<boolean> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_HTTP_SERVER}/api/auth/check-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid }),
      });
      
      const data = await response.json();
      return data.hasValidSubscription;
    } catch (error) {
      console.error('Error checking subscription:', error);
      return false;
    }
  }

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<{ user: AuthUser | null; hasSubscription: boolean }> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      if (user) {
        const authUser: AuthUser = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          emailVerified: user.emailVerified,
          isAnonymous: user.isAnonymous
        };
        
        // Check subscription status
        const hasSubscription = await this.checkSubscriptionStatus(user.uid);
        
        if (hasSubscription) {
          await AsyncStorage.setItem('authUser', JSON.stringify(authUser));
          return { user: authUser, hasSubscription: true };
        } else {
          // User exists but no valid subscription
          await this.signOut();
          throw new Error('No valid subscription found. Please subscribe to continue.');
        }
      }
      
      return { user: null, hasSubscription: false };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign in');
    }
  }

  // Create account after successful subscription verification
  async createAccount(email: string, password: string, displayName?: string): Promise<AuthUser> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      if (displayName) {
        await updateProfile(user, { displayName });
      }
      
      const authUser: AuthUser = {
        uid: user.uid,
        email: user.email,
        displayName: displayName || user.displayName,
        emailVerified: user.emailVerified,
        isAnonymous: user.isAnonymous
      };
      
      await AsyncStorage.setItem('authUser', JSON.stringify(authUser));
      return authUser;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create account');
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
      await signOut(auth);
      await AsyncStorage.removeItem('authUser');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign out');
    }
  }

  // Ensure user is authenticated (create anonymous if needed)
  async ensureAuthenticated(): Promise<AuthUser> {
    try {
      console.log('🔍 Starting authentication check...');
      
      // Check if there's already a current user
      const currentUser = await this.getCurrentUser();
      if (currentUser) {
        console.log('✅ User already authenticated:', currentUser.uid);
        return currentUser;
      }

      // No user found, create anonymous account - Firebase REQUIRED for backend
      console.log('🔍 No authenticated user found, creating Firebase anonymous account...');
      console.log('⚠️ Firebase authentication is REQUIRED for course generation');
      
      const anonymousUser = await this.signInAnonymously();
      
      if (anonymousUser) {
        console.log('✅ Firebase anonymous account created successfully:', anonymousUser.uid);
        return anonymousUser;
      }

      throw new Error('Failed to create Firebase anonymous account - backend requires Firebase authentication');
    } catch (error) {
      console.error('❌ Critical error: Firebase authentication failed:', error);
      console.error('❌ Backend will not generate courses without Firebase authentication');
      
      // Don't create fallback - Firebase is required for backend functionality
      throw new Error(`Firebase authentication required: ${error.message}`);
    }
  }

  // Get current user from Firebase and storage
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      // First check if there's a Firebase user
      const firebaseUser = auth.currentUser;
      
      if (firebaseUser) {
        const authUser: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          emailVerified: firebaseUser.emailVerified,
          isAnonymous: firebaseUser.isAnonymous
        };
        
        // If anonymous, add device-based course count
        if (firebaseUser.isAnonymous) {
          authUser.coursesGenerated = await this.getDeviceCoursesGenerated();
        }
        
        return authUser;
      }
      
      // Fallback to stored user
      const userString = await AsyncStorage.getItem('authUser');
      return userString ? JSON.parse(userString) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // Sign in with Google
  async signInWithGoogle(googleIdToken: string): Promise<{ user: AuthUser | null; hasSubscription: boolean }> {
    try {
      const credential = GoogleAuthProvider.credential(googleIdToken);
      const userCredential = await signInWithCredential(auth, credential);
      const firebaseUser = userCredential.user;

      if (firebaseUser) {
        // Check if this is a premium user by verifying with backend
        const idToken = await firebaseUser.getIdToken();
        const hasSubscription = await this.verifyPremiumStatus(firebaseUser.email!, idToken);

        const authUser: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          emailVerified: firebaseUser.emailVerified,
          isAnonymous: false,
          coursesGenerated: 0
        };

        if (this.firestoreEnabled && isFirestoreActive()) {
          const userDocRef = doc(db, 'users', authUser.uid);
          await setDoc(userDocRef, {
            uid: authUser.uid,
            email: authUser.email,
            displayName: authUser.displayName,
            emailVerified: authUser.emailVerified,
            createdAt: new Date().toISOString(),
            authProvider: 'google'
          });
        }
        await AsyncStorage.setItem('authUser', JSON.stringify(authUser));

        return { user: authUser, hasSubscription };
      }
      
      return { user: null, hasSubscription: false };
    } catch (error: any) {
      console.error('Google sign in error:', error);
      throw new Error(error.message || 'Failed to sign in with Google');
    }
  }

  // Sign in with Apple
  async signInWithApple(appleIdToken: string, nonce?: string): Promise<{ user: AuthUser | null; hasSubscription: boolean }> {
    try {
      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({
        idToken: appleIdToken,
        rawNonce: nonce
      });
      
      const userCredential = await signInWithCredential(auth, credential);
      const firebaseUser = userCredential.user;

      if (firebaseUser) {
        // Check if this is a premium user by verifying with backend
        const idToken = await firebaseUser.getIdToken();
        const hasSubscription = await this.verifyPremiumStatus(firebaseUser.email!, idToken);

        const authUser: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          emailVerified: firebaseUser.emailVerified,
          isAnonymous: false,
          coursesGenerated: 0
        };

        if (this.firestoreEnabled && isFirestoreActive()) {
          const userDocRef = doc(db, 'users', authUser.uid);
          await setDoc(userDocRef, {
            uid: authUser.uid,
            email: authUser.email,
            displayName: authUser.displayName,
            emailVerified: authUser.emailVerified,
            createdAt: new Date().toISOString(),
            authProvider: 'apple'
          });
        }
        await AsyncStorage.setItem('authUser', JSON.stringify(authUser));

        return { user: authUser, hasSubscription };
      }
      
      return { user: null, hasSubscription: false };
    } catch (error: any) {
      console.error('Apple sign in error:', error);
      throw new Error(error.message || 'Failed to sign in with Apple');
    }
  }

  // Helper method to verify premium status with backend
  private async verifyPremiumStatus(email: string, idToken: string): Promise<boolean> {
    try {
      const response = await fetch('https://your-backend.com/api/auth/subscription-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        const data = await response.json();
        return data.isPremium || false;
      }
      return false;
    } catch (error) {
      console.error('Error verifying premium status:', error);
      return false;
    }
  }

  // Reset password
  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to send reset email');
    }
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }

  // Get Firebase ID token for backend verification
  async getIdToken(): Promise<string | null> {
    try {
      const user = auth.currentUser;
      if (user) {
        return await user.getIdToken();
      }
      return null;
    } catch (error) {
      console.error('Error getting ID token:', error);
      return null;
    }
  }
}

export default AuthService.getInstance();
