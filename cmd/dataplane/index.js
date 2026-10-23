#!/usr/bin/env node
const { loadConfig, validateConfig } = require('@minicloud/config');
const { logger } = require('@minicloud/logging');
const { traceMiddleware } = require('@minicloud/tracing');

const config = loadConfig();
const validationErrors = validateConfig(config);
if (validationErrors.length > 0) {
  logger.error('Configuration validation failed', { errors: validationErrors });
  process.exit(1);
}

const express = require('express');
const app = express();

app.use(express.json());
app.use(traceMiddleware());

app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', agent: 'dataplane', traceId: req.traceId });
});

app.get('/readyz', (req, res) => {
  res.json({ status: 'ready', agent: 'dataplane', traceId: req.traceId });
});

app.post('/agent/register', (req, res) => {
  const { nodeId, hostname, resources } = req.body;
  logger.info('Agent registered', { traceId: req.traceId, nodeId, hostname, resources });
  res.json({ success: true, nodeId, status: 'registered' });
});

app.post('/agent/heartbeat', (req, res) => {
  const { nodeId } = req.body;
  logger.debug('Agent heartbeat', { traceId: req.traceId, nodeId });
  res.json({ success: true, nodeId, status: 'alive' });
});

app.use((err, req, res) => {
  logger.error(err.message, { traceId: req.traceId, stack: err.stack });
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.code || 'INTERNAL_ERROR',
    message: err.message,
    traceId: req.traceId,
  });
});

const server = app.listen(config.port, config.host, () => {
  logger.info('Data plane agent started', {
    port: config.port,
    host: config.host,
    env: config.env,
  });
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Data plane agent stopped');
    process.exit(0);
  });
});

module.exports = app;
