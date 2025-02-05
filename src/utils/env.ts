/**
 * Utility functions for environment-related operations
 */

/**
 * Check if the current environment is development
 * @returns boolean indicating if current environment is development
 */
export const isDevelopment = (): boolean => {
    return process.env.NODE_ENV === 'development';
};

/**
 * Check if the current environment is production
 * @returns boolean indicating if current environment is production
 */
export const isProduction = (): boolean => {
    return process.env.NODE_ENV === 'production';
};

/**
 * Check if the current environment is test
 * @returns boolean indicating if current environment is test
 */
export const isTest = (): boolean => {
    return process.env.NODE_ENV === 'test';
};
