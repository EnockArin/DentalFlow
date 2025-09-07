/**
 * Barcode API Service
 * Provides product information lookup for barcodes using external APIs
 */

const BARCODE_API_KEY = process.env.EXPO_PUBLIC_BARCODE_API_KEY;

/**
 * Looks up product information by barcode using UPC Database API
 * @param {string} barcode - The barcode to lookup
 * @returns {Promise<Object|null>} Product information or null if not found
 */
export const lookupProductByBarcode = async (barcode) => {
  if (!barcode || !BARCODE_API_KEY) {
    console.warn('Barcode API: Missing barcode or API key');
    return null;
  }

  try {
    console.log(`🔍 Looking up barcode: ${barcode}`);
    
    // Using UPCDatabase API (upcitemdb.com)
    const response = await fetch(`https://api.upcitemdb.com/prod/trial/lookup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user_key': BARCODE_API_KEY,
        'key_type': 'user'
      },
      body: JSON.stringify({
        upc: barcode
      })
    });

    if (!response.ok) {
      console.error('Barcode API: HTTP error', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    
    if (data.code === 'OK' && data.items && data.items.length > 0) {
      const item = data.items[0];
      console.log('✅ Barcode API: Product found', item.title);
      
      return {
        success: true,
        productName: item.title || 'Unknown Product',
        description: item.description || '',
        brand: item.brand || '',
        category: item.category || '',
        size: item.size || '',
        imageUrl: item.images && item.images.length > 0 ? item.images[0] : null,
        rawData: item
      };
    } else {
      console.log('❌ Barcode API: Product not found');
      return {
        success: false,
        message: 'Product not found in database'
      };
    }

  } catch (error) {
    console.error('Barcode API: Lookup failed', error);
    return {
      success: false,
      message: 'Failed to lookup product information',
      error: error.message
    };
  }
};

/**
 * Alternative API lookup using Barcode Spider (in case primary fails)
 * @param {string} barcode - The barcode to lookup
 * @returns {Promise<Object|null>} Product information or null if not found
 */
export const lookupProductAlternative = async (barcode) => {
  if (!barcode) {
    return null;
  }

  try {
    // Using Open Food Facts API as fallback (free, no key required)
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (data.status === 1 && data.product) {
      const product = data.product;
      
      return {
        success: true,
        productName: product.product_name || product.generic_name || 'Unknown Product',
        description: product.ingredients_text || '',
        brand: product.brands || '',
        category: product.categories || '',
        size: product.quantity || '',
        imageUrl: product.image_url || null,
        rawData: product
      };
    }
    
    return {
      success: false,
      message: 'Product not found in alternative database'
    };

  } catch (error) {
    console.error('Alternative Barcode API: Lookup failed', error);
    return {
      success: false,
      message: 'Alternative lookup failed',
      error: error.message
    };
  }
};

/**
 * Main barcode lookup function that tries multiple APIs
 * @param {string} barcode - The barcode to lookup
 * @returns {Promise<Object|null>} Product information or null if not found
 */
export const lookupBarcode = async (barcode) => {
  // Try primary API first
  const primaryResult = await lookupProductByBarcode(barcode);
  
  if (primaryResult && primaryResult.success) {
    return primaryResult;
  }
  
  // If primary fails, try alternative API
  console.log('🔄 Trying alternative barcode API...');
  const alternativeResult = await lookupProductAlternative(barcode);
  
  return alternativeResult;
};