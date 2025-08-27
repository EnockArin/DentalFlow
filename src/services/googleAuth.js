import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../config/firebase';

// Configure Google Sign-In
export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    // The web client ID from Firebase console
    webClientId: process.env.EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID,
    // Enable offline access
    offlineAccess: true,
    // Request user profile and email
    scopes: ['profile', 'email'],
  });
};

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    // Check if device supports Google Play Services
    await GoogleSignin.hasPlayServices();
    
    // Get user info from Google
    const userInfo = await GoogleSignin.signIn();
    
    // Create Firebase credential
    const googleCredential = GoogleAuthProvider.credential(userInfo.idToken);
    
    // Sign in to Firebase with the credential
    const userCredential = await signInWithCredential(auth, googleCredential);
    
    return {
      success: true,
      user: userCredential.user,
      userInfo,
    };
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    
    let errorMessage = 'Google Sign-In failed. Please try again.';
    
    // Handle specific error codes
    if (error.code) {
      switch (error.code) {
        case 'auth/account-exists-with-different-credential':
          errorMessage = 'An account already exists with the same email but different sign-in credentials.';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Invalid Google credentials. Please try again.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Google Sign-In is not enabled for this app.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled.';
          break;
        case 'auth/user-not-found':
          errorMessage = 'No account found. Please create an account first.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Invalid credentials.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection.';
          break;
        default:
          if (error.message) {
            errorMessage = error.message;
          }
      }
    }
    
    // Handle Google Sign-In specific errors
    if (error.code === 12501) {
      // User cancelled the sign-in
      errorMessage = 'Google Sign-In was cancelled.';
    } else if (error.code === 7) {
      // Network error
      errorMessage = 'Network error. Please check your internet connection.';
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
};

// Sign out from Google
export const signOutFromGoogle = async () => {
  try {
    await GoogleSignin.signOut();
    return { success: true };
  } catch (error) {
    console.error('Google Sign-Out Error:', error);
    return {
      success: false,
      error: 'Failed to sign out from Google.',
    };
  }
};

// Check if user is signed in to Google
export const isSignedInToGoogle = async () => {
  try {
    return await GoogleSignin.isSignedIn();
  } catch (error) {
    console.error('Error checking Google Sign-In status:', error);
    return false;
  }
};

// Get current Google user info
export const getCurrentGoogleUser = async () => {
  try {
    const userInfo = await GoogleSignin.signInSilently();
    return { success: true, userInfo };
  } catch (error) {
    console.error('Error getting current Google user:', error);
    return { success: false, error: error.message };
  }
};