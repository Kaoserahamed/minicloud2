const assert = require('node:assert');
const { NetworkService } = require('../../../internal/network/index.js');

(async () => {
  const net = new NetworkService();

  // VPC
  const vpc = net.createVpc('alb-vpc', '10.0.0.0/16', 'proj-1');

  // Load balancer
  const lb = net.createLoadBalancer('my-lb', vpc.id, ['subnet-1', 'subnet-2'], 'application');
  assert.strictEqual(lb.type, 'application');
  assert.ok(lb.dnsName, 'lb has dns name');
  assert.strictEqual(net.listLoadBalancers().length, 1);

  // Target group
  const tg = net.createTargetGroup('web-tg', vpc.id, 'HTTP', 80, 'instance');
  assert.strictEqual(tg.protocol, 'HTTP');
  assert.strictEqual(tg.port, 80);
  assert.strictEqual(net.listTargetGroups().length, 1);

  // Register target
  tg.registerTarget('inst-1');
  tg.registerTarget('inst-2');
  assert.strictEqual(tg.targets.length, 2, 'two targets registered');

  // Health check
  const health = tg.healthCheck();
  assert.strictEqual(health.length, 2, 'two health checks');
  assert.strictEqual(health[0].state, 'healthy', 'target healthy');

  // Deregister target
  tg.deregisterTarget('inst-1');
  assert.strictEqual(tg.targets.length, 1, 'one target after deregister');

  // Listener
  const listener = net.createListener(lb.id, 'HTTP', 80, tg.id);
  assert.strictEqual(listener.protocol, 'HTTP');
  assert.strictEqual(listener.port, 80);
  assert.strictEqual(listener.targetGroupId, tg.id);
  assert.strictEqual(net.listListeners().length, 1);

  console.log('ALB load balancer/target group/listener unit tests passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
