"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startJobs = void 0;
const bree_1 = __importDefault(require("bree"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("../config/logger"));
const env_1 = require("../utils/env");
const BREE_CONFIG = {
    root: false, // Disable default root directory lookup
    jobs: [
        {
            name: 'pending-txs',
            // Use .js extension and handle both dev and prod environments
            path: path_1.default.join(__dirname, (0, env_1.isDevelopment)() ? 'pending-txs.ts' : 'pending-txs.js'),
            interval: process.env.PENDING_TX_TIME_INTERVAL,
            timeout: '2m', // Job will be terminated if it runs longer than 2 minutes
        },
        {
            name: 'no-txs',
            // Use .js extension and handle both dev and prod environments
            path: path_1.default.join(__dirname, (0, env_1.isDevelopment)() ? 'no-txs.ts' : 'no-txs.js'),
            interval: process.env.NO_TX_TIME_INTERVAL,
            timeout: '2m', // Job will be terminated if it runs longer than 2 minutes
        },
        {
            name: 'tx-errors-check',
            path: path_1.default.join(__dirname, (0, env_1.isDevelopment)() ? 'tx-errors-check.ts' : 'tx-errors-check.js'),
            interval: process.env.TX_ERRORS_TIME_INTERVAL,
            timeout: '2m',
        },
    ],
    // Conditionally add TypeScript support only in development
    worker: (0, env_1.isDevelopment)()
        ? {
            workerData: {
                tsconfig: path_1.default.join(process.cwd(), 'tsconfig.json'),
            },
            execArgv: ['--require', 'ts-node/register']
        }
        : undefined,
    workerMessageHandler: message => {
        logger_1.default.info('JOB MESSAGE === ', message || '');
    },
};
// Initialize Bree
const bree = new bree_1.default(BREE_CONFIG);
// Start specific job or all jobs
const startJobs = (jobName) => {
    var _a;
    if (jobName) {
        // Validate job name
        const validJobs = ((_a = BREE_CONFIG.jobs) === null || _a === void 0 ? void 0 : _a.map(job => job.name)) || [];
        if (!validJobs.includes(jobName)) {
            throw new Error(`Invalid job name: ${jobName}. Valid jobs are: ${validJobs.join(', ')}`);
        }
        bree.start();
        bree.run(jobName);
        logger_1.default.info(`Started single job: ${jobName}`);
        return;
    }
    // Start all jobs if no specific job specified
    bree.start();
    bree.run('no-txs');
    bree.run('pending-txs');
    bree.run('tx-errors-check');
};
exports.startJobs = startJobs;
