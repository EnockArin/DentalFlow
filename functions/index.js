const functions = require('firebase-functions');
const cors = require('cors')({origin: true});

// Securely store the barcode API key in Firebase Functions config
// Run: firebase functions:config:set barcode.api_key="6onmtuh4xcj4sckza9021km9tbfbns"
const BARCODE_API_KEY = functions.config().barcode?.api_key;

/**
 * Secure barcode lookup proxy to protect API key from client exposure
 * This function acts as a proxy between your app and the barcode API
 */
exports.lookupBarcode = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to lookup barcodes.');
  }

  const { barcode } = data;

  if (!barcode) {
    throw new functions.https.HttpsError('invalid-argument', 'Barcode is required.');
  }

  if (!BARCODE_API_KEY) {
    console.error('Barcode API key not configured');
    throw new functions.https.HttpsError('internal', 'Barcode lookup service not configured.');
  }

  try {
    console.log(`🔍 Secure lookup for barcode: ${barcode} by user: ${context.auth.uid}`);
    
    // Primary API: UPCDatabase API
    const response = await fetch('https://api.upcitemdb.com/prod/trial/lookup', {
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
      console.error('Barcode API HTTP error:', response.status, response.statusText);
      
      // Try alternative API if primary fails
      return await tryAlternativeApi(barcode);
    }

    const data = await response.json();
    
    if (data.code === 'OK' && data.items && data.items.length > 0) {
      const item = data.items[0];
      console.log('✅ Product found:', item.title);
      
      return {
        success: true,
        productName: item.title || 'Unknown Product',
        description: item.description || '',
        brand: item.brand || '',
        category: item.category || '',
        size: item.size || '',
        imageUrl: item.images && item.images.length > 0 ? item.images[0] : null
      };
    } else {
      console.log('❌ Product not found in primary database');
      
      // Try alternative API - return result instead of throwing error
      const alternativeResult = await tryAlternativeApiSafe(barcode);
      return alternativeResult;
    }

  } catch (error) {
    console.error('Barcode lookup failed:', error);
    
    // Try alternative API as fallback - return result instead of throwing error
    const alternativeResult = await tryAlternativeApiSafe(barcode);
    return alternativeResult;
  }
});

/**
 * Safe alternative API fallback (Open Food Facts - free, no key required)
 * Returns success/failure object instead of throwing errors
 */
async function tryAlternativeApiSafe(barcode) {
  try {
    console.log('🔄 Trying alternative API for barcode:', barcode);
    
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    
    if (!response.ok) {
      console.log('❌ Alternative API: HTTP error', response.status);
      return {
        success: false,
        message: 'Product not found in any database.',
        barcode: barcode
      };
    }

    const data = await response.json();
    
    if (data.status === 1 && data.product) {
      const product = data.product;
      console.log('✅ Product found in alternative API:', product.product_name);
      
      return {
        success: true,
        productName: product.product_name || product.generic_name || 'Unknown Product',
        description: product.ingredients_text || '',
        brand: product.brands || '',
        category: product.categories || '',
        size: product.quantity || '',
        imageUrl: product.image_url || null
      };
    }
    
    console.log('❌ Alternative API: Product not found');
    return {
      success: false,
      message: 'Product not found in any database.',
      barcode: barcode
    };

  } catch (error) {
    console.error('Alternative API failed:', error);
    return {
      success: false,
      message: 'Product not found in any database.',
      barcode: barcode,
      error: error.message
    };
  }
}

/**
 * Legacy alternative API function (kept for compatibility)
 * @deprecated Use tryAlternativeApiSafe instead
 */
async function tryAlternativeApi(barcode) {
  const result = await tryAlternativeApiSafe(barcode);
  if (!result.success) {
    throw new functions.https.HttpsError('not-found', result.message);
  }
  return result;
}

/**
 * HTTP endpoint version for testing (optional)
 */
exports.lookupBarcodeHttp = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    // Basic security check - you might want to add more robust authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).send('Unauthorized');
      return;
    }

    const { barcode } = req.body;
    
    if (!barcode) {
      res.status(400).json({ error: 'Barcode is required' });
      return;
    }

    try {
      // Use the same lookup logic as the callable function
      const result = await lookupBarcodeInternal(barcode);
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: 'Barcode lookup failed',
        error: error.message 
      });
    }
  });
});