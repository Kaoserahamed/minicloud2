const express = require('express');
const { logger } = require('@minicloud/logging');
const { traceMiddleware, getTraceId } = require('@minicloud/tracing');
const { authMiddleware, requirePermission, requireRole, issueJWT } = require('./auth');
const { DatabaseService } = require('@minicloud/internal-database');

const db = new DatabaseService();

function quotaMiddleware(resource) {
  return async function enforceQuota(req, res, next) {
    const projectId = req.body.project_id || req.query.project_id;
    if (!projectId) {
      return next();
    }
    try {
      const requested =
        resource === 'instance'
          ? {
              instances: 1,
              cpu: req.body.cpu || 1,
              ramMb: req.body.ramMb || 512,
              storageGb: req.body.storageGb || 10,
            }
          : {};
      const { allowed, violations } = await db.checkProjectQuota(projectId, requested);
      if (!allowed) {
        return res.status(403).json({
          success: false,
          error: 'QUOTA_EXCEEDED',
          message: `Quota exceeded for project ${projectId}`,
          violations,
          traceId: getTraceId(req),
        });
      }
    } catch (err) {
      logger.error('Quota check failed', { message: err.message, projectId });
      return next();
    }
    next();
  };
}

function createRouter() {
  const router = express.Router();

  router.use(express.json());
  router.use(traceMiddleware());
  router.use((req, res, next) => {
    logger.http(`${req.method} ${req.originalUrl}`, {
      traceId: getTraceId(req),
      ip: req.ip,
    });
    next();
  });

  router.get('/healthz', (req, res) => {
    res.json({ status: 'ok', traceId: getTraceId(req) });
  });

  router.get('/readyz', (req, res) => {
    res.json({ status: 'ready', traceId: getTraceId(req) });
  });

  router.get('/version', (req, res) => {
    res.json({
      version: process.env.npm_package_version || '0.1.0-foundation',
      build: process.env.BUILD_VERSION || 'dev',
      traceId: getTraceId(req),
    });
  });

  router.post('/auth/tokens', authMiddleware(), (req, res) => {
    const { api_key } = req.body;
    if (!api_key) {
      return res.status(400).json({ success: false, error: 'api_key required' });
    }
    const { token } = issueJWT('user-' + api_key.slice(-8), 'user');
    res.json({ access_token: token, token_type: 'Bearer', expires_in: 86400 });
  });

  router.get('/projects', authMiddleware(), requirePermission('compute:read'), (req, res) => {
    res.json({ projects: [], traceId: getTraceId(req) });
  });

  router.post(
    '/projects',
    authMiddleware(),
    requirePermission('compute:write'),
    quotaMiddleware('project'),
    (req, res) => {
      res
        .status(201)
        .json({ id: 'proj_' + Date.now(), name: req.body.name, traceId: getTraceId(req) });
    }
  );

  router.get('/projects/:id', authMiddleware(), requirePermission('compute:read'), (req, res) => {
    res.json({ id: req.params.id, name: 'Project', traceId: getTraceId(req) });
  });

  router.delete('/projects/:id', authMiddleware(), requireRole('admin'), (req, res) => {
    res.status(204).end();
  });

  router.get('/instances', authMiddleware(), requirePermission('compute:read'), (req, res) => {
    res.json({ instances: [], traceId: getTraceId(req) });
  });

  router.post(
    '/instances',
    authMiddleware(),
    requirePermission('compute:write'),
    quotaMiddleware('instance'),
    (req, res) => {
      res.status(201).json({
        id: 'inst_' + Date.now(),
        name: req.body.name,
        project_id: req.body.project_id,
        state: 'pending',
        region: req.body.region,
        traceId: getTraceId(req),
      });
    }
  );

  router.get('/buckets', authMiddleware(), requirePermission('storage:read'), (req, res) => {
    res.json({ buckets: [], traceId: getTraceId(req) });
  });

  router.get('/vpcs', authMiddleware(), requirePermission('network:read'), (req, res) => {
    res.json({ vpcs: [], traceId: getTraceId(req) });
  });

  router.get('/dns/zones', authMiddleware(), requirePermission('dns:read'), (req, res) => {
    res.json({ zones: [], traceId: getTraceId(req) });
  });

  router.get('/regions', authMiddleware(), requirePermission('compute:read'), (req, res) => {
    res.json({
      regions: ['us-east-1', 'us-west-2', 'eu-west-1'],
      traceId: getTraceId(req),
    });
  });

  router.get(
    '/regions/:region/zones',
    authMiddleware(),
    requirePermission('compute:read'),
    (req, res) => {
      const zones = { 'us-east-1': ['a', 'b'], 'us-west-2': ['a'], 'eu-west-1': ['a'] };
      res.json({
        region: req.params.region,
        zones: (zones[req.params.region] || []).map((z) => `${req.params.region}${z}`),
        traceId: getTraceId(req),
      });
    }
  );

  router.use((err, req, res, _next) => {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || err,
      traceId: getTraceId(req),
    });
  });

  return router;
}

module.exports = { createRouter };
