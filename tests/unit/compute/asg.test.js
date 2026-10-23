const assert = require('node:assert');
const { AutoScalingService } = require('../../../internal/compute/index.js');

(async () => {
  const as = new AutoScalingService();

  // Create group
  const group = as.createGroup({
    name: 'web-asg',
    minSize: 1,
    maxSize: 5,
    desiredCapacity: 2,
    vpcZoneIdentifiers: ['subnet-1', 'subnet-2'],
    targetGroupArns: ['tg-1'],
    healthCheckType: 'EC2',
    healthCheckGracePeriod: 0,
  });
  assert.strictEqual(group.minSize, 1);
  assert.strictEqual(group.maxSize, 5);
  assert.strictEqual(group.desiredCapacity, 2);
  assert.strictEqual(as.listGroups().length, 1);

  // Scale up
  const scaled = as.scaleGroup(group.id, 2);
  assert.strictEqual(scaled.desired_capacity, 4, 'scaled up to 4');
  assert.ok(scaled.instance_count <= 5, 'not above max');

  // Scale down
  const scaledDown = as.scaleGroup(group.id, -1);
  assert.strictEqual(scaledDown.desired_capacity, 3, 'scaled down to 3');

  // Can't scale below min
  const atMin = as.scaleGroup(group.id, -10);
  assert.ok(atMin.desired_capacity >= 1, 'not below min size');

  // Get missing group
  assert.strictEqual(as.getGroup('nope'), null, 'missing group returns null');

  console.log('auto scaling group unit tests passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
