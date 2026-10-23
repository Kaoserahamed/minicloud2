const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class Bucket {
  constructor({ name, projectId, region = 'us-east-1' }) {
    this.name = name;
    this.projectId = projectId;
    this.region = region;
    this.createdAt = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      project_id: this.projectId,
      region: this.region,
      created_at: this.createdAt,
    };
  }
}

class StorageDriver {
  constructor(options = {}) {
    this.options = options;
  }

  async bucketExists(_bucketName) {
    throw new Error('bucketExists not implemented');
  }

  async createBucket(_bucketName) {
    throw new Error('createBucket not implemented');
  }

  async deleteBucket(_bucketName) {
    throw new Error('deleteBucket not implemented');
  }

  async listBuckets() {
    throw new Error('listBuckets not implemented');
  }

  async putObject(_bucketName, _key, _stream, _size, _contentType) {
    throw new Error('putObject not implemented');
  }

  async getObject(_bucketName, _key) {
    throw new Error('getObject not implemented');
  }

  async deleteObject(_bucketName, _key) {
    throw new Error('deleteObject not implemented');
  }

  async listObjects(_bucketName, _prefix) {
    throw new Error('listObjects not implemented');
  }

  async generatePresignedUrl(_bucketName, _key, _operation, _expiration) {
    throw new Error('generatePresignedUrl not implemented');
  }
}

class LocalFsDriver extends StorageDriver {
  constructor(options = {}) {
    super(options);
    this.root = options.root || path.join(process.cwd(), 'storage-data');
    fs.mkdirSync(this.root, { recursive: true });
  }

  _bucketDir(bucketName) {
    return path.join(this.root, bucketName);
  }

  async bucketExists(bucketName) {
    return fs.existsSync(this._bucketDir(bucketName));
  }

  async createBucket(bucketName) {
    if (await this.bucketExists(bucketName)) {
      throw new Error(`Bucket ${bucketName} already exists`);
    }
    fs.mkdirSync(this._bucketDir(bucketName), { recursive: true });
  }

  async deleteBucket(bucketName) {
    const dir = this._bucketDir(bucketName);
    if (!fs.existsSync(dir)) {
      throw new Error(`Bucket ${bucketName} not found`);
    }
    // Only delete if empty
    const entries = fs.readdirSync(dir);
    if (entries.length > 0) {
      throw new Error(`Bucket ${bucketName} is not empty`);
    }
    fs.rmdirSync(dir);
  }

  async listBuckets() {
    if (!fs.existsSync(this.root)) {
      return [];
    }
    return fs
      .readdirSync(this.root)
      .filter((f) => fs.statSync(path.join(this.root, f)).isDirectory());
  }

  _objectPath(bucketName, key) {
    return path.join(this._bucketDir(bucketName), key);
  }

  async putObject(bucketName, key, stream, size, contentType) {
    await this.createBucketIfMissing(bucketName);
    const dest = this._objectPath(bucketName, key);
    const dir = path.dirname(dest);
    fs.mkdirSync(dir, { recursive: true });
    return new Promise((resolve, reject) => {
      const ws = fs.createWriteStream(dest);
      stream.on('data', (chunk) => ws.write(chunk));
      stream.on('end', () => {
        ws.end();
      });
      ws.on('finish', () => {
        resolve({
          size,
          contentType,
          etag: crypto.createHash('md5').update(key).digest('hex'),
        });
      });
      stream.on('error', (err) => {
        ws.destroy();
        reject(err);
      });
      ws.on('error', reject);
    });
  }

  async createBucketIfMissing(bucketName) {
    if (!(await this.bucketExists(bucketName))) {
      await this.createBucket(bucketName);
    }
  }

  async getObject(bucketName, key) {
    const filePath = this._objectPath(bucketName, key);
    if (!fs.existsSync(filePath)) {
      const err = new Error(`Object ${key} not found`);
      err.statusCode = 404;
      throw err;
    }
    const stat = fs.statSync(filePath);
    const stream = fs.createReadStream(filePath);
    return { stream, size: stat.size, contentType: 'application/octet-stream', etag: '' };
  }

  async deleteObject(bucketName, key) {
    const filePath = this._objectPath(bucketName, key);
    if (!fs.existsSync(filePath)) {
      const err = new Error(`Object ${key} not found`);
      err.statusCode = 404;
      throw err;
    }
    fs.unlinkSync(filePath);
  }

  async listObjects(bucketName, prefix = '') {
    const dir = this._bucketDir(bucketName);
    if (!fs.existsSync(dir)) {
      return [];
    }
    const results = [];
    const walk = (dir, relPrefix) => {
      for (const entry of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, entry);
        const rel = path.join(relPrefix, entry).replace(/\\/g, '/');
        if (fs.statSync(fullPath).isDirectory()) {
          walk(fullPath, rel);
        } else if (rel.startsWith(prefix)) {
          results.push({ key: rel, size: fs.statSync(fullPath).size });
        }
      }
    };
    walk(dir, '');
    return results;
  }

  async generatePresignedUrl(bucketName, key, operation, expiration) {
    const token = crypto.randomBytes(16).toString('hex');
    return {
      url: `/storage/${bucketName}/${key}?x-presign=${token}&x-op=${operation}`,
      expiresIn: expiration || 3600,
      method: operation === 'put' || operation === 'upload' ? 'PUT' : 'GET',
    };
  }
}

class BucketService {
  constructor(driver) {
    this.driver = driver;
    this.buckets = new Map();
  }

  async createBucket(name, projectId, region) {
    if (this.buckets.has(name)) {
      throw new Error(`Bucket ${name} already exists`);
    }
    await this.driver.createBucket(name);
    const bucket = new Bucket({ name, projectId, region });
    this.buckets.set(name, bucket);
    return bucket;
  }

  async listBuckets() {
    const names = await this.driver.listBuckets();
    return names.map((name) => {
      const existing = this.buckets.get(name);
      return existing ? existing.toJSON() : { name, project_id: null, region: null };
    });
  }

  async getBucket(name) {
    const exists = await this.driver.bucketExists(name);
    if (!exists) {
      const err = new Error(`Bucket ${name} not found`);
      err.statusCode = 404;
      throw err;
    }
    const existing = this.buckets.get(name);
    return existing ? existing.toJSON() : { name, project_id: null, region: null };
  }

  async deleteBucket(name) {
    const exists = await this.driver.bucketExists(name);
    if (!exists) {
      const err = new Error(`Bucket ${name} not found`);
      err.statusCode = 404;
      throw err;
    }
    await this.driver.deleteBucket(name);
    this.buckets.delete(name);
  }

  async putObject(bucketName, key, stream, size, contentType) {
    return this.driver.putObject(bucketName, key, stream, size, contentType);
  }

  async getObject(bucketName, key) {
    return this.driver.getObject(bucketName, key);
  }

  async deleteObject(bucketName, key) {
    return this.driver.deleteObject(bucketName, key);
  }

  async listObjects(bucketName, prefix) {
    return this.driver.listObjects(bucketName, prefix);
  }

  async generatePresignedUrl(bucketName, key, operation, expiration) {
    return this.driver.generatePresignedUrl(bucketName, key, operation, expiration);
  }
}

module.exports = {
  Bucket,
  StorageDriver,
  LocalFsDriver,
  BucketService,
};
