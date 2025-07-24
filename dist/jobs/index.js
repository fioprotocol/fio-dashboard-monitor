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
            path: path_1.default.join(__dirname, `pending-txs.${(0, env_1.isDevelopment)() ? 'ts' : 'js'}`),
            interval: env_1.envConfig.PENDING_TX_TIME_INTERVAL,
            timeout: '2m', // Job will be terminated if it runs longer than 2 minutes
        },
        {
            name: 'no-txs',
            // Use .js extension and handle both dev and prod environments
            path: path_1.default.join(__dirname, `no-txs.${(0, env_1.isDevelopment)() ? 'ts' : 'js'}`),
            interval: env_1.envConfig.NO_TX_TIME_INTERVAL,
            timeout: '2m', // Job will be terminated if it runs longer than 2 minutes
        },
        {
            name: 'tx-errors-check',
            path: path_1.default.join(__dirname, `tx-errors-check.${(0, env_1.isDevelopment)() ? 'ts' : 'js'}`),
            interval: env_1.envConfig.TX_ERRORS_TIME_INTERVAL,
            timeout: '2m',
        },
        {
            name: 'aws-logs-check',
            path: path_1.default.join(__dirname, `aws-logs-check.${(0, env_1.isDevelopment)() ? 'ts' : 'js'}`),
            interval: env_1.envConfig.AWS_LOGS_TIME_INTERVAL,
            timeout: '2m',
        },
    ],
    // Conditionally add TypeScript support only in development
    worker: (0, env_1.isDevelopment)()
        ? {
            workerData: {
                tsconfig: path_1.default.join(process.cwd(), 'tsconfig.json'),
            },
            execArgv: ['--require', 'ts-node/register'],
        }
        : undefined,
    workerMessageHandler: (message) => {
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
        const validJobs = ((_a = BREE_CONFIG.jobs) === null || _a === void 0 ? void 0 : _a.map((job) => job.name)) || [];
        if (!validJobs.includes(jobName)) {
            throw new Error(`Invalid job name: ${jobName}. Valid jobs are: ${validJobs.join(', ')}`);
        }
        // Start the scheduler for the specific job
        bree.start(jobName);
        bree.run(jobName);
        logger_1.default.info(`Started single job: ${jobName}`);
        return;
    }
    // Start all jobs if no specific job specified
    bree.start();
    bree.run('no-txs');
    bree.run('pending-txs');
    bree.run('tx-errors-check');
    bree.run('aws-logs-check');
};
exports.startJobs = startJobs;
