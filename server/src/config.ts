import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/auction_db',
  sessionTimeoutMs: parseInt(process.env.SESSION_TIMEOUT_MS || '1800000', 10), // 30 minutes
  timerInterval: 100, // milliseconds between timer ticks
  defaultTimerLength: 20, // seconds
};

export const isDevelopment = config.nodeEnv === 'development';
export const isProduction = config.nodeEnv === 'production';
