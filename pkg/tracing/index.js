const crypto = require('crypto');

function generateTraceId() {
  return crypto.randomBytes(16).toString('hex');
}

function traceMiddleware(options = {}) {
  const headerName = options.headerName || 'x-trace-id';

  return function traceMiddleware(req, res, next) {
    const traceId = req.headers[headerName.toLowerCase()] || generateTraceId();
    req.traceId = traceId;
    res.setHeader(headerName, traceId);
    res.on('finish', () => {
      // trace ID propagated to response headers
    });
    next();
  };
}

function getTraceId(req) {
  return req && req.traceId ? req.traceId : null;
}

module.exports = { generateTraceId, traceMiddleware, getTraceId };
