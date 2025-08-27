import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../config/firebase';

// Complete the authentication flow for web browsers
WebBrowser.maybeCompleteAuthSession();

// Configure Google Sign-In
export const configureGoogleSignIn = () => {
  // No configuration needed for Expo AuthSession
  console.log('Google Sign-In configured for Expo');
};

// Sign in with Google using Expo AuthSession
export const signInWithGoogle = async () => {
  try {
    const clientId = process.env.EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID;
    
    if (!clientId) {
      throw new Error('Google Web Client ID not found in environment variables');
    }

    // Configure the auth request
    const request = new AuthSession.AuthRequest({
      clientId: clientId,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.IdToken,
      redirectUri: AuthSession.makeRedirectUri({
        useProxy: true,
      }),
    });

    // Prompt for authentication
    const result = await request.promptAsync({
      authorizationEndpoint: 'https://accounts.google.com/oauth/v2/auth',
    });

    if (result.type === 'success') {
      // Extract the ID token
      const { id_token } = result.params;
      
      if (!id_token) {
        throw new Error('No ID token received from Google');
      }

      // Create Firebase credential
      const googleCredential = GoogleAuthProvider.credential(id_token);
      
      // Sign in to Firebase with the credential
      const userCredential = await signInWithCredential(auth, googleCredential);
      
      return {
        success: true,
        user: userCredential.user,
      };
    } else if (result.type === 'cancel') {
      return {
        success: false,
        error: 'Google Sign-In was cancelled.',
      };
    } else {
      return {
        success: false,
        error: 'Google Sign-In failed. Please try again.',
      };
    }
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
    
    return {
      success: false,
      error: errorMessage,
    };
  }
};

// Sign out from Google (no-op for Expo AuthSession)
export const signOutFromGoogle = async () => {
  try {
    // For Expo AuthSession, we don't need to do anything special
    // Firebase sign-out handles everything
    return { success: true };
  } catch (error) {
    console.error('Google Sign-Out Error:', error);
    return {
      success: false,
      error: 'Failed to sign out from Google.',
    };
  }
};

// Check if user is signed in to Google (no-op for Expo AuthSession)
export const isSignedInToGoogle = async () => {
  // For Expo AuthSession, we rely on Firebase auth state
  return auth.currentUser !== null;
};

// Get current Google user info (use Firebase user)
export const getCurrentGoogleUser = async () => {
  try {
    const user = auth.currentUser;
    if (user) {
      return { 
        success: true, 
        userInfo: {
          user: {
            id: user.uid,
            email: user.email,
            name: user.displayName,
            photo: user.photoURL,
          }
        }
      };
    } else {
      return { success: false, error: 'No user signed in' };
    }
  } catch (error) {
    console.error('Error getting current user:', error);
    return { success: false, error: error.message };
  }
};