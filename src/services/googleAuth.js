import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { signInWithPopup, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { googleWebClientId } from '../config/firebase.config';
import { Platform } from 'react-native';

// Complete the authentication flow for web browsers
WebBrowser.maybeCompleteAuthSession();

// Configure Google Sign-In
export const configureGoogleSignIn = () => {
  // No configuration needed for Expo AuthSession
  console.log('Google Sign-In configured for Expo');
};

// Sign in with Google - development-friendly approach
export const signInWithGoogle = async () => {
  try {
    // For web platform, use Firebase's signInWithPopup (works without redirect URIs)
    if (Platform.OS === 'web') {
      console.log('🌐 Using web-based Google Sign-In');
      const result = await signInWithPopup(auth, googleProvider);
      return {
        success: true,
        user: result.user,
      };
    }
    
    // For mobile platforms, use a custom redirect approach that works with Firebase
    const clientId = process.env.EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID || googleWebClientId;
    
    if (!clientId) {
      throw new Error('Google Web Client ID not found in environment variables');
    }

    console.log('📱 Attempting mobile Google Sign-In...');
    
    try {
      // Check what type of redirect URI Expo generates
      const actualRedirectUri = AuthSession.makeRedirectUri({
        useProxy: true,
      });
      
      console.log('🚨 ACTUAL REDIRECT URI GENERATED:', actualRedirectUri);
      
      // Check if it's a development exp:// URI that can't be added to Firebase
      if (actualRedirectUri.startsWith('exp://')) {
        console.log('⚠️  DEVELOPMENT MODE DETECTED');
        console.log('🚫 Firebase Console cannot accept exp:// URIs');
        console.log('💡 SOLUTION: For development testing, use email/password authentication');
        console.log('🏗️  For Google Sign-In, create a production build with: eas build');
        
        return {
          success: false,
          error: 'Google Sign-In requires production build. Development uses exp:// URIs which Firebase cannot accept. Please use email/password for testing, or create a production build.',
        };
      }
      
      console.log('🔥 ADD THIS EXACT URI TO FIREBASE CONSOLE:');
      console.log('   Firebase Console → Authentication → Google → Authorized redirect URIs');
      console.log('   Add URI:', actualRedirectUri);
      
      const request = new AuthSession.AuthRequest({
        clientId: clientId,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.Code, // Use code instead of token
        redirectUri: actualRedirectUri,
        additionalParameters: {
          access_type: 'offline',
        },
      });

      console.log('🔗 Using redirect URI:', actualRedirectUri);

      const result = await request.promptAsync({
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        additionalParameters: {
          prompt: 'select_account',
        },
      });

      console.log('📱 Auth result:', result.type);

      if (result.type === 'success') {
        const { code } = result.params;
        
        if (code) {
          // Exchange code for ID token
          const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: clientId,
              code: code,
              redirect_uri: actualRedirectUri,
              grant_type: 'authorization_code',
            }),
          });
          
          const tokens = await tokenResponse.json();
          
          if (tokens.id_token) {
            // Create Firebase credential
            const googleCredential = GoogleAuthProvider.credential(tokens.id_token);
            
            // Sign in to Firebase
            const userCredential = await signInWithCredential(auth, googleCredential);
            
            return {
              success: true,
              user: userCredential.user,
            };
          }
        }
        
        return {
          success: false,
          error: 'Failed to get authentication token from Google.',
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
      console.error('Mobile Google Sign-In Error:', error);
      return {
        success: false,
        error: 'Google Sign-In not available in development mode. Please use email/password for testing.',
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