import Bree from 'bree';
import path from 'path';
import logger from '../config/logger';
import { isDevelopment } from '../utils/env';

const BREE_CONFIG: Bree.BreeOptions = {
  root: false, // Disable default root directory lookup
  jobs: [
    {
      name: 'pending-txs',
      // Use .js extension and handle both dev and prod environments
      path: path.join(__dirname, isDevelopment() ? 'pending-txs.ts' : 'pending-txs.js'),
      interval: process.env.PENDING_TX_TIME_INTERVAL,
      timeout: '2m', // Job will be terminated if it runs longer than 2 minutes
    },
    {
      name: 'no-txs',
      // Use .js extension and handle both dev and prod environments
      path: path.join(__dirname, isDevelopment() ? 'no-txs.ts' : 'no-txs.js'),
      interval: process.env.NO_TX_TIME_INTERVAL,
      timeout: '2m', // Job will be terminated if it runs longer than 2 minutes
    },
    {
      name: 'tx-errors-check',
      path: path.join(__dirname, isDevelopment() ? 'tx-errors-check.ts' : 'tx-errors-check.js'),
      interval: process.env.TX_ERRORS_TIME_INTERVAL,
      timeout: '2m',
    },
  ],
  // Conditionally add TypeScript support only in development
  worker: isDevelopment()
    ? {
        workerData: {
          tsconfig: path.join(process.cwd(), 'tsconfig.json'),
        },
        execArgv: ['--require', 'ts-node/register']
      }
    : undefined,
  workerMessageHandler: message => {
    logger.info('JOB MESSAGE === ', message || '');
  },
};

// Initialize Bree
const bree = new Bree(BREE_CONFIG);

// Start specific job or all jobs
export const startJobs = (jobName?: string) => {
  if (jobName) {
    // Validate job name
    const validJobs = (BREE_CONFIG.jobs as Bree.JobOptions[])?.map(job => job.name) || [];
    if (!validJobs.includes(jobName)) {
      throw new Error(`Invalid job name: ${jobName}. Valid jobs are: ${validJobs.join(', ')}`);
    }
    
    bree.start();
    bree.run(jobName);
    logger.info(`Started single job: ${jobName}`);
    return;
  }

  // Start all jobs if no specific job specified
  bree.start();
  bree.run('no-txs');
  bree.run('pending-txs');
  bree.run('tx-errors-check');
};
