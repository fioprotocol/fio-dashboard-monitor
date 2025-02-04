"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
require("./config/env");
const jobs_1 = require("./jobs");
const logger_1 = __importDefault(require("./config/logger"));
const run = async () => {
    logger_1.default.info('Starting application...');
    (0, jobs_1.startJobs)();
};
exports.run = run;
(0, exports.run)().catch((error) => {
    logger_1.default.error('Application failed to start', { error });
    process.exit(1);
});
