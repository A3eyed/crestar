// @ts-nocheck
/**
 * Development-only logging utilities.
 * Logs are silenced in production builds (except errors).
 */

const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

/**
 * Log to console (dev only)
 */
export const devLog = (...args) => {
  if (isDev) console.log(...args);
};

/**
 * Warn to console (dev only)
 */
export const devWarn = (...args) => {
  if (isDev) console.warn(...args);
};

/**
 * Error to console (always — real errors should be visible in production)
 */
export const devError = (...args) => {
  console.error(...args);
};

/**
 * Secure logging for auth-related operations (dev only, safe fields only)
 */
export const secureAuthLog = (message, options = {}) => {
  if (!isDev) return;
  const safeData = {};

  // Only allow specific safe fields
  if (options.email) safeData.email = options.email;
  if (options.userId) safeData.userId = options.userId;
  if (options.hasJWT !== undefined) safeData.hasJWT = options.hasJWT;
  if (options.isValid !== undefined) safeData.isValid = options.isValid;
  if (options.status) safeData.status = options.status;

  console.log(message, safeData);
};

/**
 * Secure logging for network requests (dev only, safe fields only)
 */
export const secureNetworkLog = (message, options = {}) => {
  if (!isDev) return;
  const safeData = {};

  if (options.url) safeData.url = options.url;
  if (options.method) safeData.method = options.method;
  if (options.status) safeData.status = options.status;
  if (options.hasAuth !== undefined) safeData.hasAuth = options.hasAuth;

  console.log(message, safeData);
};
