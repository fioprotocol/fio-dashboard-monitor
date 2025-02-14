"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("../config/env");
const database_1 = require("../config/database");
const discord_1 = require("../services/discord");
const logger_1 = __importDefault(require("../config/logger"));
const models_1 = require("../models");
const env_1 = require("../utils/env");
const JOB_NAME = 'NO-TXs';
const TIME_THRESHOLD_HOURS = env_1.envConfig.NO_TX_TIME_THRESHOLD_HOURS;
const txQuery = `
  SELECT 
    bt.id,
    bt."status",
    bt."txId",
    bt."updatedAt"
  FROM "blockchain-transactions" bt
  WHERE bt."status" = $1
    AND bt."txId" IS NOT NULL
    AND bt."updatedAt" > NOW() - INTERVAL '${TIME_THRESHOLD_HOURS} hours'
  ORDER BY bt."updatedAt" DESC
  LIMIT 1
`;
async function checkTransactions() {
    try {
        // Query transactions older than 30 minutes
        const result = await database_1.pool.query(txQuery, [
            models_1.BlockchainTransaction.STATUS.SUCCESS,
        ]);
        const txs = result.rows;
        if (txs.length === 0) {
            // Create a message for Discord notification
            const message = `Found no transactions older than ${TIME_THRESHOLD_HOURS} hours`;
            logger_1.default.warn(`⚠️ ${JOB_NAME} Alert`, {
                message,
            });
            // Send notification to Discord
            await discord_1.discordNotifier.sendNotification(message, {
                title: '⚠️ No Transactions Alert',
                level: 'warning',
            });
        }
        return {
            success: true,
            message: txs.length > 0 ? 'Transactions exist' : 'No transactions found',
        };
    }
    catch (error) {
        logger_1.default.error(`Error checking ${JOB_NAME}`, error);
        // Send notification to Discord
        await discord_1.discordNotifier.sendNotification('Error checking transactions', {
            title: '⚠️ There is an issue during transactions check',
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
            message: 'Failed to check transactions',
        };
    }
}
// Execute the function
checkTransactions().then((result) => {
    // This will be sent to the worker message handler
    if (result.success) {
        logger_1.default.info(`Job ${JOB_NAME} completed successfully`, result);
    }
    else {
        logger_1.default.error(`Job ${JOB_NAME} failed`);
    }
});
