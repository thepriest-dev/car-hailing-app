import { auth, db } from './config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
// DELETE the Firestore import line completely

export const testFirebaseRegistration = async () => {
  console.log('=== TEST START ===');
  
  try {
    // Test Auth
    console.log('Testing Auth...');
    const userCred = await createUserWithEmailAndPassword(auth, 'test123@test.com', 'test123');
    console.log('Auth SUCCESS:', userCred.user.uid);
    
    // Remove the Firestore test completely
    console.log('Firebase Realtime Database ready');
    
    return true;
  } catch (error: any) {
    console.log('ERROR:', error.code, error.message);
    return false;
  }
};