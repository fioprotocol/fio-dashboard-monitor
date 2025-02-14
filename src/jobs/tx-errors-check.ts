import '../config/env';
import { pool } from '../config/database';
import { discordNotifier } from '../services/discord';
import logger from '../config/logger';
import { BlockchainTransaction } from '../models';
import { envConfig } from '../utils/env';

const JOB_NAME = 'TX-ERRORS';
const LIMIT = envConfig.TX_ERRORS_LIMIT ? parseInt(envConfig.TX_ERRORS_LIMIT) : 300;
const TIME_THRESHOLD_HOURS = envConfig.TX_ERRORS_TIME_THRESHOLD_HOURS;

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
  ORDER BY bt.id DESC
  LIMIT $2
`;

async function checkErrorTransactions() {
  try {
    const result = await pool.query(errorTxQuery, [BlockchainTransaction.STATUS.SUCCESS, LIMIT]);
    const errorTxs = result.rows;

    if (errorTxs.length === LIMIT) {
      const message = `Found at least ${LIMIT} transactions in error state within ${TIME_THRESHOLD_HOURS} hours`;

      const errorsByType = errorTxs.reduce((acc, tx) => {
        const errorType = tx?.data?.errorType;
        if (errorType) {
          acc[errorType] = [...(acc[errorType] || []), tx];
        }

        return acc;
      }, {});

      // Find the error type with the most occurrences
      const mostFrequentError = Object.entries(errorsByType).reduce<{ type: string; txs: any[] }>(
        (most, [type, txs]) => {
          return (txs as any[]).length > most.txs.length ? { type, txs: txs as any[] } : most;
        },
        { type: '', txs: [] },
      );

      const fields = [
        {
          name: 'Most common error',
          value: `${mostFrequentError.type} (${(mostFrequentError.txs as any[]).length} occurrences)`,
          inline: false,
        },
      ];

      logger.warn(`⚠️ ${JOB_NAME} Alert`, {
        message,
        count: errorTxs.length,
        transactions: fields,
      });

      await discordNotifier.sendNotification(message, {
        title: '⚠️ Transaction Errors Alert',
        level: 'warning',
        fields,
      });
    }

    return {
      success: true,
      errorTransactionsCount: errorTxs.length,
      message:
        errorTxs.length > 0 ? 'Found transactions with errors' : 'No error transactions found',
    };
  } catch (error) {
    logger.error(`Error checking ${JOB_NAME}`, error);

    await discordNotifier.sendNotification('Error checking transactions with errors', {
      title: '⚠️ Error during transaction errors check',
      level: 'error',
      fields: [
        {
          name: 'Error',
          value: (error as Error).message,
          inline: false,
        },
      ],
    });

    return {
      success: false,
      error: (error as Error).message,
      message: 'Failed to check error transactions',
    };
  }
}

// Execute the function
checkErrorTransactions().then((result) => {
  if (result.success) {
    logger.info(`Job ${JOB_NAME} completed successfully`, result);
  } else {
    logger.error(`Job ${JOB_NAME} failed`);
  }
});
