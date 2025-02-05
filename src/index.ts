import './config/env';
import { startJobs } from './jobs';
import logger from './config/logger';

export const run = async () => {
  logger.info('Starting application...');
  startJobs();
};

run().catch((error) => {
  logger.error('Application failed to start', { error });
  process.exit(1);
});
