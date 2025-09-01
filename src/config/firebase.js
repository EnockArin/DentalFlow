import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseConfig as hardcodedConfig } from './firebase.config';

// Use hardcoded config in production, environment variables in development
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || hardcodedConfig.apiKey,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || hardcodedConfig.authDomain,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || hardcodedConfig.projectId,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || hardcodedConfig.storageBucket,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || hardcodedConfig.messagingSenderId,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || hardcodedConfig.appId
};

// Validate configuration
const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingFields = requiredFields.filter(field => !firebaseConfig[field]);

if (missingFields.length > 0) {
  console.error('Missing Firebase configuration fields:', missingFields);
  // In production, we should have all fields from hardcoded config
  if (!__DEV__) {
    throw new Error(`Critical: Missing Firebase configuration fields: ${missingFields.join(', ')}`);
  }
}

// Initialize Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw error;
}

// Initialize Firebase Authentication with AsyncStorage persistence
// Check if auth is already initialized to prevent re-initialization error
let auth;
try {
  auth = getAuth(app);
} catch (error) {
  // If getAuth fails, auth hasn't been initialized yet
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
}

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');

export { auth };

// Initialize Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;