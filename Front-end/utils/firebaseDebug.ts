// Firebase Debug Utility
// Use this to diagnose Firebase connection issues

export const debugFirebaseConfig = () => {
  console.log('🔍 Firebase Configuration Debug:');
  
  const config = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ? '✅ Set' : '❌ Missing',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Missing',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ? '✅ Set' : '❌ Missing',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? '✅ Set' : '❌ Missing',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ? '✅ Set' : '❌ Missing',
  };
  
  console.log('Environment Variables:', config);
  console.log('Project ID:', process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID);
  console.log('Auth Domain:', process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN);
  
  // Check if any are missing
  const missing = Object.entries(config).filter(([key, value]) => value === '❌ Missing');
  
  if (missing.length > 0) {
    console.log('❌ Missing Firebase environment variables:', missing.map(([key]) => key));
    console.log('💡 Make sure your .env file contains all required EXPO_PUBLIC_FIREBASE_* variables');
  } else {
    console.log('✅ All Firebase environment variables are configured');
    console.log('🔍 Checking Firestore connection...');
  }
  
  return missing.length === 0;
};
