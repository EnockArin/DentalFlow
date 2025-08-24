/**
 * Secure Storage Utility
 * Provides secure storage for sensitive data using Expo SecureStore
 * Addresses security vulnerability of storing sensitive data in AsyncStorage
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys for secure storage
export const SECURE_STORAGE_KEYS = {
  SHOPPING_LISTS: 'secure_shopping_lists',
  USER_PREFERENCES: 'secure_user_preferences',
  TEMP_AUTH_DATA: 'secure_temp_auth_data'
};

/**
 * Securely store data
 * @param {string} key - Storage key
 * @param {any} value - Value to store (will be JSON stringified)
 * @returns {Promise<void>}
 */
export const setSecureData = async (key, value) => {
  try {
    const jsonValue = JSON.stringify(value);
    await SecureStore.setItemAsync(key, jsonValue);
  } catch (error) {
    console.error(`Error storing secure data for key ${key}:`, error);
    throw new Error('Failed to store data securely');
  }
};

/**
 * Retrieve secure data
 * @param {string} key - Storage key
 * @returns {Promise<any|null>} Parsed value or null if not found
 */
export const getSecureData = async (key) => {
  try {
    const jsonValue = await SecureStore.getItemAsync(key);
    return jsonValue ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error(`Error retrieving secure data for key ${key}:`, error);
    return null;
  }
};

/**
 * Remove secure data
 * @param {string} key - Storage key
 * @returns {Promise<void>}
 */
export const removeSecureData = async (key) => {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error(`Error removing secure data for key ${key}:`, error);
    throw new Error('Failed to remove data securely');
  }
};

/**
 * Check if secure data exists
 * @param {string} key - Storage key
 * @returns {Promise<boolean>}
 */
export const hasSecureData = async (key) => {
  try {
    const value = await SecureStore.getItemAsync(key);
    return value !== null;
  } catch (error) {
    console.error(`Error checking secure data for key ${key}:`, error);
    return false;
  }
};

/**
 * Migration utility to move data from AsyncStorage to SecureStore
 * @param {string} asyncStorageKey - Old AsyncStorage key
 * @param {string} secureStoreKey - New SecureStore key
 * @returns {Promise<boolean>} True if migration was successful or not needed
 */
export const migrateToSecureStorage = async (asyncStorageKey, secureStoreKey) => {
  try {
    // Check if data already exists in SecureStore
    const existingSecureData = await getSecureData(secureStoreKey);
    if (existingSecureData) {
      console.log(`Data already exists in SecureStore for key ${secureStoreKey}`);
      return true;
    }

    // Get data from AsyncStorage
    const asyncData = await AsyncStorage.getItem(asyncStorageKey);
    if (asyncData) {
      // Parse and re-store in SecureStore
      const parsedData = JSON.parse(asyncData);
      await setSecureData(secureStoreKey, parsedData);
      
      // Remove from AsyncStorage
      await AsyncStorage.removeItem(asyncStorageKey);
      
      console.log(`Successfully migrated data from AsyncStorage ${asyncStorageKey} to SecureStore ${secureStoreKey}`);
      return true;
    }

    console.log(`No data found in AsyncStorage for key ${asyncStorageKey}`);
    return true;
  } catch (error) {
    console.error(`Error migrating data from ${asyncStorageKey} to ${secureStoreKey}:`, error);
    return false;
  }
};

/**
 * Bulk migration utility
 * @param {Object[]} migrations - Array of {asyncKey, secureKey} objects
 * @returns {Promise<boolean>} True if all migrations successful
 */
export const performBulkMigration = async (migrations) => {
  try {
    const results = await Promise.all(
      migrations.map(({ asyncKey, secureKey }) => 
        migrateToSecureStorage(asyncKey, secureKey)
      )
    );
    
    const allSuccessful = results.every(result => result === true);
    if (allSuccessful) {
      console.log('All data migrations completed successfully');
    } else {
      console.warn('Some data migrations failed');
    }
    
    return allSuccessful;
  } catch (error) {
    console.error('Error during bulk migration:', error);
    return false;
  }
};

// Specific utility functions for app data

/**
 * Store shopping lists securely
 * @param {Array} shoppingLists - Array of shopping lists
 * @returns {Promise<void>}
 */
export const setShoppingLists = async (shoppingLists) => {
  await setSecureData(SECURE_STORAGE_KEYS.SHOPPING_LISTS, shoppingLists);
};

/**
 * Get shopping lists securely
 * @returns {Promise<Array>} Array of shopping lists or empty array
 */
export const getShoppingLists = async () => {
  const lists = await getSecureData(SECURE_STORAGE_KEYS.SHOPPING_LISTS);
  return lists || [];
};

/**
 * Store user preferences securely
 * @param {Object} preferences - User preferences object
 * @returns {Promise<void>}
 */
export const setUserPreferences = async (preferences) => {
  await setSecureData(SECURE_STORAGE_KEYS.USER_PREFERENCES, preferences);
};

/**
 * Get user preferences securely
 * @returns {Promise<Object|null>} User preferences or null
 */
export const getUserPreferences = async () => {
  return await getSecureData(SECURE_STORAGE_KEYS.USER_PREFERENCES);
};