import { Pool } from 'pg';
import { envConfig } from '../utils/env';

const dbConfig = {
  user: envConfig.DB_USER,
  host: envConfig.DB_HOST,
  database: envConfig.DB_NAME,
  password: envConfig.DB_PASSWORD,
  port: parseInt(envConfig.DB_PORT || '5432'),
};

export const pool = new Pool(dbConfig);
