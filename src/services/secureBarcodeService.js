/**
 * Secure Barcode API Service
 * Uses Firebase Functions to keep API keys secure on server-side
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../config/firebase';

const functions = getFunctions(app);

/**
 * Securely looks up product information by barcode using Firebase Functions
 * This keeps the API key secure on the server-side
 * @param {string} barcode - The barcode to lookup
 * @returns {Promise<Object|null>} Product information or null if not found
 */
export const lookupProductByBarcode = async (barcode) => {
  if (!barcode) {
    console.warn('Secure Barcode API: Missing barcode');
    return {
      success: false,
      message: 'Barcode is required'
    };
  }

  try {
    console.log(`🔍 Secure lookup for barcode: ${barcode}`);
    
    // Call the secure Firebase Function
    const lookupBarcode = httpsCallable(functions, 'lookupBarcode');
    const result = await lookupBarcode({ barcode });
    
    if (result.data.success) {
      console.log('✅ Secure Barcode API: Product found', result.data.productName);
      return result.data;
    } else {
      console.log('❌ Secure Barcode API: Product not found');
      return result.data;
    }

  } catch (error) {
    console.error('Secure Barcode API: Lookup failed', error);
    
    // Handle specific Firebase Function errors gracefully
    if (error.code === 'functions/unauthenticated') {
      return {
        success: false,
        message: 'Authentication required for barcode lookup',
        error: 'Please ensure you are logged in'
      };
    } else if (error.code === 'functions/not-found') {
      // This should now be rare since the function returns success:false instead of throwing
      return {
        success: false,
        message: 'Product not found in database',
        barcode: barcode
      };
    } else if (error.code === 'functions/internal') {
      return {
        success: false,
        message: 'Barcode lookup service temporarily unavailable',
        error: 'Please try again later'
      };
    } else {
      // For any other error, return a graceful response
      console.log('Returning graceful error response for:', error.code);
      return {
        success: false,
        message: 'Product not found in database',
        barcode: barcode,
        error: 'Unknown barcode - you can still add this item manually'
      };
    }
  }
};

/**
 * Main barcode lookup function - now uses secure server-side proxy
 * @param {string} barcode - The barcode to lookup
 * @returns {Promise<Object|null>} Product information or null if not found
 */
export const lookupBarcode = async (barcode) => {
  return await lookupProductByBarcode(barcode);
};