import Bree from 'bree';
import path from 'path';
import logger from '../config/logger';
import { isDevelopment, envConfig } from '../utils/env';

const BREE_CONFIG: Bree.BreeOptions = {
  root: false, // Disable default root directory lookup
  jobs: [
    {
      name: 'pending-txs',
      // Use .js extension and handle both dev and prod environments
      path: path.join(__dirname, `pending-txs.${isDevelopment() ? 'ts' : 'js'}`),
      interval: envConfig.PENDING_TX_TIME_INTERVAL,
      timeout: '2m', // Job will be terminated if it runs longer than 2 minutes
    },
    {
      name: 'no-txs',
      // Use .js extension and handle both dev and prod environments
      path: path.join(__dirname, `no-txs.${isDevelopment() ? 'ts' : 'js'}`),
      interval: envConfig.NO_TX_TIME_INTERVAL,
      timeout: '2m', // Job will be terminated if it runs longer than 2 minutes
    },
    {
      name: 'tx-errors-check',
      path: path.join(__dirname, `tx-errors-check.${isDevelopment() ? 'ts' : 'js'}`),
      interval: envConfig.TX_ERRORS_TIME_INTERVAL,
      timeout: '2m',
    },
    {
      name: 'aws-logs-check',
      path: path.join(__dirname, `aws-logs-check.${isDevelopment() ? 'ts' : 'js'}`),
      interval: envConfig.AWS_LOGS_TIME_INTERVAL,
      timeout: '2m',
    },
    {
      name: 'missing-txs-check',
      path: path.join(__dirname, `missing-txs-check.${isDevelopment() ? 'ts' : 'js'}`),
      interval: envConfig.MISSING_TX_TIME_INTERVAL,
      timeout: '2m',
    },
  ],
  // Conditionally add TypeScript support only in development
  worker: isDevelopment()
    ? {
        workerData: {
          tsconfig: path.join(process.cwd(), 'tsconfig.json'),
        },
        execArgv: ['--require', 'ts-node/register'],
      }
    : undefined,
  workerMessageHandler: (message) => {
    logger.info('JOB MESSAGE === ', message || '');
  },
};

// Initialize Bree
const bree = new Bree(BREE_CONFIG);

// Start specific job or all jobs
export const startJobs = (jobName?: string): void => {
  if (jobName) {
    // Validate job name
    const validJobs = (BREE_CONFIG.jobs as Bree.JobOptions[])?.map((job) => job.name) || [];
    if (!validJobs.includes(jobName)) {
      throw new Error(`Invalid job name: ${jobName}. Valid jobs are: ${validJobs.join(', ')}`);
    }

    // Start the scheduler for the specific job
    bree.start(jobName);
    bree.run(jobName);
    logger.info(`Started single job: ${jobName}`);
    return;
  }

  // Start all jobs if no specific job specified
  bree.start();
  bree.run('no-txs');
  bree.run('pending-txs');
  bree.run('tx-errors-check');
  bree.run('aws-logs-check');
  bree.run('missing-txs-check');
};
