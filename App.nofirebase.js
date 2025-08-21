import React, { useEffect } from 'react';
import { AppRegistry, View, Text, StyleSheet } from 'react-native';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { Provider as ReduxProvider } from 'react-redux';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card, Title } from 'react-native-paper';

// Create store without Firebase-dependent slices
import { configureStore } from '@reduxjs/toolkit';

// Simple auth slice without Firebase
const authSlice = {
  name: 'auth',
  initialState: {
    user: null,
    loading: false,
    error: null,
  },
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.loading = false;
      state.user = action.payload;
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
};

const store = configureStore({
  reducer: {
    auth: (state = authSlice.initialState, action) => {
      switch (action.type) {
        default:
          return state;
      }
    },
  },
});

const theme = {
  ...MD3LightTheme,
};

function NoFirebaseApp() {
  useEffect(() => {
    console.log('DentalFlow app started - No Firebase');
  }, []);

  return (
    <ReduxProvider store={store}>
      <PaperProvider theme={theme} settings={{ icon: (props) => <MaterialCommunityIcons {...props} /> }}>
        <StatusBar style="auto" />
        <View style={styles.container}>
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.title}>🦷 DentalFlow</Title>
              <Text style={styles.text}>App Running Without Firebase</Text>
              <Button 
                mode="contained" 
                style={styles.button}
                ) => (
                  <MaterialCommunityIcons name="check" size={size} color={color} />
                )}
              >
                All Systems Working
              </Button>
            </Card.Content>
          </Card>
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
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
  },
  text: {
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    marginTop: 10,
  },
});

AppRegistry.registerComponent('main', () => NoFirebaseApp);

export default NoFirebaseApp;