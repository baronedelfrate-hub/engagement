/**
 * Utility functions for data validation across the application
 */

/**
 * Converts empty strings or invalid numbers to NULL for database compatibility.
 * Useful for numeric fields that are optional.
 * 
 * @param {any} value - The value to validate and convert
 * @returns {number|null} - The numeric value or null
 */
export const validateNumericField = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  
  // If it's already a number, just return it
  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }
  
  // Try parsing the string
  const num = Number(value);
  return isNaN(num) ? null : num;
};

/**
 * Validates if a string is a properly formatted email address.
 * Returns true if empty (to allow optional fields). Use validateRequiredFields for mandatory check.
 * 
 * @param {string} email - The email to validate
 * @returns {boolean}
 */
export const validateEmail = (email) => {
  if (!email || email.trim() === '') return true;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/**
 * Validates a CNPJ or CPF string (ignores formatting characters).
 * 
 * @param {string} document - The CPF or CNPJ to validate
 * @returns {boolean}
 */
export const validateCNPJ = (document) => {
  if (!document) return false;
  const cleaned = document.toString().replace(/[^\d]/g, '');
  return cleaned.length === 11 || cleaned.length === 14;
};

/**
 * Checks an object for missing required fields.
 * 
 * @param {Object} data - The data object to check
 * @param {string[]} requiredFields - Array of keys that must be present and not empty
 * @returns {string[]} - Array of field names that are missing
 */
export const validateRequiredFields = (data, requiredFields) => {
  if (!data || !requiredFields) return [];
  
  return requiredFields.filter(field => {
    const val = data[field];
    return val === undefined || val === null || (typeof val === 'string' && val.trim() === '');
  });
};