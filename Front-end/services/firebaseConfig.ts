import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, memoryEagerGarbageCollector, terminate, clearIndexedDbPersistence } from 'firebase/firestore';

// Firebase config from environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
const auth = getAuth(app);

// Initialize Firestore with offline-friendly settings
let db;
let isFirestoreTerminated = false;

try {
  // Use memory cache and disable persistence to avoid connection issues
  db = initializeFirestore(app, {
    localCache: memoryLocalCache({
      garbageCollector: memoryEagerGarbageCollector()
    })
  });
  console.log('Firestore initialized with memory cache');
} catch (error) {
  console.error('Failed to initialize Firestore:', error);
  // Create a mock db object that will cause operations to fail gracefully
  db = null;
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
