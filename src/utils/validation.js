/**
 * Comprehensive input validation utilities
 * Addresses security vulnerabilities related to input validation and XSS prevention
 */

// Input sanitization to prevent XSS attacks
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>\"'&]/g, (match) => {
      const escapeMap = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return escapeMap[match];
    })
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+=/gi, ''); // Remove event handlers
};

// Enhanced email validation
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { isValid: false, message: 'Email is required' };
  }

  const trimmedEmail = email.trim();
  
  if (trimmedEmail.length === 0) {
    return { isValid: false, message: 'Email is required' };
  }

  if (trimmedEmail.length > 254) {
    return { isValid: false, message: 'Email address is too long' };
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!emailRegex.test(trimmedEmail)) {
    return { isValid: false, message: 'Please enter a valid email address' };
  }

  // Additional checks for common email issues
  if (trimmedEmail.includes('..') || trimmedEmail.startsWith('.') || trimmedEmail.endsWith('.')) {
    return { isValid: false, message: 'Invalid email format' };
  }

  return { isValid: true, message: '' };
};

// Enhanced password validation
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { isValid: false, message: 'Password is required', requirements: {} };
  }

  const requirements = {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumbers: /\d/.test(password),
    hasSymbols: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };

  const isValid = Object.values(requirements).every(req => req);
  
  let message = '';
  if (!isValid) {
    const failedRequirements = [];
    if (!requirements.minLength) failedRequirements.push('at least 8 characters');
    if (!requirements.hasUpperCase) failedRequirements.push('uppercase letter');
    if (!requirements.hasLowerCase) failedRequirements.push('lowercase letter');
    if (!requirements.hasNumbers) failedRequirements.push('number');
    if (!requirements.hasSymbols) failedRequirements.push('special character');
    
    message = `Password must contain: ${failedRequirements.join(', ')}`;
  }

  return { isValid, message, requirements };
};

// Product name validation
export const validateProductName = (productName) => {
  if (!productName || typeof productName !== 'string') {
    return { isValid: false, message: 'Product name is required' };
  }

  const trimmed = productName.trim();
  
  if (trimmed.length === 0) {
    return { isValid: false, message: 'Product name is required' };
  }

  if (trimmed.length > 100) {
    return { isValid: false, message: 'Product name must be 100 characters or less' };
  }

  // Check for potentially malicious content
  if (/<script|javascript:|on\w+=/i.test(trimmed)) {
    return { isValid: false, message: 'Product name contains invalid characters' };
  }

  return { isValid: true, message: '' };
};

// Numeric validation (quantities, prices, etc.)
export const validateNumber = (value, { min = 0, max = Number.MAX_SAFE_INTEGER, required = true, label = 'Value' } = {}) => {
  if (!required && (value === '' || value === null || value === undefined)) {
    return { isValid: true, message: '' };
  }

  if (required && (value === '' || value === null || value === undefined)) {
    return { isValid: false, message: `${label} is required` };
  }

  const numValue = parseFloat(value);
  
  if (isNaN(numValue)) {
    return { isValid: false, message: `${label} must be a valid number` };
  }

  if (numValue < min) {
    return { isValid: false, message: `${label} must be at least ${min}` };
  }

  if (numValue > max) {
    return { isValid: false, message: `${label} must be no more than ${max}` };
  }

  return { isValid: true, message: '', value: numValue };
};

// Text validation (descriptions, notes, etc.)
export const validateText = (text, { maxLength = 1000, required = false, label = 'Text' } = {}) => {
  if (!required && (!text || text.trim().length === 0)) {
    return { isValid: true, message: '' };
  }

  if (required && (!text || text.trim().length === 0)) {
    return { isValid: false, message: `${label} is required` };
  }

  if (text && text.length > maxLength) {
    return { isValid: false, message: `${label} must be ${maxLength} characters or less` };
  }

  // Check for potentially malicious content
  if (text && /<script|javascript:|on\w+=/i.test(text)) {
    return { isValid: false, message: `${label} contains invalid characters` };
  }

  return { isValid: true, message: '' };
};

// Barcode validation
export const validateBarcode = (barcode) => {
  if (!barcode || typeof barcode !== 'string') {
    return { isValid: false, message: 'Barcode is required' };
  }

  const trimmed = barcode.trim();
  
  if (trimmed.length === 0) {
    return { isValid: false, message: 'Barcode is required' };
  }

  // Basic barcode format validation (alphanumeric, common lengths)
  if (!/^[A-Za-z0-9]+$/.test(trimmed)) {
    return { isValid: false, message: 'Barcode must contain only letters and numbers' };
  }

  if (trimmed.length < 6 || trimmed.length > 50) {
    return { isValid: false, message: 'Barcode must be between 6 and 50 characters' };
  }

  return { isValid: true, message: '' };
};

// Date validation
export const validateDate = (date, { required = true, label = 'Date', futureOnly = false } = {}) => {
  if (!required && (!date || date === '')) {
    return { isValid: true, message: '' };
  }

  if (required && (!date || date === '')) {
    return { isValid: false, message: `${label} is required` };
  }

  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return { isValid: false, message: `Please enter a valid ${label.toLowerCase()}` };
  }

  if (futureOnly && dateObj < new Date()) {
    return { isValid: false, message: `${label} must be in the future` };
  }

  return { isValid: true, message: '', value: dateObj };
};

// Comprehensive form validation
export const validateForm = (formData, validationRules) => {
  const errors = {};
  let isValid = true;

  Object.keys(validationRules).forEach(field => {
    const rules = validationRules[field];
    const value = formData[field];
    
    for (const rule of rules) {
      const result = rule(value);
      if (!result.isValid) {
        errors[field] = result.message;
        isValid = false;
        break; // Stop at first validation error for this field
      }
    }
  });

  return { isValid, errors };
};

// Sanitize object data (recursive)
export const sanitizeObjectData = (obj) => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeInput(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObjectData(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    Object.keys(obj).forEach(key => {
      sanitized[key] = sanitizeObjectData(obj[key]);
    });
    return sanitized;
  }
  
  return obj;
};