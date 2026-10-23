const http = require('http');
const express = require('express');
const { createRouter } = require('../../internal/controlplane/api.js');

async function main() {
  const app = express();
  app.use(express.json());
  app.use(createRouter());
  const server = http.createServer(app);
  await new Promise((res) => server.listen(0, res));
  const port = server.address().port;
  const base = `http://localhost:${port}`;

  const iterations = 100;
  const latencies = [];

  // Warmup
  await fetch(`${base}/healthz`);

  // Benchmark healthz endpoint
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    const res = await fetch(`${base}/healthz`);
    await res.text();
    const end = process.hrtime.bigint();
    latencies.push(Number(end - start) / 1_000_000); // ms
  }

  latencies.sort((a, b) => a - b);
  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];

  console.log(`API latency benchmark (${iterations} requests):`);
  console.log(`  avg: ${avg.toFixed(2)} ms`);
  console.log(`  p50: ${p50.toFixed(2)} ms`);
  console.log(`  p99: ${p99.toFixed(2)} ms`);

  server.close();
  server.unref();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

setTimeout(() => process.exit(1), 15000);
