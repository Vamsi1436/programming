/**
 * Validation functions for the Blacknight Internet Solutions client management system
 */

/**
 * Validate email address
 * @param {string} email - The email to validate
 * @returns {boolean} - Whether the email is valid
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate phone number
 * @param {string} phone - The phone number to validate
 * @returns {boolean} - Whether the phone number is valid
 */
function isValidPhone(phone) {
    // Allow formats like +353 87 123 4567, 087 123 4567, (01) 123 4567, etc.
    const phoneRegex = /^(\+\d{1,3}\s?)?(\(\d{1,4}\)\s?)?(\d{1,4}[\s-]?){2,3}\d{1,4}$/;
    return phoneRegex.test(phone);
}

/**
 * Validate date string
 * @param {string} dateString - The date string to validate
 * @returns {boolean} - Whether the date is valid
 */
function isValidDate(dateString) {
    if (!dateString) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
}

/**
 * Check if a value is not empty
 * @param {*} value - The value to check
 * @returns {boolean} - Whether the value is not empty
 */
function isNotEmpty(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    return true;
}

/**
 * Validate number is within range
 * @param {*} value - The value to validate
 * @param {number|null} min - The minimum value (null for no minimum)
 * @param {number|null} max - The maximum value (null for no maximum)
 * @returns {boolean} - Whether the number is valid
 */
function isValidNumber(value, min = null, max = null) {
    const number = parseFloat(value);
    if (isNaN(number)) return false;
    if (min !== null && number < min) return false;
    if (max !== null && number > max) return false;
    return true;
}

/**
 * Format date string to localized format
 * @param {string} dateString - The date string to format
 * @returns {string} - The formatted date
 */
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-IE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }).format(date);
}

/**
 * Validate client ID format (e.g., BK0001)
 * @param {string} clientId - The client ID to validate
 * @returns {boolean} - Whether the client ID is valid
 */
function isValidClientId(clientId) {
    const clientIdRegex = /^BK\d{4}$/;
    return clientIdRegex.test(clientId);
}

/**
 * Validate service ID format (e.g., SRV001)
 * @param {string} serviceId - The service ID to validate
 * @returns {boolean} - Whether the service ID is valid
 */
function isValidServiceId(serviceId) {
    const serviceIdRegex = /^SRV\d{3}$/;
    return serviceIdRegex.test(serviceId);
}

/**
 * Validate subscription ID format (e.g., SUB00001)
 * @param {string} subscriptionId - The subscription ID to validate
 * @returns {boolean} - Whether the subscription ID is valid
 */
function isValidSubscriptionId(subscriptionId) {
    const subscriptionIdRegex = /^SUB\d{5}$/;
    return subscriptionIdRegex.test(subscriptionId);
}