import './config/env';
import { startJobs } from './jobs';
import logger from './config/logger';

export const run = async (): Promise<void> => {
  logger.info('Starting application...');

  let jobName;

  if (process.argv.includes('--job')) {
    jobName = process.argv[process.argv.indexOf('--job') + 1];
    if (!jobName) {
      console.error('Please specify a job name');
      process.exit(1);
    }
  }

  startJobs(jobName);
};

run().catch((error) => {
  logger.error('Application failed to start', { error });
  process.exit(1);
});
