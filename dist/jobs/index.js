"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startJobs = void 0;
const bree_1 = __importDefault(require("bree"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("../config/logger"));
// Initialize Bree
const bree = new bree_1.default({
    root: false, // Disable default root directory lookup
    jobs: [
        {
            name: 'pending-txs',
            path: path_1.default.join(__dirname, 'pending-txs.ts'),
            interval: process.env.PENDING_TX_TIME_INTERVAL,
            timeout: '2m', // Job will be terminated if it runs longer than 2 minutes
        },
        {
            name: 'no-txs',
            path: path_1.default.join(__dirname, 'no-txs.ts'),
            interval: process.env.NO_TX_TIME_INTERVAL,
            timeout: '2m', // Job will be terminated if it runs longer than 2 minutes
        },
    ],
    // Add TypeScript support
    worker: {
        workerData: {
            tsconfig: path_1.default.join(process.cwd(), 'tsconfig.json'),
        },
        execArgv: ['--require', 'ts-node/register']
    },
    workerMessageHandler: message => {
        logger_1.default.info('JOB MESSAGE === ', message || '');
    },
});
// Start all jobs
const startJobs = () => {
    bree.start();
    bree.run('no-txs'); // Run no-txs immediately
    bree.run('pending-txs'); // Run pending-txs immediately
};
exports.startJobs = startJobs;
