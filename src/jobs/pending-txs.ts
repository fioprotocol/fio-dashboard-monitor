import '../config/env';
import { pool } from '../config/database';
import { discordNotifier } from '../services/discord';
import logger from '../config/logger';
import { Payment, ReferrerProfile, BlockchainTransaction } from '../models';

const JOB_NAME = 'PENDING-TXs';
const LIMIT = 30;
const TIME_THRESHOLD_MINUTES = process.env.PENDING_TX_TIME_THRESHOLD_MINUTES;

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
    const result = await pool.query(pendingOrderItemsQuery, [
      Payment.SPENT_TYPE.ORDER,
      ReferrerProfile.TYPE.REF,
      Payment.STATUS.COMPLETED,
      BlockchainTransaction.STATUS.READY,
      LIMIT,
    ]);
    const pendingTxs = result.rows;

    if (pendingTxs.length > 0) {
      // Create a message for Discord notification
      const message = 'Found pending transactions older than 30 minutes';
      const fields = pendingTxs.map((tx) => ({
        name: `Order item ID: ${tx.id}`,
        value: `Order: ${tx.number}, Ready status set at: ${new Date(tx.updatedAt).toISOString()}`,
        inline: false,
      }));

      logger.warn(`⚠️ ${JOB_NAME} Alert`, {
        message,
        count: pendingTxs.length,
        transactions: fields,
      });

      // Send notification to Discord
      await discordNotifier.sendNotification(message, {
        title: '⚠️ Pending Transactions Alert',
        level: 'warning',
        fields,
      });
    }

    return {
      success: true,
      pendingTransactionsCount: pendingTxs.length,
      message:
        pendingTxs.length > 0 ? 'Found pending transactions' : 'No pending transactions found',
    };
  } catch (error) {
    logger.error(`Error checking ${JOB_NAME}`, error);

    // Send notification to Discord
    await discordNotifier.sendNotification('Error checking pending transactions', {
      title: '⚠️ There is an issue during pending transactions check',
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
      message: 'Failed to check pending transactions',
    };
  }
}

// Execute the function
checkPendingTransactions().then((result) => {
  // This will be sent to the worker message handler
  if (result.success) {
    logger.info(`Job ${JOB_NAME} completed successfully`, result);
  } else {
    logger.error(`Job ${JOB_NAME} failed`);
  }
});
