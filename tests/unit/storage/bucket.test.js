const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { LocalFsDriver, BucketService } = require('../../../internal/storage/index.js');

(async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-storage-test-'));
  try {
    const driver = new LocalFsDriver({ root });
    const service = new BucketService(driver);

    // Create bucket
    const b = await service.createBucket('test-bucket', 'proj-1', 'us-east-1');
    assert.strictEqual(b.name, 'test-bucket');
    assert.strictEqual(b.projectId, 'proj-1');

    // Duplicate throws
    await assert.rejects(() => service.createBucket('test-bucket', 'proj-1'), /already exists/);

    // List buckets
    const list = await service.listBuckets();
    assert.ok(list.some((x) => x.name === 'test-bucket'), 'bucket listed');

    // Get bucket
    const got = await service.getBucket('test-bucket');
    assert.strictEqual(got.name, 'test-bucket');

    // Not found
    await assert.rejects(() => service.getBucket('nope'), /not found/);

    // Delete bucket
    await service.deleteBucket('test-bucket');
    await assert.rejects(() => service.getBucket('test-bucket'), /not found/);

    console.log('storage bucket CRUD unit tests passed');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
