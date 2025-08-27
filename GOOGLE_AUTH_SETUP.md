# Google Authentication Setup Guide

This guide will help you set up Google Authentication for DentalFlow.

## 📋 Prerequisites

1. Firebase project already configured
2. React Native environment set up
3. DentalFlow app dependencies installed

## 🔧 Firebase Console Setup

### Step 1: Enable Google Sign-In

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your DentalFlow project
3. Navigate to **Authentication** > **Sign-in method**
4. Click on **Google** provider
5. Toggle **Enable** switch
6. Add your support email
7. Click **Save**

### Step 2: Get Web Client ID

1. In the Google sign-in configuration, you'll see **Web SDK configuration**
2. Copy the **Web client ID** (it should look like: `123456789-abcdefg.apps.googleusercontent.com`)
3. Add this to your `.env` file:

```bash
EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID=your_web_client_id_here
```

## 📱 Platform-Specific Setup

### For iOS (Expo Development Build)

Google Sign-In will work automatically with Expo's built-in Google authentication.

### For Android (Expo Development Build)

Google Sign-In will work automatically with Expo's built-in Google authentication.

### For Production Builds

If you're building for production, you may need to configure additional settings:

1. **iOS**: Add your iOS bundle ID to Firebase project settings
2. **Android**: Add your Android package name and SHA-1 fingerprint

## 🧪 Testing

1. Start your development server:
   ```bash
   npm start
   ```

2. Test the Google Sign-In flow:
   - Navigate to Login screen
   - Tap "Continue with Google"
   - Complete Google authentication
   - Verify user is signed in successfully

## 🚨 Troubleshooting

### Common Issues

1. **"Google Sign-In failed"**
   - Verify `EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID` is set correctly
   - Check Firebase Console has Google sign-in enabled
   - Ensure device has Google Play Services (Android)

2. **"Sign-in was cancelled"**
   - Normal behavior when user cancels the flow
   - No action needed

3. **Network errors**
   - Check internet connection
   - Verify Firebase project is active

### Debug Steps

1. Check environment variables are loaded:
   ```javascript
   console.log('Web Client ID:', process.env.EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID);
   ```

2. Enable debug logging in GoogleSignin configuration:
   ```javascript
   GoogleSignin.configure({
     // ... other config
     debug: __DEV__, // Enable debug in development
   });
   ```

## 📝 Environment Variables

Make sure your `.env` file contains:

```bash
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

# Google Sign-In
EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID=your_web_client_id
```

## 🔐 Security Notes

- Web Client ID is safe to include in client-side code
- Never commit actual environment values to git
- Use Firebase security rules to protect user data
- Regularly review Firebase authentication logs

## ✅ Verification

After setup, verify Google Authentication is working by:

1. ✅ Google Sign-In button appears on Login/Register screens
2. ✅ Tapping button opens Google authentication flow
3. ✅ Successful authentication redirects to Dashboard
4. ✅ User profile information is populated
5. ✅ Sign-out functionality works correctly

## 📞 Support

If you encounter issues:

1. Check this guide for common solutions
2. Review Firebase Console for authentication logs
3. Check Expo development tools for error messages
4. Ensure all environment variables are correctly set