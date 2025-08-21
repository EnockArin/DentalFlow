import React from 'react';
import { AppRegistry, View, StyleSheet } from 'react-native';
import { Provider as PaperProvider, MD3LightTheme, Text, Button } from 'react-native-paper';
import { Provider as ReduxProvider } from 'react-redux';
import { StatusBar } from 'expo-status-bar';
import { configureStore } from '@reduxjs/toolkit';

// Simple Redux store
const store = configureStore({
  reducer: {
    dummy: (state = { test: 'working' }, action) => state
  }
});

const theme = {
  ...MD3LightTheme,
};

function ReduxOnlyApp() {
  return (
    <ReduxProvider store={store}>
      <PaperProvider theme={theme}>
        <StatusBar style="auto" />
        <View style={styles.container}>
          <Text variant="headlineMedium" style={styles.text}>Redux + Paper Test</Text>
          <Button mode="contained" style={styles.button}>
            Test Button
          </Button>
        </View>
      </PaperProvider>
    </ReduxProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  text: {
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    marginTop: 10,
  },
});

AppRegistry.registerComponent('main', () => ReduxOnlyApp);

export default ReduxOnlyApp;