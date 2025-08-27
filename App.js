import React, { useEffect } from 'react';
import { AppRegistry, Platform } from 'react-native';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { Provider as ReduxProvider } from 'react-redux';
import { StatusBar } from 'expo-status-bar';
import { store } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { configureGoogleSignIn } from './src/services/googleAuth';

// Configure React Native Paper theme without MaterialCommunityIcons
const theme = {
  ...MD3LightTheme,
};

function App() {
  useEffect(() => {
    console.log('DentalFlow app started');
    // Disable Object.freeze in development to prevent animation freezing
    if (__DEV__) {
      const originalFreeze = Object.freeze;
      Object.freeze = (obj) => obj;
    }
    
    // Configure Google Sign-In
    configureGoogleSignIn();
  }, []);

  return (
    <ReduxProvider store={store}>
      <PaperProvider theme={theme}>
        <StatusBar style="auto" />
        <AppNavigator />
      </PaperProvider>
    </ReduxProvider>
  );
}

// Register immediately after component definition
AppRegistry.registerComponent('main', () => App);

export default App;