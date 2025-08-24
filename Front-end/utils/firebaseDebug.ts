/**
 * Debug Firebase configuration
 * Checks if all required Firebase environment variables are present
 */
export const debugFirebaseConfig = (): boolean => {
  const requiredKeys = [
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'EXPO_PUBLIC_FIREBASE_APP_ID'
  ];

  const missingKeys = requiredKeys.filter(key => !process.env[key]);
  
  if (missingKeys.length > 0) {
    console.warn('🔥 Firebase Debug: Missing environment variables:', missingKeys);
    return false;
  }

  console.log('🔥 Firebase Debug: All configuration variables are present');
  return true;
};

/**
 * Additional Firebase debugging utilities
 */
export const logFirebaseConfig = () => {
  if (__DEV__) {
    console.log('🔥 Firebase Config Debug:');
    console.log('API Key:', process.env.EXPO_PUBLIC_FIREBASE_API_KEY ? 'Present' : 'Missing');
    console.log('Auth Domain:', process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'Present' : 'Missing');
    console.log('Project ID:', process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ? 'Present' : 'Missing');
    console.log('Storage Bucket:', process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ? 'Present' : 'Missing');
    console.log('Messaging Sender ID:', process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? 'Present' : 'Missing');
    console.log('App ID:', process.env.EXPO_PUBLIC_FIREBASE_APP_ID ? 'Present' : 'Missing');
  }
};