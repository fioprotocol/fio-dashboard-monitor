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
const JOB_NAME = 'PENDING-TXs';
const LIMIT = 30;
const TIME_THRESHOLD_MINUTES = env_1.envConfig.PENDING_TX_TIME_THRESHOLD_MINUTES;
const pendingOrderItemsQuery = `
  SELECT 
    oi.id, 
    oi.address, 
    oi.domain, 
    oi.action, 
    oi.params, 
    oi.data, 
    oi.price,
    oi."nativeFio",
    o.id "orderId", 
    o.roe, 
    o."publicKey", 
    o.total,
    o."userId",
    o."number",
    p.processor,
    ois."blockchainTransactionId",
    ois."paymentId",
    ois."updatedAt",
    rp.label,
    rp."code", 
    rp.tpid,
    drp.tpid as "affiliateTpid",
    fapfree.actor as "freeActor",
    fapfree.permission as "freePermission",
    fappaid.actor as "paidActor",
    fappaid.permission as "paidPermission"
  FROM "order-items" oi
    INNER JOIN "order-items-status" ois ON ois."orderItemId" = oi.id
    INNER JOIN orders o ON o.id = oi."orderId"
    LEFT JOIN "users" u ON u.id = o."userId"
    LEFT JOIN "payments" p ON p."orderId" = oi."orderId" AND p."spentType" = $1
    LEFT JOIN "referrer-profiles" rp ON rp.id = o."refProfileId" AND rp.type = $2
    LEFT JOIN "referrer-profiles" drp ON drp.id = o."refProfileId"
    LEFT JOIN "fio-account-profiles" fapfree ON fapfree.id = rp."freeFioAccountProfileId"
    LEFT JOIN "fio-account-profiles" fappaid ON fappaid.id = rp."paidFioAccountProfileId"
  WHERE ois."paymentStatus" = $3 
    AND ois."txStatus" = $4
    AND ois."updatedAt" < NOW() - INTERVAL '${TIME_THRESHOLD_MINUTES} minutes'
  ORDER BY oi.id
  LIMIT $5
`;
async function checkPendingTransactions() {
    try {
        // Query transactions older than 30 minutes
        const result = await database_1.pool.query(pendingOrderItemsQuery, [
            models_1.Payment.SPENT_TYPE.ORDER,
            models_1.ReferrerProfile.TYPE.REF,
            models_1.Payment.STATUS.COMPLETED,
            models_1.BlockchainTransaction.STATUS.READY,
            LIMIT,
        ]);
        const pendingTxs = result.rows;
        if (pendingTxs.length > 0) {
            // Create a message for Discord notification
            const message = `Found pending transactions older than ${TIME_THRESHOLD_MINUTES} minutes`;
            const fields = pendingTxs.map((tx) => ({
                name: `Order item ID: ${tx.id}`,
                value: `Order: ${tx.number}, Ready status set at: ${new Date(tx.updatedAt).toISOString()}`,
                inline: false,
            }));
            logger_1.default.warn(`⚠️ ${JOB_NAME} Alert`, {
                message,
                count: pendingTxs.length,
                transactions: fields,
            });
            // Send notification to Discord
            await discord_1.discordNotifier.sendNotification(message, {
                title: '⚠️ Pending Transactions Alert',
                level: 'warning',
                fields,
            });
        }
        return {
            success: true,
            pendingTransactionsCount: pendingTxs.length,
            message: pendingTxs.length > 0 ? 'Found pending transactions' : 'No pending transactions found',
        };
    }
    catch (error) {
        logger_1.default.error(`Error checking ${JOB_NAME}`, error);
        // Send notification to Discord
        await discord_1.discordNotifier.sendNotification('Error checking pending transactions', {
            title: '⚠️ There is an issue during pending transactions check',
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
            message: 'Failed to check pending transactions',
        };
    }
}
// Execute the function
checkPendingTransactions().then((result) => {
    // This will be sent to the worker message handler
    if (result.success) {
        logger_1.default.info(`Job ${JOB_NAME} completed successfully`, result);
    }
    else {
        logger_1.default.error(`Job ${JOB_NAME} failed`);
    }
});
