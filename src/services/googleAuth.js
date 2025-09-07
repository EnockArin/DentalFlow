import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { signInWithPopup, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { Platform, Alert } from 'react-native';

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
    
    // Emergency fallback: Use Expo's auth proxy for immediate testing
    if (__DEV__ === false) {
      console.log('🚑 Emergency fallback: Using Expo auth proxy for production testing');
      try {
        const proxyRedirectUri = AuthSession.makeRedirectUri({ useProxy: true });
        if (proxyRedirectUri.startsWith('https://')) {
          console.log('✅ Using Expo auth proxy:', proxyRedirectUri);
          // Continue with the proxy URI instead
          const request = new AuthSession.AuthRequest({
            clientId: process.env.EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID,
            scopes: ['openid', 'profile', 'email'],
            responseType: AuthSession.ResponseType.Code,
            redirectUri: proxyRedirectUri,
            additionalParameters: {
              access_type: 'offline',
            },
          });
          
          const result = await request.promptAsync({
            authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
          });
          
          if (result.type === 'success') {
            // Process the auth code...
            const { code } = result.params;
            const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                client_id: process.env.EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID,
                code: code,
                redirect_uri: proxyRedirectUri,
                grant_type: 'authorization_code',
              }),
            });
            
            const tokens = await tokenResponse.json();
            if (tokens.id_token) {
              const googleCredential = GoogleAuthProvider.credential(tokens.id_token);
              const userCredential = await signInWithCredential(auth, googleCredential);
              return { success: true, user: userCredential.user };
            }
          }
        }
      } catch (proxyError) {
        console.log('⚠️  Proxy fallback failed, continuing with custom scheme...');
      }
    }
    
    // For mobile platforms, use a custom redirect approach that works with Firebase
    const clientId = process.env.EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID;
    
    if (!clientId) {
      throw new Error('Google Web Client ID not found in environment variables');
    }

    console.log('📱 Attempting mobile Google Sign-In...');
    
    try {
      // Try multiple redirect URI strategies for maximum compatibility
      let redirectUri;
      let useDevProxy = false;
      
      // Strategy: Always use Expo's HTTPS proxy for Firebase compatibility
      // Firebase Console only accepts valid HTTPS domains, not custom schemes
      
      try {
        // Use Expo's auth proxy - provides HTTPS URL that Firebase accepts
        redirectUri = AuthSession.makeRedirectUri({
          useProxy: true,
        });
        
        console.log('🚨 GENERATED REDIRECT URI:', redirectUri);
        
        if (redirectUri.startsWith('https://auth.expo.io')) {
          console.log('✅ Using Expo Auth Proxy (Firebase compatible HTTPS)');
          useDevProxy = true;
        } else if (redirectUri.startsWith('exp://')) {
          // Force use of proxy for Firebase compatibility
          console.log('🔄 Forcing HTTPS proxy for Firebase compatibility...');
          redirectUri = 'https://auth.expo.io/@enock911/DentalFlow';
          useDevProxy = true;
        } else {
          console.log('✅ Using generated HTTPS redirect URI');
        }
      } catch (error) {
        console.log('🔄 Fallback to manual Expo proxy URI...');
        
        // Manual fallback to known Expo proxy format
        redirectUri = 'https://auth.expo.io/@enock911/DentalFlow';
        useDevProxy = true;
      }
      
      console.log('🔗 Using redirect URI:', redirectUri);
      
      console.log('🔥 ADD THIS EXACT URI TO FIREBASE CONSOLE:');
      console.log('   Firebase Console → Authentication → Google → Authorized redirect URIs');
      console.log('   Add URI:', redirectUri);
      
      // Show alert in production so user can see the redirect URI
      if (!__DEV__) {
        Alert.alert(
          '🔥 Firebase Setup Required',
          `Add this HTTPS URI to Firebase Console:\n\n${redirectUri}\n\nNote: Firebase requires HTTPS domains (not custom schemes).\n\nGo to: Firebase Console → Authentication → Google → Authorized redirect URIs`,
          [{ text: 'Copy URI', onPress: () => console.log('ADD TO FIREBASE:', redirectUri) },
           { text: 'OK', onPress: () => {} }]
        );
      }
      
      if (useDevProxy) {
        console.log('⚠️  Development mode: Expo proxy handles the redirect');
      } else {
        console.log('🏗️  Production mode: Custom redirect URI required');
      }
      
      const request = new AuthSession.AuthRequest({
        clientId: clientId,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.Code, // Use code instead of token
        redirectUri: redirectUri,
        additionalParameters: {
          access_type: 'offline',
        },
      });

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
          console.log('🔄 Exchanging code for token...');
          console.log('📋 Request details:', {
            clientId: clientId.substring(0, 20) + '...',
            redirectUri,
            codeLength: code.length
          });
          
          const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: clientId,
              code: code,
              redirect_uri: redirectUri,
              grant_type: 'authorization_code',
            }),
          });
          
          console.log('📊 Token response status:', tokenResponse.status);
          
          if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error('❌ Token exchange failed:', {
              status: tokenResponse.status,
              statusText: tokenResponse.statusText,
              error: errorText
            });
            
            return {
              success: false,
              error: `Token exchange failed (${tokenResponse.status}): ${errorText}`
            };
          }
          
          const tokens = await tokenResponse.json();
          console.log('✅ Token exchange successful:', Object.keys(tokens));
          
          if (tokens.id_token) {
            console.log('🔥 Creating Firebase credential...');
            
            try {
              // Create Firebase credential
              const googleCredential = GoogleAuthProvider.credential(tokens.id_token);
              
              console.log('🔐 Signing in to Firebase...');
              
              // Sign in to Firebase
              const userCredential = await signInWithCredential(auth, googleCredential);
              
              console.log('✅ Firebase sign-in successful:', {
                uid: userCredential.user.uid,
                email: userCredential.user.email
              });
              
              return {
                success: true,
                user: userCredential.user,
              };
            } catch (firebaseError) {
              console.error('❌ Firebase sign-in error:', firebaseError);
              
              return {
                success: false,
                error: `Firebase authentication failed: ${firebaseError.message}`
              };
            }
          } else {
            console.error('❌ No ID token in response:', tokens);
            return {
              success: false,
              error: 'No ID token received from Google'
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