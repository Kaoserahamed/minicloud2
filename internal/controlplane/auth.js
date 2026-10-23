const jwt = require('jsonwebtoken');
const { UnauthorizedError, ForbiddenError } = require('@minicloud/errors');

const RBAC_ROLES = {
  admin: ['*'],
  user: ['compute:read', 'compute:write', 'storage:read', 'storage:write',
    'network:read', 'network:write', 'database:read', 'database:write',
    'dns:read', 'dns:write'],
  viewer: ['compute:read', 'storage:read', 'network:read',
    'database:read', 'dns:read'],
};

function hasPermission(role, permission) {
  const perms = RBAC_ROLES[role];
  if (!perms) {
    return false;
  }
  return perms.includes('*') || perms.includes(permission);
}

function can(role, permission) {
  return hasPermission(role, permission);
}

function issueJWT(subject, role, options = {}) {
  const secret = process.env.JWT_SECRET || 'change-me-in-production';
  const expiresIn = options.expiresIn || '24h';
  const payload = {
    sub: subject,
    role,
    iat: Math.floor(Date.now() / 1000),
  };
  const token = jwt.sign(payload, secret, { expiresIn });
  return { token, expiresIn };
}

function verifyJWT(token) {
  const secret = process.env.JWT_SECRET || 'change-me-in-production';
  return jwt.verify(token, secret);
}

function authMiddleware(options = {}) {
  const secret = options.secret || process.env.JWT_SECRET || 'change-me-in-production';
  return function authenticate(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return next(new UnauthorizedError('Missing or invalid authorization header'));
    }
    try {
      const payload = jwt.verify(parts[1], secret);
      req.user = { id: payload.sub, role: payload.role };
      next();
    } catch (err) {
      return next(new UnauthorizedError('Invalid or expired token'));
    }
  };
}

function requirePermission(permission) {
  return function authorize(req, res, next) {
    const user = req.user;
    if (!user) {
      return next(new UnauthorizedError('Authentication required'));
    }
    if (!can(user.role, permission)) {
      return next(new ForbiddenError(`Insufficient permissions: ${permission}`));
    }
    next();
  };
}

function requireRole(role) {
  return function authorizeRole(req, res, next) {
    const user = req.user;
    if (!user) {
      return next(new UnauthorizedError('Authentication required'));
    }
    if (user.role !== role && user.role !== 'admin') {
      return next(new ForbiddenError(`Role ${role} required`));
    }
    next();
  };
}

function issueServiceAccount(name, role = 'user') {
  const id = `sa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const apiKey = `mc_${Buffer.from(`${id}:${Date.now()}`).toString('base64url')}`;
  return { id, name, role, apiKey };
}

function authenticateAPIKey(req, res, next) {
  const key = req.headers['x-api-key'] || req.query.api_key;
  if (!key) {
    return next(new UnauthorizedError('Missing API key'));
  }
  // In production validate against a stored key; here derive user from key prefix.
  req.user = { id: 'service-account', role: 'user', apiKey: key };
  next();
}

module.exports = {
  RBAC_ROLES,
  hasPermission,
  can,
  issueJWT,
  verifyJWT,
  authMiddleware,
  requirePermission,
  requireRole,
  issueServiceAccount,
  authenticateAPIKey,
};
