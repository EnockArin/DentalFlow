import React from 'react';
import { AppRegistry, View, StyleSheet } from 'react-native';
import { Provider as PaperProvider, MD3LightTheme, Text, Button } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';

const theme = {
  ...MD3LightTheme,
};

function PaperOnlyApp() {
  return (
    <PaperProvider theme={theme}>
      <StatusBar style="auto" />
      <View style={styles.container}>
        <Text variant="headlineMedium" style={styles.text}>Paper Only Test</Text>
        <Button mode="contained" style={styles.button}>
          Test Button
        </Button>
      </View>
    </PaperProvider>
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

AppRegistry.registerComponent('main', () => PaperOnlyApp);

export default PaperOnlyApp;