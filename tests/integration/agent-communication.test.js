const assert = require('node:assert');
const http = require('http');
const express = require('express');
const { createRouter } = require('../../internal/controlplane/api.js');

async function main() {
  const app = express();
  app.use(createRouter());
  const server = http.createServer(app);
  await new Promise((res) => server.listen(0, res));
  const port = server.address().port;
  const base = `http://localhost:${port}`;

  const res = await fetch(`${base}/healthz`);
  assert.strictEqual(res.status, 200, 'healthz returns 200');
  const json = await res.json();
  assert.strictEqual(json.status, 'ok', 'healthz status ok');

  server.close();
  server.unref();
  console.log('agent communication integration test passed');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
