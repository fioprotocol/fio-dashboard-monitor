import '../config/env';
import { pool } from '../config/database';
import { discordNotifier } from '../services/discord';
import logger from '../config/logger';
import { BlockchainTransaction } from '../models';
import { envConfig } from '../utils/env';
import { ChainTransactionResponseType } from '../types/blockchain-transaction';

const JOB_NAME = 'MISSING-TXs-CHECK';
const TIME_THRESHOLD_MINUTES = envConfig.MISSING_TX_TIME_THRESHOLD_MINUTES;

interface MissingTransaction {
  orderId: number;
  orderNumber: string;
  orderCreatedAt: Date;
  orderItemId: number;
  orderItemAction: string;
  transactionId: string;
  blockchainTransactionId: number;
  transactionCreatedAt: Date;
  error: string;
}

interface FioHistoryApiUrl {
  url: string;
}

// FIO History client
class FioHistory {
  private historyNodeUrls: string[];

  constructor({ fioHistoryUrls }: { fioHistoryUrls: string[] }) {
    this.historyNodeUrls = fioHistoryUrls;
  }

  async getTransaction({
    transactionId,
    maxRetries = 3,
  }: {
    transactionId: string;
    maxRetries?: number;
  }): Promise<ChainTransactionResponseType> {
    for (const url of this.historyNodeUrls) {
      for (let retry = 0; retry < maxRetries; retry++) {
        try {
          const response = await fetch(
            `${url}history/get_transaction?id=${transactionId}&block_hint=0`,
          );

          // Handle rate limiting
          if (response.status === 429 || response.status === 503) {
            logger.warn(`Rate limit hit for ${transactionId}, waiting 1 minute...`);
            await new Promise((resolve) => setTimeout(resolve, 60000)); // Wait 1 minute
            // Retry this same attempt
            retry--;
            continue;
          }

          const data = (await response.json()) as ChainTransactionResponseType;
          return data;
        } catch (err) {
          logger.error(
            `Retry ${retry + 1}/${maxRetries} failed for URL: ${url}`,
            (err as Error).message,
          );
        }
      }
    }
    throw new Error('All FIO History URLs failed');
  }
}

const ORDER_SUCCESS_STATUS = 7; // DONE
const TX_SUCCESS_STATUS = BlockchainTransaction.STATUS.SUCCESS; // SUCCESS

async function checkMissingTransactions(): Promise<{
  success: boolean;
  missingTransactionsCount?: number;
  orderIds?: number[];
  message: string;
  error?: string;
}> {
  try {
    logger.info(`Starting ${JOB_NAME}...`);

    // Set date to current date minus specified minutes
    const thresholdMinutes = parseInt(TIME_THRESHOLD_MINUTES as string);

    if (!TIME_THRESHOLD_MINUTES || isNaN(thresholdMinutes) || thresholdMinutes <= 0) {
      throw new Error(
        `Invalid MISSING_TX_TIME_THRESHOLD_MINUTES: "${TIME_THRESHOLD_MINUTES}". Must be a positive number.`,
      );
    }

    const thresholdTime = new Date(Date.now() - thresholdMinutes * 60 * 1000);

    logger.info(`Checking orders from ${thresholdTime.toISOString()} onwards`);

    // Get FIO History API URLs (v2) from database
    let fioApiUrlsResult;
    try {
      fioApiUrlsResult = await pool.query(`
        SELECT url FROM "fio-api-urls" WHERE type = 'DASHBOARD_HISTORY_URL' ORDER BY rank DESC
      `);
    } catch (dbError) {
      throw new Error(`Database connection failed: ${(dbError as Error).message}`);
    }

    const fioApiUrls = fioApiUrlsResult.rows as FioHistoryApiUrl[];

    if (!fioApiUrls || fioApiUrls.length === 0) {
      throw new Error('No FIO History v2 URLs configured in database');
    }

    const fioHistoryUrls = fioApiUrls.map((row) => row.url);
    logger.info(`Using FIO History URLs: ${fioHistoryUrls.join(', ')}`);

    const fioHistory = new FioHistory({ fioHistoryUrls });

    // Query orders from last hour with success status and successful tx status
    const query = `
      SELECT DISTINCT
        o.id as "orderId",
        o.number as "orderNumber",
        o."createdAt" as "orderCreatedAt",
        oi.id as "orderItemId",
        oi.action as "orderItemAction",
        bt."txId" as "transactionId",
        bt.id as "blockchainTransactionId",
        bt."createdAt" as "transactionCreatedAt"
      FROM orders o
      INNER JOIN "order-items" oi ON o.id = oi."orderId"
      INNER JOIN "order-items-status" ois ON oi.id = ois."orderItemId"
      INNER JOIN "blockchain-transactions" bt ON ois."blockchainTransactionId" = bt.id
      WHERE 
        o.status = $1
        AND ois."txStatus" = $2
        AND o."createdAt" >= $3
        AND bt."txId" IS NOT NULL
        AND bt."txId" != ''
        AND o."deletedAt" IS NULL
        AND oi."deletedAt" IS NULL
      ORDER BY o."createdAt" DESC
    `;

    let queryResult;
    try {
      queryResult = await pool.query(query, [
        ORDER_SUCCESS_STATUS,
        TX_SUCCESS_STATUS,
        thresholdTime,
      ]);
    } catch (dbError) {
      throw new Error(`Failed to query transactions: ${(dbError as Error).message}`);
    }
    const results = queryResult.rows;

    logger.info(`Found ${results.length} transactions to check`);

    if (results.length === 0) {
      logger.info('No transactions found matching criteria');
      return {
        success: true,
        missingTransactionsCount: 0,
        orderIds: [],
        message: 'No transactions found matching criteria',
      };
    }

    const missingTransactions: MissingTransaction[] = [];
    let checkedCount = 0;
    const CHUNK_SIZE = 20; // Process 20 transactions in parallel per chunk

    // Split results into chunks for parallel processing
    const chunks: MissingTransaction[][] = [];
    for (let i = 0; i < results.length; i += CHUNK_SIZE) {
      chunks.push(results.slice(i, i + CHUNK_SIZE));
    }

    logger.info(
      `Processing ${results.length} transactions in ${chunks.length} chunks of ${CHUNK_SIZE}`,
    );

    // Process each chunk in parallel
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];

      logger.info(
        `Processing chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} transactions)`,
      );

      // Process all transactions in this chunk in parallel
      const chunkPromises = chunk.map(async (row: MissingTransaction) => {
        try {
          checkedCount++;
          const currentCount = checkedCount;

          // Check if transaction exists in FIO chain
          const fioHistoryResult = await fioHistory.getTransaction({
            transactionId: row.transactionId,
            maxRetries: 3,
          });

          // If transaction doesn't exist or has error, it's missing
          if (!fioHistoryResult || (fioHistoryResult && !fioHistoryResult.executed)) {
            logger.warn(
              `❌ Missing transaction ${currentCount}/${results.length}: ${row.transactionId} (Order: ${row.orderNumber})`,
            );

            return {
              orderId: row.orderId,
              orderNumber: row.orderNumber,
              orderCreatedAt: row.orderCreatedAt,
              orderItemId: row.orderItemId,
              orderItemAction: row.orderItemAction,
              transactionId: row.transactionId,
              blockchainTransactionId: row.blockchainTransactionId,
              transactionCreatedAt: row.transactionCreatedAt,
              error: 'Transaction not found in chain',
            };
          } else {
            return null; // Transaction found, not missing
          }
        } catch (error) {
          logger.error(
            `Error checking transaction ${row.transactionId}:`,
            (error as Error).message,
          );

          return {
            orderId: row.orderId,
            orderNumber: row.orderNumber,
            orderCreatedAt: row.orderCreatedAt,
            orderItemId: row.orderItemId,
            orderItemAction: row.orderItemAction,
            transactionId: row.transactionId,
            blockchainTransactionId: row.blockchainTransactionId,
            transactionCreatedAt: row.transactionCreatedAt,
            error: (error as Error).message || 'Unknown error',
          };
        }
      });

      // Wait for all transactions in this chunk to complete
      const chunkResults = await Promise.all(chunkPromises);

      // Add missing transactions to the main array
      chunkResults.forEach((result) => {
        if (result !== null) {
          missingTransactions.push(result);
        }
      });

      // Wait 300ms before processing next chunk (except for the last chunk)
      if (chunkIndex < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    logger.info(
      `Check completed. Found ${missingTransactions.length} missing transactions out of ${results.length} checked.`,
    );

    // Extract unique order IDs from missing transactions
    const orderIds = [...new Set(missingTransactions.map((tx) => tx.orderId))];

    if (missingTransactions.length > 0) {
      // Create a message for Discord notification
      const message = `Found ${missingTransactions.length} missing transactions from the last ${TIME_THRESHOLD_MINUTES} minutes`;
      const fields = missingTransactions.slice(0, 10).map((tx) => ({
        name: `Order: ${tx.orderNumber || 'Unknown'}`,
        value: `TX ID: ${tx.transactionId || 'Unknown'}\nError: ${tx.error || 'Unknown error'}`,
        inline: false,
      }));

      if (missingTransactions.length > 10) {
        fields.push({
          name: 'Additional Missing Transactions',
          value: `... and ${missingTransactions.length - 10} more missing transactions`,
          inline: false,
        });
      }

      logger.warn(`⚠️ ${JOB_NAME} Alert`, {
        message,
        count: missingTransactions.length,
        orderIds,
      });

      // Send notification to Discord
      await discordNotifier.sendNotification(message, {
        title: '🚨 Missing Transactions Alert',
        level: 'error',
        fields,
      });
    }

    return {
      success: true,
      missingTransactionsCount: missingTransactions.length,
      orderIds,
      message:
        missingTransactions.length > 0
          ? `Found ${missingTransactions.length} missing transactions`
          : 'No missing transactions found',
    };
  } catch (error) {
    logger.error(`Error in ${JOB_NAME}`, error);

    // Send notification to Discord
    await discordNotifier.sendNotification('Error checking missing transactions', {
      title: '⚠️ There is an issue during missing transactions check',
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
      message: 'Failed to check missing transactions',
    };
  }
}

// Execute the function
checkMissingTransactions().then((result) => {
  // This will be sent to the worker message handler
  if (result.success) {
    logger.info(`Job ${JOB_NAME} completed successfully`, result);

    // Output order IDs for external consumption (like the original script)
    // Only output if there are missing transactions
    if (result.orderIds && result.orderIds.length > 0) {
      console.log(JSON.stringify(result.orderIds));
    }
  } else {
    logger.error(`Job ${JOB_NAME} failed`, result);
    process.exit(1);
  }
});
