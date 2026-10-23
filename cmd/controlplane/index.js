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
  res.json({ status: 'ok', traceId: req.traceId });
});

app.get('/readyz', (req, res) => {
  res.json({ status: 'ready', traceId: req.traceId });
});

app.get('/version', (req, res) => {
  res.json({
    version: process.env.npm_package_version || '0.1.0-foundation',
    build: process.env.BUILD_VERSION || 'dev',
    traceId: req.traceId,
  });
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
  logger.info('Control plane started', {
    port: config.port,
    host: config.host,
    env: config.env,
  });
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Control plane stopped');
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { message: err.message, stack: err.stack });
  process.exit(1);
});

module.exports = app;
