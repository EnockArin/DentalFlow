/**
 * Security utilities for ownership validation and access control
 * Critical security functions to prevent IDOR vulnerabilities
 */

import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

/**
 * Verify that the current user owns the specified document
 * @param {string} collection - Firestore collection name
 * @param {string} docId - Document ID to verify
 * @param {string} userId - User ID to check ownership against (optional, uses current user if not provided)
 * @returns {Promise<boolean>} - True if user owns the document, false otherwise
 */
export const verifyOwnership = async (collection, docId, userId = null) => {
  try {
    if (!docId) {
      console.error('Security: No document ID provided for ownership verification');
      return false;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('Security: No authenticated user for ownership verification');
      return false;
    }

    const userIdToCheck = userId || currentUser.uid;
    
    const docRef = doc(db, collection, docId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.error(`Security: Document ${docId} does not exist in ${collection}`);
      return false;
    }
    
    const data = docSnap.data();
    const ownerId = data.practiceId || data.userId;
    
    if (!ownerId) {
      console.error(`Security: No ownership field found in document ${docId}`);
      return false;
    }
    
    const isOwner = ownerId === userIdToCheck;
    
    if (!isOwner) {
      console.error(`Security: Access denied. User ${userIdToCheck} does not own document ${docId} in ${collection}`);
    }
    
    return isOwner;
  } catch (error) {
    console.error('Security: Error verifying ownership:', error);
    return false;
  }
};

/**
 * Verify ownership for multiple documents
 * @param {Array<{collection: string, docId: string}>} documents - Array of documents to verify
 * @param {string} userId - User ID to check ownership against (optional)
 * @returns {Promise<boolean>} - True if user owns ALL documents, false if any fail
 */
export const verifyMultipleOwnership = async (documents, userId = null) => {
  try {
    const verificationPromises = documents.map(({ collection, docId }) => 
      verifyOwnership(collection, docId, userId)
    );
    
    const results = await Promise.all(verificationPromises);
    return results.every(result => result === true);
  } catch (error) {
    console.error('Security: Error verifying multiple ownership:', error);
    return false;
  }
};

/**
 * Create a secured query that automatically filters by user ownership
 * @param {import('firebase/firestore').CollectionReference} collectionRef - Firestore collection reference
 * @param {string} ownershipField - Field name that contains the owner ID (default: 'practiceId')
 * @returns {import('firebase/firestore').Query} - Filtered query
 */
export const createSecuredQuery = (collectionRef, ownershipField = 'practiceId') => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Security: No authenticated user for secured query');
  }
  
  const { query, where } = require('firebase/firestore');
  return query(collectionRef, where(ownershipField, '==', currentUser.uid));
};

/**
 * Validate that user data being saved includes proper ownership fields
 * @param {Object} data - Data object to validate
 * @param {string} ownershipField - Field name that should contain the owner ID (default: 'practiceId')
 * @returns {Object} - Sanitized data with ownership field set
 */
export const ensureOwnership = (data, ownershipField = 'practiceId') => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Security: No authenticated user for ownership enforcement');
  }
  
  return {
    ...data,
    [ownershipField]: currentUser.uid,
    // Add security metadata
    createdBy: currentUser.uid,
    lastModifiedBy: currentUser.uid,
    lastModified: new Date()
  };
};

/**
 * Security middleware wrapper for async operations
 * @param {Function} operation - Async operation to secure
 * @param {string} collection - Collection name for ownership check
 * @param {string} docId - Document ID to verify (for update/delete operations)
 * @returns {Function} - Wrapped secure operation
 */
export const secureOperation = (operation, collection, docId = null) => {
  return async (...args) => {
    try {
      // For operations that modify existing documents, verify ownership first
      if (docId) {
        const hasPermission = await verifyOwnership(collection, docId);
        if (!hasPermission) {
          throw new Error(`Security: Access denied for ${collection}/${docId}`);
        }
      }
      
      // Execute the operation
      return await operation(...args);
    } catch (error) {
      console.error('Security: Secured operation failed:', error);
      throw error;
    }
  };
};

/**
 * Rate limiting utility to prevent abuse
 */
const rateLimiter = new Map();

export const checkRateLimit = (userId, action, maxRequests = 10, windowMs = 60000) => {
  const key = `${userId}:${action}`;
  const now = Date.now();
  
  if (!rateLimiter.has(key)) {
    rateLimiter.set(key, { requests: 1, windowStart: now });
    return true;
  }
  
  const data = rateLimiter.get(key);
  
  // Reset window if expired
  if (now - data.windowStart > windowMs) {
    data.requests = 1;
    data.windowStart = now;
    return true;
  }
  
  // Check if under limit
  if (data.requests < maxRequests) {
    data.requests++;
    return true;
  }
  
  return false;
};