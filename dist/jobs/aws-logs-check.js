"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("../config/env");
const client_cloudwatch_logs_1 = require("@aws-sdk/client-cloudwatch-logs");
const logger_1 = __importDefault(require("../config/logger"));
const discord_1 = require("../services/discord");
const JOB_NAME = 'AWS-LOGS';
const TIME_THRESHOLD_MINUTES = process.env.AWS_LOGS_TIME_THRESHOLD_MINUTES;
const ERRORS = JSON.parse(process.env.AWS_LOGS_ERROR_PATTERNS_JSON);
const THRESHOLD_LIMIT = parseInt(process.env.AWS_LOGS_THRESHOLD_LIMIT);
// Initialize CloudWatch Logs client
const cloudWatchLogs = new client_cloudwatch_logs_1.CloudWatchLogs({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
async function checkAwsLogs() {
    try {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - parseInt(TIME_THRESHOLD_MINUTES) * 60 * 1000);
        for (const error of ERRORS) {
            const response = await cloudWatchLogs.filterLogEvents({
                logGroupName: process.env.AWS_LOG_GROUP_NAME,
                startTime: startTime.getTime(),
                endTime: endTime.getTime(),
                filterPattern: error,
            });
            const errorLogs = response.events || [];
            if (errorLogs.length > THRESHOLD_LIMIT) {
                const message = `Found ${errorLogs.length} error logs in the last ${TIME_THRESHOLD_MINUTES} minutes`;
                const fields = errorLogs
                    .map((log, index) => ({
                    name: `Error Log ${index + 1}`,
                    value: `${log.message}\nTimestamp: ${new Date(log.timestamp || 0).toISOString()}`,
                    inline: false,
                }))
                    .slice(0, 25); // Limit to 25 fields for Discord
                logger_1.default.warn(`⚠️ ${JOB_NAME} Alert`, {
                    message,
                    count: errorLogs.length,
                    logs: fields,
                });
                await discord_1.discordNotifier.sendNotification(message, {
                    title: '⚠️ AWS Logs Error Alert',
                    level: 'warning',
                    fields,
                });
            }
        }
        return {
            success: true,
            // errorLogsCount: errorLogs.length,
            // message: errorLogs.length > 0 ? 'Found error logs' : 'No error logs found',
        };
    }
    catch (error) {
        // Enhanced error logging
        console.error('Full error details:', {
            message: error.message,
            stack: error.stack,
            details: error, // Log the full error object
        });
        logger_1.default.error(`Error checking ${JOB_NAME}`, {
            error: error,
            logGroup: process.env.AWS_LOG_GROUP_NAME,
            region: process.env.AWS_REGION,
        });
        await discord_1.discordNotifier.sendNotification('Error checking AWS logs', {
            title: '⚠️ Error during AWS logs check',
            level: 'error',
            fields: [
                {
                    name: 'Error',
                    value: error.message,
                    inline: false,
                },
            ],
        });
        return {
            success: false,
            error: error.message,
            message: 'Failed to check AWS logs',
        };
    }
}
// Execute the function
checkAwsLogs().then((result) => {
    if (result.success) {
        logger_1.default.info(`Job ${JOB_NAME} completed successfully`, result);
    }
    else {
        logger_1.default.error(`Job ${JOB_NAME} failed`);
    }
});
