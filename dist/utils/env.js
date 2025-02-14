"use strict";
/**
 * Utility functions for environment-related operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.envConfig = exports.isTest = exports.isProduction = exports.isDevelopment = void 0;
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
/**
 * Central configuration object containing all environment variables
 */
exports.envConfig = {
    // Node environment
    NODE_ENV: process.env.NODE_ENV,
    // Database
    DB_USER: process.env.DB_USER,
    DB_HOST: process.env.DB_HOST,
    DB_NAME: process.env.DB_NAME,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_PORT: process.env.DB_PORT,
    // Discord
    DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,
    DISCORD_TITLE_PREFIX: process.env.DISCORD_TITLE_PREFIX || '',
    // Jobs
    NO_TX_TIME_THRESHOLD_HOURS: process.env.NO_TX_TIME_THRESHOLD_HOURS,
    PENDING_TX_TIME_THRESHOLD_MINUTES: process.env.PENDING_TX_TIME_THRESHOLD_MINUTES,
    TX_ERRORS_TIME_THRESHOLD_HOURS: process.env.TX_ERRORS_TIME_THRESHOLD_HOURS,
    TX_ERRORS_LIMIT: process.env.TX_ERRORS_LIMIT,
    AWS_LOGS_TIME_INTERVAL: process.env.AWS_LOGS_TIME_INTERVAL,
    AWS_LOGS_TIME_THRESHOLD_MINUTES: process.env.AWS_LOGS_TIME_THRESHOLD_MINUTES,
    AWS_LOGS_ERROR_PATTERNS_JSON: process.env.AWS_LOGS_ERROR_PATTERNS_JSON,
    AWS_LOGS_THRESHOLD_LIMIT: process.env.AWS_LOGS_THRESHOLD_LIMIT,
    AWS_REGION: process.env.AWS_REGION,
    AWS_LOG_GROUP_NAME: process.env.AWS_LOG_GROUP_NAME,
    // AWS Local dev credentials
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_SESSION_TOKEN: process.env.AWS_SESSION_TOKEN,
    // Jobs run params
    NO_TX_TIME_INTERVAL: process.env.NO_TX_TIME_INTERVAL,
    PENDING_TX_TIME_INTERVAL: process.env.PENDING_TX_TIME_INTERVAL,
    TX_ERRORS_TIME_INTERVAL: process.env.TX_ERRORS_TIME_INTERVAL,
};
