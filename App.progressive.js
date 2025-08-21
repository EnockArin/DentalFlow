import React from 'react';
import { AppRegistry, View, Text, StyleSheet } from 'react-native';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { Provider as ReduxProvider } from 'react-redux';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Create minimal store without auth/inventory slices
import { configureStore } from '@reduxjs/toolkit';
const minimalStore = configureStore({
  reducer: {
    // Empty for now
    dummy: (state = {}, action) => state
  }
});

const theme = {
  ...MD3LightTheme,
};

function ProgressiveApp() {
  return (
    <ReduxProvider store={minimalStore}>
      <PaperProvider theme={theme} settings={{ icon: (props) => <MaterialCommunityIcons {...props} /> }}>
        <StatusBar style="auto" />
        <View style={styles.container}>
          <Text style={styles.text}>DentalFlow - Progressive Test</Text>
          <Text style={styles.subtext}>Redux + Paper + Icons Working</Text>
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
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtext: {
    fontSize: 14,
    color: '#666',
  },
});

AppRegistry.registerComponent('main', () => ProgressiveApp);

export default ProgressiveApp;