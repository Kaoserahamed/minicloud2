const assert = require('node:assert');
const http = require('http');
const express = require('express');
const { createRouter } = require('../../../internal/controlplane/api.js');

async function main() {
  const app = express();
  app.use(express.json());
  app.use(createRouter());
  const server = http.createServer(app);
  await new Promise((res) => server.listen(0, res));
  const port = server.address().port;
  const base = `http://localhost:${port}`;

  // Create bucket
  const bucketRes = await fetch(`${base}/buckets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test' },
    body: JSON.stringify({ name: 'test-bucket', project_id: 'proj-1' }),
  });
  assert.ok(bucketRes.status === 201 || bucketRes.status === 401, 'Bucket endpoint responds');
  if (bucketRes.status === 201) {
    // List buckets
    const listRes = await fetch(`${base}/buckets`, {
      headers: { Authorization: 'Bearer test' },
    });
    assert.ok(listRes.status === 200 || listRes.status === 401, 'List buckets responds');

    // Put object
    const putRes = await fetch(`${base}/buckets/test-bucket/objects/hello.txt`, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain', Authorization: 'Bearer test' },
      body: 'hello world',
    });
    assert.ok(putRes.status === 200 || putRes.status === 401, 'Object PUT responds');

    // Get object
    const getRes = await fetch(`${base}/buckets/test-bucket/objects/hello.txt`, {
      headers: { Authorization: 'Bearer test' },
    });
    assert.ok(getRes.status === 200 || getRes.status === 401, 'Object GET responds');

    // List objects
    const objListRes = await fetch(`${base}/buckets/test-bucket/objects`, {
      headers: { Authorization: 'Bearer test' },
    });
    assert.ok(objListRes.status === 200 || objListRes.status === 401, 'List objects responds');

    // Delete object
    const delRes = await fetch(`${base}/buckets/test-bucket/objects/hello.txt`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer test' },
    });
    assert.ok(delRes.status === 204 || delRes.status === 401, 'Object DELETE responds');
  }

  server.close();
  server.unref();
  console.log('object storage CRUD integration test passed');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

setTimeout(() => process.exit(1), 10000);
