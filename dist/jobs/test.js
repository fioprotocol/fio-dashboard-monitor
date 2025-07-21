"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("../config/env");
const database_1 = require("../config/database");
const logger_1 = __importDefault(require("../config/logger"));
const discord_1 = require("../services/discord");
async function testConnection() {
    try {
        const result = await database_1.pool.query('SELECT NOW()');
        const timestamp = result.rows[0].now;
        logger_1.default.info('Database connected', { timestamp });
        await discord_1.discordNotifier.sendNotification('Database Connection Test', {
            title: '✅ Database Connection Successful',
            level: 'info',
            fields: [
                { name: 'Timestamp', value: timestamp.toString(), inline: true },
                { name: 'Status', value: 'Connected', inline: true },
            ],
        });
    }
    catch (error) {
        logger_1.default.error('Database connection error', { error });
        await discord_1.discordNotifier.sendNotification('Database Connection Test', {
            title: '❌ Database Connection Failed',
            level: 'error',
            fields: [
                { name: 'Error', value: error.message, inline: false },
                { name: 'Timestamp', value: new Date().toISOString(), inline: true },
            ],
        });
    }
}
// This function will be called by Bree
(async () => {
    logger_1.default.info('Running job...', { timestamp: new Date().toISOString() });
    await testConnection();
})();
