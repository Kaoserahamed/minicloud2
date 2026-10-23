const { Pool } = require('pg');
const { logger } = require('@minicloud/logging');

let pool = null;

function createPool(connectionString) {
  if (pool) {
    return pool;
  }
  pool = new Pool({ connectionString });
  pool.on('connect', () => {
    logger.info('Database pool connected');
  });
  pool.on('error', (err) => {
    logger.error('Database pool idle error', { message: err.message });
  });
  return pool;
}

function getPool() {
  return pool;
}

async function query(text, params) {
  if (!pool) {
    return { rows: [], rowCount: 0 };
  }
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.http('DB query', { duration, text: text.slice(0, 100) });
    return res;
  } catch (err) {
    logger.error('DB query failed', { message: err.message, text: text.slice(0, 100) });
    throw err;
  }
}

async function end() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = { createPool, getPool, query, end };
