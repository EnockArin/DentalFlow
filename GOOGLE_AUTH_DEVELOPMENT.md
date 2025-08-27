# Google Authentication Development Guide

## 🚧 The Problem

Google Sign-In with Expo development URLs (`exp://192.168.1.161:8082`) cannot be added to Firebase Console because Firebase only accepts valid domain names (like `myapp.com`).

## ✅ Solutions for Testing Google Sign-In

### **Option 1: Test on Web Platform (Recommended)**

1. **Start your app with web target:**
   ```bash
   npm start
   # Then press 'w' to open in web browser
   ```

2. **Google Sign-In will work perfectly on web** because it uses `signInWithPopup` which doesn't require redirect URI configuration.

3. **Web platform Firebase Console setup:**
   - Go to Firebase Console → Authentication → Google
   - Under "Authorized domains", add: `localhost`
   - No redirect URIs needed for web popup flow

### **Option 2: Create a Production Build**

1. **Build with EAS:**
   ```bash
   eas build --platform android --profile preview
   ```

2. **The production build will use proper redirect URIs** that can be added to Firebase Console.

### **Option 3: Use Email/Password for Development**

1. **For development testing**, use the email/password authentication
2. **Google Sign-In can be tested later** in production builds or on web

## 🌐 Testing Google Sign-In on Web

**This is the easiest way to test Google Sign-In during development:**

1. **Start development server:**
   ```bash
   npm start
   ```

2. **Open in web browser:**
   - Press `w` when Metro shows options
   - Or visit: `http://localhost:8081` in your browser

3. **Test Google Sign-In:**
   - Navigate to Login screen
   - Click "Continue with Google"
   - Complete Google authentication
   - Verify successful sign-in

## 📱 Production Mobile Setup

When you're ready to deploy to app stores:

1. **Create production build with EAS**
2. **Get the production redirect URI** from build logs
3. **Add it to Firebase Console** → Authentication → Google → Authorized redirect URIs
4. **Google Sign-In will work in production**

## 🔧 Current Development Workaround

The app now shows a helpful message when trying to use Google Sign-In in Expo Go development:

> "Google Sign-In is not available in Expo Go development. Please use email/password or test on web platform."

This prevents the 404 error and guides users to working alternatives.

## 📋 Summary

- ✅ **Web testing**: Works perfectly (recommended for development)
- ✅ **Email/Password**: Always works for development testing
- ✅ **Production builds**: Google Sign-In will work normally
- ❌ **Expo Go development**: Not supported due to Firebase limitations

**For now, test Google Sign-In on the web platform - it works great there!**