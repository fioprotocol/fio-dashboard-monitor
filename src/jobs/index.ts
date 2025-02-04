import Bree from 'bree';
import path from 'path';
import logger from '../config/logger';

// Initialize Bree
const bree = new Bree({
  root: false, // Disable default root directory lookup
  jobs: [
    {
      name: 'pending-txs',
      path: path.join(__dirname, 'pending-txs.ts'),
      interval: '5m', // Runs every 5 minutes
      timeout: '2m', // Job will be terminated if it runs longer than 2 minutes
    },
    {
      name: 'no-txs',
      path: path.join(__dirname, 'no-txs.ts'),
      interval: '5m', // Runs every 5 minutes
      timeout: '2m', // Job will be terminated if it runs longer than 2 minutes
    },
  ],
  // Add TypeScript support
  worker: {
    workerData: {
      tsconfig: path.join(process.cwd(), 'tsconfig.json'),
    },
    execArgv: ['--require', 'ts-node/register']
  },
  workerMessageHandler: message => {
    logger.info('JOB MESSAGE === ', message || '');
  },
});

// Start all jobs
export const startJobs = () => {
  bree.start();
  bree.run('no-txs'); // Run no-txs immediately
  bree.run('pending-txs'); // Run pending-txs immediately
};
