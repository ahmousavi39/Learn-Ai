import { db, isFirestoreActive } from '../services/firebaseConfig';
import { doc, getDoc, enableNetwork, disableNetwork } from 'firebase/firestore';

export const testFirestoreConnection = async (): Promise<boolean> => {
  if (!db || !isFirestoreActive()) {
    console.log('📱 Firestore not available - using local storage mode');
    return false;
  }

  try {
    console.log('🔍 Testing Firestore connection...');
    
    // Try to enable network first
    await enableNetwork(db);
    
    // Simple connection test - try to read a non-existent document
    const testDoc = doc(db, 'connection-test', 'test');
    await getDoc(testDoc);
    
    console.log('✅ Firestore connection successful');
    return true;
  } catch (error: any) {
    console.warn('⚠️ Firestore connection test failed:', error.message);
    
    // If we get transport errors, switch to offline mode
    if (error.message?.includes('transport') || error.code === 'unavailable') {
      console.log('🔄 Switching to offline mode due to transport issues');
      try {
        await disableNetwork(db);
        console.log('📱 Firestore offline mode enabled');
      } catch (offlineError) {
        console.warn('Could not enable offline mode:', offlineError);
      }
    }
    
    return false;
  }
};

export const retryFirestoreConnection = async (maxRetries: number = 3): Promise<boolean> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`🔄 Firestore connection attempt ${attempt}/${maxRetries}`);
    
    const isConnected = await testFirestoreConnection();
    if (isConnected) {
      return true;
    }
    
    // Wait before retry (exponential backoff)
    if (attempt < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.log('❌ All Firestore connection attempts failed - staying in offline mode');
  return false;
};
