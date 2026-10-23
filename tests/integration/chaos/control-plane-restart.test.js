const assert = require('node:assert');
const http = require('http');
const express = require('express');
const { createRouter } = require('../../../internal/controlplane/api.js');

// Chaos: control plane restart - server should recover after restart
async function main() {
  let server;
  let port;

  const startServer = async () => {
    const app = express();
    app.use(express.json());
    app.use(createRouter());
    server = http.createServer(app);
    await new Promise((res) => server.listen(0, res));
    port = server.address().port;
  };

  await startServer();
  const base = `http://localhost:${port}`;

  // Health check before restart
  const before = await fetch(`${base}/healthz`);
  assert.strictEqual(before.status, 200, 'healthz before restart');

  // Simulate control plane restart: close and reopen
  await new Promise((res) => server.close(res));
  await startServer();

  // Health check after restart
  const after = await fetch(`${base}/healthz`);
  assert.strictEqual(after.status, 200, 'healthz after restart');

  server.close();
  server.unref();
  console.log('chaos: control plane restart test passed');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

setTimeout(() => process.exit(1), 10000);
