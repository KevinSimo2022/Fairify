import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, GoogleAuthProvider, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Firebase configuration - Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "maphera-demo.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "maphera-demo",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "maphera-demo.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Set Firebase Auth persistence to local storage
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Error setting Firebase Auth persistence:', error);
});

// Connect to emulators only if explicitly enabled
const shouldUseEmulators = import.meta.env.VITE_USE_EMULATORS === 'true';

console.log('🔧 Firebase Configuration Debug:');
console.log('- VITE_USE_EMULATORS:', import.meta.env.VITE_USE_EMULATORS);
console.log('- shouldUseEmulators:', shouldUseEmulators);
console.log('- Firebase Project ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID);
console.log('- Environment:', import.meta.env.MODE);

if (shouldUseEmulators) {
  let authConnected = false;
  let firestoreConnected = false;
  let storageConnected = false;
  let functionsConnected = false;

  try {
    // Auth emulator
    if (!authConnected) {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      authConnected = true;
      console.log('✅ Connected to Auth emulator');
    }
  } catch (error) {
    console.log('⚠️ Auth emulator connection skipped:', error.message);
  }
  
  try {
    // Firestore emulator
    if (!firestoreConnected) {
      connectFirestoreEmulator(db, 'localhost', 8080);
      firestoreConnected = true;
      console.log('✅ Connected to Firestore emulator');
    }
  } catch (error) {
    console.log('⚠️ Firestore emulator connection skipped:', error.message);
  }
  
  try {
    // Storage emulator
    if (!storageConnected) {
      connectStorageEmulator(storage, 'localhost', 9199);
      storageConnected = true;
      console.log('✅ Connected to Storage emulator');
    }
  } catch (error) {
    console.log('⚠️ Storage emulator connection skipped:', error.message);
  }
  
  try {
    // Functions emulator
    if (!functionsConnected) {
      connectFunctionsEmulator(functions, 'localhost', 5001);
      functionsConnected = true;
      console.log('✅ Connected to Functions emulator');
    }
  } catch (error) {
    console.log('⚠️ Functions emulator connection skipped:', error.message);
  }

  console.log('🔧 Firebase emulator configuration complete');
} else {
  console.log('🌐 Using production Firebase services');
}

export default app;
export { app };
