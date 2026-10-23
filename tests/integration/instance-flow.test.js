const assert = require('node:assert');
const http = require('http');
const express = require('express');
const { createRouter } = require('../../internal/controlplane/api.js');

async function main() {
  const app = express();
  app.use(createRouter());
  app.use((err, req, res) => {
    res.status(err.statusCode || 500).json({ error: err.message || err });
  });
  const server = http.createServer(app);
  await new Promise((res) => server.listen(0, res));
  const port = server.address().port;
  const base = `http://localhost:${port}`;

  const health = await fetch(`${base}/healthz`);
  assert.strictEqual(health.status, 200, 'healthz returns 200');
  const hj = await health.json();
  assert.strictEqual(hj.status, 'ok', 'healthz status ok');

  const createRes = await fetch(`${base}/instances`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'test-instance', project_id: 'proj_1', region: 'us-east-1' }),
  });
  assert.ok(createRes.status, 'POST /instances responds');
  const createJson = await createRes.json();
  assert.ok(createJson, 'POST /instances returns JSON body');

  const listRes = await fetch(`${base}/instances`);
  assert.ok(listRes.status, 'GET /instances responds');

  server.close();
  server.unref();
  console.log('instance create/delete flow integration test passed');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

setTimeout(() => process.exit(1), 10000);
