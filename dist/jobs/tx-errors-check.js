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
const JOB_NAME = 'TX-ERRORS';
const LIMIT = env_1.envConfig.TX_ERRORS_LIMIT ? parseInt(env_1.envConfig.TX_ERRORS_LIMIT) : 300;
const TIME_THRESHOLD_HOURS = env_1.envConfig.TX_ERRORS_TIME_THRESHOLD_HOURS;
const PENDING_GRACE_PERIOD_MINUTES = env_1.envConfig.TX_ERRORS_PENDING_GRACE_PERIOD_MINUTES
    ? parseInt(env_1.envConfig.TX_ERRORS_PENDING_GRACE_PERIOD_MINUTES)
    : 15;
const errorTxQuery = `
  SELECT 
    bt.id,
    bt.status,
    bt."createdAt",
    btel.status as "eventStatus",
    btel."statusNotes",
    btel."data"
  FROM public."blockchain-transactions" bt
  LEFT JOIN "blockchain-transaction-event-logs" btel ON bt.id = btel."blockchainTransactionId"
  WHERE bt."status" != $1
    AND bt."createdAt" > NOW() - INTERVAL '${TIME_THRESHOLD_HOURS} hours'
    AND bt."createdAt" < NOW() - INTERVAL '${PENDING_GRACE_PERIOD_MINUTES} minutes'
    AND NOT EXISTS (
      SELECT 1
      FROM "order-items-status" ois_tx
      JOIN "order-items" oi_tx ON oi_tx.id = ois_tx."orderItemId"
      JOIN "order-items" oi_sibling ON oi_sibling."orderId" = oi_tx."orderId"
      JOIN "order-items-status" ois_sibling ON ois_sibling."orderItemId" = oi_sibling.id
      WHERE ois_tx."blockchainTransactionId" = bt.id
      AND ois_sibling."txStatus" IN (${models_1.BlockchainTransaction.STATUS.READY}, ${models_1.BlockchainTransaction.STATUS.PENDING})
      AND ois_sibling."updatedAt" >= NOW() - INTERVAL '${TIME_THRESHOLD_HOURS} hours'
    )
  ORDER BY bt.id DESC
  LIMIT $2
`;
async function checkErrorTransactions() {
    try {
        const result = await database_1.pool.query(errorTxQuery, [models_1.BlockchainTransaction.STATUS.SUCCESS, LIMIT]);
        const errorTxs = result.rows;
        if (errorTxs.length === LIMIT) {
            const message = `Found at least ${LIMIT} transactions in error state within ${TIME_THRESHOLD_HOURS} hours (excluding last ${PENDING_GRACE_PERIOD_MINUTES} minutes)`;
            const errorsByType = errorTxs.reduce((acc, tx) => {
                var _a;
                const errorType = (_a = tx === null || tx === void 0 ? void 0 : tx.data) === null || _a === void 0 ? void 0 : _a.errorType;
                if (errorType) {
                    acc[errorType] = [...(acc[errorType] || []), tx];
                }
                return acc;
            }, {});
            // Find the error type with the most occurrences
            const mostFrequentError = Object.entries(errorsByType).reduce((most, [type, txs]) => {
                return txs.length > most.txs.length
                    ? { type, txs: txs }
                    : most;
            }, { type: '', txs: [] });
            const fields = [
                {
                    name: 'Most common error',
                    value: `${mostFrequentError.type} (${mostFrequentError.txs.length} occurrences)`,
                    inline: false,
                },
            ];
            logger_1.default.warn(`⚠️ ${JOB_NAME} Alert`, {
                message,
                count: errorTxs.length,
                transactions: fields,
            });
            await discord_1.discordNotifier.sendNotification(message, {
                title: '⚠️ Transaction Errors Alert',
                level: 'warning',
                fields,
            });
        }
        return {
            success: true,
            errorTransactionsCount: errorTxs.length,
            message: errorTxs.length > 0 ? 'Found transactions with errors' : 'No error transactions found',
        };
    }
    catch (error) {
        logger_1.default.error(`Error checking ${JOB_NAME}`, error);
        await discord_1.discordNotifier.sendNotification('Error checking transactions with errors', {
            title: '⚠️ Error during transaction errors check',
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
            message: 'Failed to check error transactions',
        };
    }
}
// Execute the function
checkErrorTransactions().then((result) => {
    if (result.success) {
        logger_1.default.info(`Job ${JOB_NAME} completed successfully`, result);
    }
    else {
        logger_1.default.error(`Job ${JOB_NAME} failed`);
    }
});
