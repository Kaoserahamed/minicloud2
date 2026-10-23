const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const DEFAULTS = {
  port: 8080,
  host: '0.0.0.0',
  env: 'development',
  logLevel: 'info',
  db: {
    host: 'localhost',
    port: 5432,
    user: 'minicloud',
    password: 'minicloud',
    database: 'minicloud',
  },
  auth: {
    jwtSecret: 'change-me-in-production',
    tokenExpiry: '24h',
  },
  regions: ['us-east-1', 'us-west-2', 'eu-west-1'],
};

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function loadYaml(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const content = fs.readFileSync(filePath, 'utf8');
  return yaml.load(content) || {};
}

function deepMerge(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      out[key] &&
      typeof out[key] === 'object' &&
      !Array.isArray(out[key])
    ) {
      out[key] = deepMerge(out[key], source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}

function loadConfig(options = {}) {
  const {
    envFile = '.env',
    configFile = 'config.yaml',
    env = process.env.NODE_ENV || 'development',
  } = options;

  let config = { ...DEFAULTS };

  const envFromFile = loadEnv(path.resolve(envFile));
  config = deepMerge(config, envFromFile);

  const yamlConfig = loadYaml(path.resolve(configFile));
  config = deepMerge(config, yamlConfig);

  const envOverride = loadEnv(path.resolve(`.env.${env}`));
  config = deepMerge(config, envOverride);

  config.env = env;
  config.port = parseInt(process.env.PORT || config.port, 10);

  return config;
}

function validateConfig(config) {
  const errors = [];
  if (!config.port || config.port < 1 || config.port > 65535) {
    errors.push('config.port must be a valid port number');
  }
  if (!config.auth.jwtSecret || config.auth.jwtSecret === 'change-me-in-production') {
    errors.push('config.auth.jwtSecret must be set to a non-default value');
  }
  if (!Array.isArray(config.regions) || config.regions.length === 0) {
    errors.push('config.regions must be a non-empty array');
  }
  return errors;
}

module.exports = { loadConfig, validateConfig, DEFAULTS };
