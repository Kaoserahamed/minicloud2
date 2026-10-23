const assert = require('node:assert');
const { Readable } = require('node:stream');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { LocalFsDriver, BucketService } = require('../../../internal/storage/index.js');

(async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-object-test-'));
  try {
    const service = new BucketService(new LocalFsDriver({ root }));
    await service.createBucket('obj-bucket', 'proj-1', 'us-east-1');

    // PUT object with streaming
    const content = Buffer.from('hello object storage');
    const putResult = await service.putObject(
      'obj-bucket',
      'folder/obj.txt',
      Readable.from([content]),
      content.length,
      'text/plain'
    );
    assert.ok(putResult.etag, 'put returns etag');

    // GET object with streaming
    const got = await service.getObject('obj-bucket', 'folder/obj.txt');
    const chunks = [];
    for await (const chunk of got.stream) {
      chunks.push(chunk);
    }
    assert.strictEqual(Buffer.concat(chunks).toString(), 'hello object storage', 'get returns content');
    assert.strictEqual(got.size, content.length, 'get returns size');

    // List objects
    const objects = await service.listObjects('obj-bucket');
    assert.ok(objects.some((o) => o.key === 'folder/obj.txt'), 'object listed');

    // DELETE object
    await service.deleteObject('obj-bucket', 'folder/obj.txt');
    await assert.rejects(() => service.getObject('obj-bucket', 'folder/obj.txt'), /not found/);

    console.log('storage object PUT/GET/DELETE unit tests passed');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
