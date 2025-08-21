import React from 'react';
import { AppRegistry, View, StyleSheet } from 'react-native';
import { Provider as PaperProvider, MD3LightTheme, Text, Button } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const theme = {
  ...MD3LightTheme,
};

function IconsOnlyApp() {
  return (
    <PaperProvider theme={theme} settings={{ icon: (props) => <MaterialCommunityIcons {...props} /> }}>
      <StatusBar style="auto" />
      <View style={styles.container}>
        <Text variant="headlineMedium" style={styles.text}>Icons Test</Text>
        <MaterialCommunityIcons name="check" size={24} color="green" />
        <Button 
          mode="contained" 
          style={styles.button}
          ) => (
            <MaterialCommunityIcons name="login" size={size} color={color} />
          )}
        >
          Test Button with Icon
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

AppRegistry.registerComponent('main', () => IconsOnlyApp);

export default IconsOnlyApp;