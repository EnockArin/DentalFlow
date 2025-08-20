import React, { useEffect } from 'react';
import { AppRegistry, Platform } from 'react-native';
import { Provider as PaperProvider, MD3LightTheme, configureFonts } from 'react-native-paper';
import { Provider as ReduxProvider } from 'react-redux';
import { StatusBar } from 'expo-status-bar';
import { store } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { applyIOSFormFixes } from './src/components/IOSFormFix';

// React Native Paper automatically uses @expo/vector-icons MaterialCommunityIcons in Expo projects
const theme = {
  ...MD3LightTheme,
};

function App() {
  useEffect(() => {
    // Apply iOS form fixes on app start
    applyIOSFormFixes();
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

// Register the app component
AppRegistry.registerComponent('main', () => App);

export default App;