const fs = require('fs');
const path = require('path');
const { query } = require('./pool');
const { logger } = require('@minicloud/logging');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

function listMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

async function ensureMigrationsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

async function getAppliedVersions() {
  const res = await query('SELECT version FROM schema_migrations ORDER BY version');
  return res.rows.map((r) => r.version);
}

async function runMigrations() {
  await ensureMigrationsTable();
  const appliedVersions = await getAppliedVersions();
  const files = listMigrationFiles();
  let appliedCount = 0;
  for (const file of files) {
    if (appliedVersions.includes(file)) {
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const client = await require('./pool').getPool().connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
      await client.query('COMMIT');
      appliedCount++;
      logger.info('Migration applied', { migration: file });
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error('Migration failed', { migration: file, message: err.message });
      throw err;
    } finally {
      client.release();
    }
  }
  return appliedCount;
}

async function rollbackLastMigration() {
  await ensureMigrationsTable();
  const appliedVersions = await getAppliedVersions();
  const lastApplied = [...appliedVersions].sort().pop();
  if (!lastApplied) {
    logger.info('No migrations to rollback');
    return 0;
  }
  const downFile = path.join(MIGRATIONS_DIR, lastApplied.replace(/\.sql$/, '.down.sql'));
  if (!fs.existsSync(downFile)) {
    throw new Error(`No down migration for ${lastApplied}`);
  }
  const sql = fs.readFileSync(downFile, 'utf8');
  const client = await require('./pool').getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('DELETE FROM schema_migrations WHERE version = $1', [lastApplied]);
    await client.query('COMMIT');
    logger.info('Migration rolled back', { migration: lastApplied });
    return 1;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { runMigrations, rollbackLastMigration, listMigrationFiles };
