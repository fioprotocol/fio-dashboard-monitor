"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
const pg_1 = require("pg");
const env_1 = require("../utils/env");
const dbConfig = {
    user: env_1.envConfig.DB_USER,
    host: env_1.envConfig.DB_HOST,
    database: env_1.envConfig.DB_NAME,
    password: env_1.envConfig.DB_PASSWORD,
    port: parseInt(env_1.envConfig.DB_PORT || '5432'),
};
exports.pool = new pg_1.Pool(dbConfig);
