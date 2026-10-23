

class SecretsManager {
  constructor(backend) {
    this.backend = backend;
  }

  async get(secretName) {
    return this.backend.get(secretName);
  }

  async set(secretName, value) {
    return this.backend.set(secretName, value);
  }

  async delete(secretName) {
    return this.backend.delete(secretName);
  }
}

class EnvBackend {
  async get(secretName) {
    return process.env[secretName] || null;
  }
  async set() {
    throw new Error('Env backend does not support set');
  }
  async delete() {
    throw new Error('Env backend does not support delete');
  }
}

class FileBackend {
  constructor(dir) {
    this.dir = dir;
  }
  async get(secretName) {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(this.dir, secretName);
    if (!fs.existsSync(filePath)) {return null;}
    return fs.readFileSync(filePath, 'utf8');
  }
  async set(secretName, value) {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(this.dir, secretName);
    fs.writeFileSync(filePath, value);
  }
  async delete(secretName) {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(this.dir, secretName);
    if (fs.existsSync(filePath)) {fs.unlinkSync(filePath);}
  }
}

module.exports = { SecretsManager, EnvBackend, FileBackend };
