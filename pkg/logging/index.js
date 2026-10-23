const LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

function createLogger(options = {}) {
  const level = options.level || process.env.LOG_LEVEL || 'info';
  const levelPriority = LEVELS[level] || LEVELS.info;

  function shouldLog(msgLevel) {
    return LEVELS[msgLevel] <= levelPriority;
  }

  function formatEntry(msgLevel, message, meta = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level: msgLevel,
      message,
      ...meta,
    };
    return JSON.stringify(entry);
  }

  return {
    error(message, meta) {
      if (shouldLog('error')) {
        console.error(formatEntry('error', message, meta));
      }
    },
    warn(message, meta) {
      if (shouldLog('warn')) {
        console.warn(formatEntry('warn', message, meta));
      }
    },
    info(message, meta) {
      if (shouldLog('info')) {
        console.info(formatEntry('info', message, meta));
      }
    },
    http(message, meta) {
      if (shouldLog('http')) {
        console.info(formatEntry('http', message, meta));
      }
    },
    debug(message, meta) {
      if (shouldLog('debug')) {
        console.debug(formatEntry('debug', message, meta));
      }
    },
    child(meta) {
      return createLogger({ ...options, level, _base: { ...(options._base || {}), ...meta } });
    },
  };
}

const logger = createLogger();

module.exports = { createLogger, logger, LEVELS };
