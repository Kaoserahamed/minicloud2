const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { LocalFsDriver, BucketService } = require('../../../internal/storage/index.js');

(async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-presign-test-'));
  try {
    const service = new BucketService(new LocalFsDriver({ root }));
    await service.createBucket('presign-bucket', 'proj-1', 'us-east-1');

    // Presigned URL for GET
    const getUrl = await service.generatePresignedUrl(
      'presign-bucket', 'obj.txt', 'get', 3600
    );
    assert.ok(getUrl.url, 'presigned URL generated');
    assert.strictEqual(getUrl.method, 'GET', 'GET method');
    assert.strictEqual(getUrl.expiresIn, 3600, 'expiration set');

    // Presigned URL for PUT
    const putUrl = await service.generatePresignedUrl(
      'presign-bucket', 'obj.txt', 'put', 300
    );
    assert.strictEqual(putUrl.method, 'PUT', 'PUT method');
    assert.strictEqual(putUrl.expiresIn, 300, 'custom expiration');

    console.log('storage presigned URL unit tests passed');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
