import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  User,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth } from './firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
}

class AuthService {
  private static instance: AuthService;
  
  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Check if user has valid subscription
  async checkSubscriptionStatus(uid: string): Promise<boolean> {
    try {
      const response = await fetch(`${process.env.PUBLIC_HTTP_SERVER}/api/auth/check-subscription`, {
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
          emailVerified: user.emailVerified
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
        emailVerified: user.emailVerified
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

  // Get current user from AsyncStorage
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const userString = await AsyncStorage.getItem('authUser');
      return userString ? JSON.parse(userString) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
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
