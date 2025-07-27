import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  initializeFirestore, 
  getFirestore,
  memoryLocalCache, 
  memoryEagerGarbageCollector, 
  terminate, 
  clearIndexedDbPersistence 
} from 'firebase/firestore';
import { debugFirebaseConfig } from '../utils/firebaseDebug';

// Debug Firebase configuration in development
if (__DEV__) {
  const hasAllConfig = debugFirebaseConfig();
  if (!hasAllConfig) {
    console.log('🚀 Missing Firebase config - enabling fast offline mode');
  }
}

// Firebase config from environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

// Check if Firebase config is complete
const hasCompleteConfig = Object.values(firebaseConfig).every(value => value && value !== '');

console.log('🔧 Firebase config status:', {
  hasCompleteConfig,
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : 'Missing'
});

console.log('🔧 Detailed config check:');
Object.entries(firebaseConfig).forEach(([key, value]) => {
  console.log(`- ${key}: ${value ? '✅ Set' : '❌ Missing'} ${value ? `(${typeof value}, length: ${value.length})` : ''}`);
});

if (__DEV__ && !hasCompleteConfig) {
  console.log('⚠️ Incomplete Firebase config - running in offline mode');
  console.log('🔧 Missing config values:', Object.entries(firebaseConfig)
    .filter(([key, value]) => !value || value === '')
    .map(([key]) => key)
  );
} else {
  console.log('✅ Firebase configuration appears complete');
}

// Initialize Firebase (use existing app if available)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth (persistence is broken in React Native, we'll handle it manually)
let auth;

try {
  // Try to get existing auth instance first
  auth = getAuth(app);
  console.log('✅ Using existing Auth instance');
} catch (error) {
  // Simple initialization without persistence (we'll handle persistence manually)
  auth = initializeAuth(app);
  console.log('⚠️ Auth initialized without automatic persistence');
  console.log('🔧 Manual persistence will be handled by app logic');
}

// Initialize Firestore with proper singleton pattern
let db;
let isFirestoreTerminated = false;

try {
  // First try to get existing Firestore instance
  db = getFirestore(app);
  console.log('✅ Using existing Firestore instance');
} catch (error) {
  // If no existing instance, initialize with development-friendly settings
  try {
    const firestoreSettings: any = {
      localCache: memoryLocalCache({
        garbageCollector: memoryEagerGarbageCollector()
      })
    };
    
    // Only use long polling in production or if specifically needed
    if (!__DEV__ || process.env.EXPO_PUBLIC_FORCE_LONG_POLLING === 'true') {
      firestoreSettings.experimentalForceLongPolling = true;
    }
    
    db = initializeFirestore(app, firestoreSettings);
    console.log('✅ Firestore initialized with optimized settings for', __DEV__ ? 'development' : 'production');
  } catch (initError) {
    console.error('❌ Failed to initialize Firestore:', initError);
    // Last resort: try to get the default instance
    try {
      db = getFirestore(app);
      console.log('✅ Retrieved default Firestore instance');
    } catch (fallbackError) {
      console.error('❌ Complete Firestore failure:', fallbackError);
      db = null;
    }
  }
}

// Function to completely terminate Firestore connections
export const terminateFirestore = async (): Promise<void> => {
  if (db && !isFirestoreTerminated) {
    try {
      await terminate(db);
      isFirestoreTerminated = true;
      console.log('Firestore connections terminated');
    } catch (error) {
      console.warn('Error terminating Firestore:', error);
    }
  }
};

// Function to reinitialize Firestore after termination
export const reinitializeFirestore = (): void => {
  if (isFirestoreTerminated) {
    try {
      db = initializeFirestore(app, {
        localCache: memoryLocalCache({
          garbageCollector: memoryEagerGarbageCollector()
        })
      });
      isFirestoreTerminated = false;
      console.log('Firestore reinitialized');
    } catch (error) {
      console.error('Failed to reinitialize Firestore:', error);
      db = null;
    }
  }
};

// Function to check if Firestore is terminated
export const isFirestoreActive = (): boolean => {
  return db !== null && !isFirestoreTerminated;
};

export { auth, db };
export default app;
