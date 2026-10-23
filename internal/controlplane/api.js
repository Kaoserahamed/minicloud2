const express = require('express');
const fs = require('fs');
const path = require('path');
const { logger } = require('@minicloud/logging');
const { traceMiddleware, getTraceId } = require('@minicloud/tracing');
const { authMiddleware, requirePermission, requireRole, issueJWT } = require('./auth');
const { DatabaseService } = require('@minicloud/internal-database');
const { InstanceLifecycle, Instance } = require('@minicloud/internal-compute');
const { LocalFsDriver, BucketService } = require('@minicloud/internal-storage');
const { NetworkService } = require('@minicloud/internal-network');

const db = new DatabaseService();
const lifecycle = new InstanceLifecycle();
const storageDriver = new LocalFsDriver({ root: process.env.STORAGE_ROOT || './storage-data' });
const bucketService = new BucketService(storageDriver);
const networkService = new NetworkService();
const OPENAPI_SPEC = fs.readFileSync(path.resolve(__dirname, '../../../api/openapi.yaml'), 'utf8');

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

lifecycle.loadInstances().catch((err) => {
  logger.warn('Failed to load instances from database', { message: err.message });
});

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

  router.get('/openapi', (req, res) => {
    res.type('application/yaml').send(OPENAPI_SPEC);
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

  router.get(
    '/instances',
    authMiddleware(),
    requirePermission('compute:read'),
    asyncHandler(async (req, res) => {
      const instances = lifecycle.list().map((i) => i.toJSON());
      res.json({ instances, traceId: getTraceId(req) });
    })
  );

  router.get(
    '/instances/:id',
    authMiddleware(),
    requirePermission('compute:read'),
    asyncHandler(async (req, res) => {
      const instance = lifecycle.get(req.params.id);
      if (!instance) {
        return res
          .status(404)
          .json({ success: false, error: 'NOT_FOUND', message: 'Instance not found' });
      }
      res.json({ instance: instance.toJSON(), traceId: getTraceId(req) });
    })
  );

  router.post(
    '/instances/:id/start',
    authMiddleware(),
    requirePermission('compute:write'),
    asyncHandler(async (req, res) => {
      const instance = await lifecycle.start(req.params.id);
      res.json({ instance: instance.toJSON(), traceId: getTraceId(req) });
    })
  );

  router.post(
    '/instances/:id/stop',
    authMiddleware(),
    requirePermission('compute:write'),
    asyncHandler(async (req, res) => {
      const instance = await lifecycle.stop(req.params.id);
      res.json({ instance: instance.toJSON(), traceId: getTraceId(req) });
    })
  );

  router.delete(
    '/instances/:id',
    authMiddleware(),
    requirePermission('compute:write'),
    asyncHandler(async (req, res) => {
      await lifecycle.delete(req.params.id);
      res.status(204).end();
    })
  );

  router.post(
    '/instances',
    authMiddleware(),
    requirePermission('compute:write'),
    quotaMiddleware('instance'),
    asyncHandler(async (req, res) => {
      const instance = new Instance({
        id: 'inst_' + Date.now(),
        name: req.body.name,
        projectId: req.body.project_id,
        region: req.body.region,
        image: req.body.image,
        cpu: req.body.cpu,
        ramMb: req.body.ramMb,
        storageGb: req.body.storageGb,
      });
      await lifecycle.create(instance);
      res.status(201).json({ instance: instance.toJSON(), traceId: getTraceId(req) });
    })
  );

  router.get(
    '/buckets',
    authMiddleware(),
    requirePermission('storage:read'),
    asyncHandler(async (req, res) => {
      const buckets = await bucketService.listBuckets();
      res.json({ buckets, traceId: getTraceId(req) });
    })
  );

  router.post(
    '/buckets',
    authMiddleware(),
    requirePermission('storage:write'),
    asyncHandler(async (req, res) => {
      const bucket = await bucketService.createBucket(
        req.body.name,
        req.body.project_id,
        req.body.region
      );
      res.status(201).json({ bucket, traceId: getTraceId(req) });
    })
  );

  router.get(
    '/buckets/:name',
    authMiddleware(),
    requirePermission('storage:read'),
    asyncHandler(async (req, res) => {
      const bucket = await bucketService.getBucket(req.params.name);
      res.json({ bucket, traceId: getTraceId(req) });
    })
  );

  router.delete(
    '/buckets/:name',
    authMiddleware(),
    requirePermission('storage:write'),
    asyncHandler(async (req, res) => {
      await bucketService.deleteBucket(req.params.name);
      res.status(204).end();
    })
  );

  router.get(
    '/buckets/:name/objects',
    authMiddleware(),
    requirePermission('storage:read'),
    asyncHandler(async (req, res) => {
      const objects = await bucketService.listObjects(req.params.name, req.query.prefix);
      res.json({ objects, traceId: getTraceId(req) });
    })
  );

  router.put(
    '/buckets/:name/objects/:key',
    authMiddleware(),
    requirePermission('storage:write'),
    asyncHandler(async (req, res) => {
      const result = await bucketService.putObject(
        req.params.name,
        req.params.key,
        req,
        req.headers['content-length'] ? parseInt(req.headers['content-length'], 10) : undefined,
        req.headers['content-type']
      );
      res.status(200).json({ key: req.params.key, etag: result.etag, size: result.size });
    })
  );

  router.get(
    '/buckets/:name/objects/:key',
    authMiddleware(),
    requirePermission('storage:read'),
    asyncHandler(async (req, res) => {
      const { stream, size, contentType } = await bucketService.getObject(
        req.params.name,
        req.params.key
      );
      res.setHeader('Content-Length', size);
      res.setHeader('Content-Type', contentType);
      stream.pipe(res);
    })
  );

  router.delete(
    '/buckets/:name/objects/:key',
    authMiddleware(),
    requirePermission('storage:write'),
    asyncHandler(async (req, res) => {
      await bucketService.deleteObject(req.params.name, req.params.key);
      res.status(204).end();
    })
  );

  router.get(
    '/vpcs',
    authMiddleware(),
    requirePermission('network:read'),
    asyncHandler(async (req, res) => {
      res.json({ vpcs: networkService.listVpcs(), traceId: getTraceId(req) });
    })
  );

  router.post(
    '/vpcs',
    authMiddleware(),
    requirePermission('network:write'),
    asyncHandler(async (req, res) => {
      const vpc = networkService.createVpc(req.body.name, req.body.cidr_block, req.body.project_id);
      res.status(201).json({ vpc: vpc.toJSON(), traceId: getTraceId(req) });
    })
  );

  router.get(
    '/subnets',
    authMiddleware(),
    requirePermission('network:read'),
    asyncHandler(async (req, res) => {
      res.json({ subnets: networkService.listSubnets(req.query.vpc_id), traceId: getTraceId(req) });
    })
  );

  router.post(
    '/subnets',
    authMiddleware(),
    requirePermission('network:write'),
    asyncHandler(async (req, res) => {
      const subnet = networkService.createSubnet(
        req.body.name,
        req.body.vpc_id,
        req.body.cidr_block,
        req.body.availability_zone
      );
      res.status(201).json({ subnet: subnet.toJSON(), traceId: getTraceId(req) });
    })
  );

  router.get(
    '/security-groups',
    authMiddleware(),
    requirePermission('network:read'),
    asyncHandler(async (req, res) => {
      res.json({ security_groups: [], traceId: getTraceId(req) });
    })
  );

  router.post(
    '/security-groups',
    authMiddleware(),
    requirePermission('network:write'),
    asyncHandler(async (req, res) => {
      const sg = networkService.createSecurityGroup(
        req.body.name,
        req.body.vpc_id,
        req.body.description
      );
      res
        .status(201)
        .json({
          security_group: { id: sg.id, name: sg.name, vpc_id: sg.vpcId },
          traceId: getTraceId(req),
        });
    })
  );

  router.post(
    '/security-groups/:id/rules',
    authMiddleware(),
    requirePermission('network:write'),
    asyncHandler(async (req, res) => {
      const rule = networkService.addSecurityGroupRule(req.params.id, req.body);
      res.status(201).json({ rule, traceId: getTraceId(req) });
    })
  );

  router.post(
    '/security-groups/:id/evaluate',
    authMiddleware(),
    requirePermission('network:read'),
    asyncHandler(async (req, res) => {
      const allowed = networkService.evaluateSecurityGroup(req.params.id, req.body);
      res.json({ allowed, traceId: getTraceId(req) });
    })
  );

  router.get(
    '/network-acls',
    authMiddleware(),
    requirePermission('network:read'),
    asyncHandler(async (req, res) => {
      res.json({ network_acls: [], traceId: getTraceId(req) });
    })
  );

  router.post(
    '/network-acls',
    authMiddleware(),
    requirePermission('network:write'),
    asyncHandler(async (req, res) => {
      const nacl = networkService.createNetworkAcl(req.body.name, req.body.subnet_id);
      res
        .status(201)
        .json({
          network_acl: { id: nacl.id, name: nacl.name, subnet_id: nacl.subnetId },
          traceId: getTraceId(req),
        });
    })
  );

  router.post(
    '/network-acls/:id/rules',
    authMiddleware(),
    requirePermission('network:write'),
    asyncHandler(async (req, res) => {
      const rule = networkService.addNetworkAclRule(req.params.id, req.body);
      res.status(201).json({ rule, traceId: getTraceId(req) });
    })
  );

  router.post(
    '/network-acls/:id/evaluate',
    authMiddleware(),
    requirePermission('network:read'),
    asyncHandler(async (req, res) => {
      const allowed = networkService.evaluateNetworkAcl(req.params.id, req.body);
      res.json({ allowed, traceId: getTraceId(req) });
    })
  );

  router.get(
    '/internet-gateways',
    authMiddleware(),
    requirePermission('network:read'),
    asyncHandler(async (req, res) => {
      res.json({
        internet_gateways: networkService.listInternetGateways(),
        traceId: getTraceId(req),
      });
    })
  );

  router.post(
    '/internet-gateways',
    authMiddleware(),
    requirePermission('network:write'),
    asyncHandler(async (req, res) => {
      const igw = networkService.createInternetGateway(req.body.vpc_id);
      res
        .status(201)
        .json({
          internet_gateway: { id: igw.id, vpc_id: igw.vpcId, attached: igw.attached },
          traceId: getTraceId(req),
        });
    })
  );

  router.get(
    '/elastic-ips',
    authMiddleware(),
    requirePermission('network:read'),
    asyncHandler(async (req, res) => {
      res.json({ elastic_ips: networkService.listElasticIps(), traceId: getTraceId(req) });
    })
  );

  router.post(
    '/elastic-ips',
    authMiddleware(),
    requirePermission('network:write'),
    asyncHandler(async (req, res) => {
      const eip = networkService.allocateElasticIp(req.body.project_id);
      res
        .status(201)
        .json({
          elastic_ip: { id: eip.id, ip: eip.ip, project_id: eip.projectId },
          traceId: getTraceId(req),
        });
    })
  );

  router.post(
    '/elastic-ips/:id/associate',
    authMiddleware(),
    requirePermission('network:write'),
    asyncHandler(async (req, res) => {
      const eip = networkService.associateElasticIp(req.params.id, req.body.instance_id);
      res.json({
        elastic_ip: { id: eip.id, ip: eip.ip, associated_instance_id: eip.associatedInstanceId },
        traceId: getTraceId(req),
      });
    })
  );

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
