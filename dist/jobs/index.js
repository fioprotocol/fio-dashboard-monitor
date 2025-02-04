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
// Start all jobs
const startJobs = () => {
    bree.start();
    bree.run('no-txs'); // Run no-txs immediately
    bree.run('pending-txs'); // Run pending-txs immediately
};
exports.startJobs = startJobs;
