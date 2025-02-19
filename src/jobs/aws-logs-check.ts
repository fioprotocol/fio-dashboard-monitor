import '../config/env';
import { CloudWatchLogs } from '@aws-sdk/client-cloudwatch-logs';
import logger from '../config/logger';
import { discordNotifier } from '../services/discord';
import { isDevelopment, envConfig } from '../utils/env';

const JOB_NAME = 'AWS-LOGS';
const TIME_THRESHOLD_MINUTES = envConfig.AWS_LOGS_TIME_THRESHOLD_MINUTES;
const ERRORS = JSON.parse(envConfig.AWS_LOGS_ERROR_PATTERNS_JSON as string);
const THRESHOLD_LIMIT = parseInt(envConfig.AWS_LOGS_THRESHOLD_LIMIT as string);

const config: {
  region?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
} = {
  region: envConfig.AWS_REGION,
};
if (isDevelopment()) {
  config.credentials = {
    accessKeyId: envConfig.AWS_ACCESS_KEY_ID!,
    secretAccessKey: envConfig.AWS_SECRET_ACCESS_KEY!,
    sessionToken: envConfig.AWS_SESSION_TOKEN!,
  };
}
// Initialize CloudWatch Logs client
const cloudWatchLogs = new CloudWatchLogs(config);

async function checkAwsLogs() {
  try {
    const endTime = new Date();
    const startTime = new Date(
      endTime.getTime() - parseInt(TIME_THRESHOLD_MINUTES as string) * 60 * 1000,
    );

    for (const error of ERRORS) {
      const response = await cloudWatchLogs.filterLogEvents({
        logGroupName: envConfig.AWS_LOG_GROUP_NAME,
        startTime: startTime.getTime(),
        endTime: endTime.getTime(),
        filterPattern: error,
      });

      const errorLogs = response.events || [];

      if (errorLogs.length > THRESHOLD_LIMIT) {
        const message = `Found ${errorLogs.length} error logs in the last ${TIME_THRESHOLD_MINUTES} minutes`;
        const fields = errorLogs
          .slice(0, 25) // Limit to 25 fields for Discord
          .map((log, index) => ({
            name: `Error Log ${index + 1}`,
            value: `${log.message}\nTimestamp: ${new Date(log.timestamp || 0).toISOString()}`,
            inline: false,
          }));

        logger.warn(`⚠️ ${JOB_NAME} Alert`, {
          message,
          count: errorLogs.length,
          logs: fields,
        });

        await discordNotifier.sendNotification(message, {
          title: '⚠️ AWS Logs Error Alert',
          level: 'warning',
          fields,
        });
      }
    }

    return {
      success: true,
    };
  } catch (error) {
    // Enhanced error logging
    console.error('Full error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
      details: error, // Log the full error object
    });

    logger.error(`Error checking ${JOB_NAME}`, {
      error: error,
      logGroup: envConfig.AWS_LOG_GROUP_NAME,
      region: envConfig.AWS_REGION,
    });

    await discordNotifier.sendNotification('Error checking AWS logs', {
      title: '⚠️ Error during AWS logs check',
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
      message: 'Failed to check AWS logs',
    };
  }
}

// Execute the function
checkAwsLogs().then((result) => {
  if (result.success) {
    logger.info(`Job ${JOB_NAME} completed successfully`, result);
  } else {
    logger.error(`Job ${JOB_NAME} failed`);
  }
});
