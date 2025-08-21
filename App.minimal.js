import React from 'react';
import { AppRegistry, View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

function MinimalApp() {
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.text}>DentalFlow - Minimal Test</Text>
    </View>
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
  },
});

AppRegistry.registerComponent('main', () => MinimalApp);

export default MinimalApp;