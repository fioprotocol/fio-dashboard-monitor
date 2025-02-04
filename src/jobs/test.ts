import '../config/env';
import { pool } from '../config/database';
import logger from '../config/logger';
import { discordNotifier } from '../services/discord';

async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    const timestamp = result.rows[0].now;
    logger.info('Database connected', { timestamp });
    
    await discordNotifier.sendNotification('Database Connection Test', {
      title: '✅ Database Connection Successful',
      level: 'info',
      fields: [
        { name: 'Timestamp', value: timestamp.toString(), inline: true },
        { name: 'Status', value: 'Connected', inline: true }
      ]
    });
  } catch (error) {
    logger.error('Database connection error', { error });
    
    await discordNotifier.sendNotification('Database Connection Test', {
      title: '❌ Database Connection Failed',
      level: 'error',
      fields: [
        { name: 'Error', value: (error as Error).message, inline: false },
        { name: 'Timestamp', value: new Date().toISOString(), inline: true }
      ]
    });
  }
}

// This function will be called by Bree
(async () => {
  logger.info('Running job...', { timestamp: new Date().toISOString() });
  await testConnection();
})();
