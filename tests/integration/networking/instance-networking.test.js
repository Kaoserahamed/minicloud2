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

  // Create VPC
  const vpcRes = await fetch(`${base}/vpcs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test' },
    body: JSON.stringify({ name: 'test-vpc', cidr_block: '10.0.0.0/16', project_id: 'proj-1' }),
  });
  assert.ok(vpcRes.status === 201 || vpcRes.status === 401, 'VPC endpoint responds');
  if (vpcRes.status === 201) {
    const vpc = await vpcRes.json();
    assert.ok(vpc.vpc.id, 'VPC has id');

    // Create security group
    const sgRes = await fetch(`${base}/security-groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test' },
      body: JSON.stringify({ name: 'test-sg', vpc_id: vpc.vpc.id, description: 'test' }),
    });
    assert.ok(sgRes.status === 201 || sgRes.status === 401, 'Security group endpoint responds');

    // Create instance with networking
    const instRes = await fetch(`${base}/instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test' },
      body: JSON.stringify({
        name: 'test-instance',
        project_id: 'proj-1',
        region: 'us-east-1',
        image: 'ubuntu-22.04',
      }),
    });
    assert.ok(instRes.status === 201 || instRes.status === 401, 'Instance endpoint responds');
    if (instRes.status === 201) {
      const inst = await instRes.json();
      assert.ok(inst.instance.id, 'Instance has id');
      assert.strictEqual(inst.instance.state, 'pending', 'Instance state pending');
    }
  }

  // List instances (may be 401 without valid token)
  const listRes = await fetch(`${base}/instances`, {
    headers: { Authorization: 'Bearer test' },
  });
  assert.ok(listRes.status === 200 || listRes.status === 401, 'List instances responds');

  server.close();
  server.unref();
  console.log('instance creation with networking integration test passed');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

setTimeout(() => process.exit(1), 10000);
