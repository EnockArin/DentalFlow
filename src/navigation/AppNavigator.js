import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { loginSuccess, logout } from '../store/slices/authSlice';
import { setItems, setLoading } from '../store/slices/inventorySlice';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import InventoryListScreen from '../screens/InventoryListScreen';
import ItemDetailScreen from '../screens/ItemDetailScreen';
import BarcodeScannerScreen from '../screens/BarcodeScannerScreen';
import ShoppingListScreen from '../screens/ShoppingListScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        dispatch(loginSuccess({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        }));
      } else {
        dispatch(logout());
      }
    });

    return authUnsubscribe;
  }, [dispatch]);

  // Global inventory listener - only active when user is authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    dispatch(setLoading(true));
    
    const inventoryQuery = query(collection(db, 'inventory'));
    const inventoryUnsubscribe = onSnapshot(inventoryQuery, (querySnapshot) => {
      const inventoryItems = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Convert Firebase Timestamps to serializable Date objects
        const serializableData = {
          id: doc.id,
          ...data,
          expiryDate: data.expiryDate ? (data.expiryDate instanceof Date ? data.expiryDate : data.expiryDate.toDate()) : null,
          lastUpdated: data.lastUpdated ? (data.lastUpdated instanceof Date ? data.lastUpdated : data.lastUpdated.toDate()) : null,
          createdAt: data.createdAt ? (data.createdAt instanceof Date ? data.createdAt : data.createdAt.toDate()) : null,
        };
        inventoryItems.push(serializableData);
      });
      dispatch(setItems(inventoryItems));
      dispatch(setLoading(false));
    }, (error) => {
      console.error('Error fetching inventory:', error);
      dispatch(setLoading(false));
    });

    return () => inventoryUnsubscribe();
  }, [dispatch, isAuthenticated]);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {!isAuthenticated ? (
          // Authentication Stack
          <>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Register" 
              component={RegisterScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          // Main App Stack
          <>
            <Stack.Screen 
              name="Dashboard" 
              component={DashboardScreen}
              options={{ 
                title: 'DentalFlow Dashboard',
                headerShown: true,
              }}
            />
            <Stack.Screen 
              name="Inventory" 
              component={InventoryListScreen}
              options={{ title: 'Inventory' }}
            />
            <Stack.Screen 
              name="ItemDetail" 
              component={ItemDetailScreen}
              options={({ route }) => ({
                title: route.params?.item ? 'Edit Item' : 'Add New Item'
              })}
            />
            <Stack.Screen 
              name="Scanner" 
              component={BarcodeScannerScreen}
              options={{ 
                title: 'Barcode Scanner',
                headerShown: false, // Full screen for camera
              }}
            />
            <Stack.Screen 
              name="ShoppingList" 
              component={ShoppingListScreen}
              options={{ title: 'Shopping List' }}
            />
            <Stack.Screen 
              name="Settings" 
              component={SettingsScreen}
              options={{ title: 'Settings' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;