import '../config/env';
import { pool } from '../config/database';
import { discordNotifier } from '../services/discord';
import logger from '../config/logger';
import { BlockchainTransaction } from '../models';
import { envConfig } from '../utils/env';

const JOB_NAME = 'NO-TXs';
const TIME_THRESHOLD_HOURS = envConfig.NO_TX_TIME_THRESHOLD_HOURS;

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

async function checkTransactions(): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    // Query transactions older than 30 minutes
    const result = await pool.query(txQuery, [BlockchainTransaction.STATUS.SUCCESS]);
    const txs = result.rows;

    if (txs.length === 0) {
      // Create a message for Discord notification
      const message = `Found no transactions older than ${TIME_THRESHOLD_HOURS} hours`;

      logger.warn(`⚠️ ${JOB_NAME} Alert`, {
        message,
      });

      // Send notification to Discord
      await discordNotifier.sendNotification(message, {
        title: '⚠️ No Transactions Alert',
        level: 'warning',
      });
    }

    return {
      success: true,
      message: txs.length > 0 ? 'Transactions exist' : 'No transactions found',
    };
  } catch (error) {
    logger.error(`Error checking ${JOB_NAME}`, error);

    // Send notification to Discord
    await discordNotifier.sendNotification('Error checking transactions', {
      title: '⚠️ There is an issue during transactions check',
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
      message: 'Failed to check transactions',
    };
  }
}

// Execute the function
checkTransactions().then((result) => {
  // This will be sent to the worker message handler
  if (result.success) {
    logger.info(`Job ${JOB_NAME} completed successfully`, result);
  } else {
    logger.error(`Job ${JOB_NAME} failed`);
  }
});
