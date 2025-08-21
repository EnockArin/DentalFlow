import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Your Firebase configuration
// Replace with your actual Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyChxAIKlop8YGTb2-5qTMuc1mPhNGXyKHY",
  authDomain: "dentalflow-15562.firebaseapp.com",
  projectId: "dentalflow-15562",
  storageBucket: "dentalflow-15562.firebasestorage.app",
  messagingSenderId: "580198105709",
  appId: "1:580198105709:android:b12959eaf662013bf23564"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication with AsyncStorage persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Initialize Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;