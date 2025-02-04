"use strict";
/**
 * Utility functions for environment-related operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTest = exports.isProduction = exports.isDevelopment = void 0;
/**
 * Check if the current environment is development
 * @returns boolean indicating if current environment is development
 */
const isDevelopment = () => {
    return process.env.NODE_ENV === 'development';
};
exports.isDevelopment = isDevelopment;
/**
 * Check if the current environment is production
 * @returns boolean indicating if current environment is production
 */
const isProduction = () => {
    return process.env.NODE_ENV === 'production';
};
exports.isProduction = isProduction;
/**
 * Check if the current environment is test
 * @returns boolean indicating if current environment is test
 */
const isTest = () => {
    return process.env.NODE_ENV === 'test';
};
exports.isTest = isTest;
