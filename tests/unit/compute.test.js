const assert = require('node:assert');
const {
  InstanceLifecycle,
  INSTANCE_STATES,
  Instance,
} = require('../../internal/compute/index.js');

(async () => {
  const lifecycle = new InstanceLifecycle();

  // Create instance
  const inst = await lifecycle.create(
    new Instance({
      id: 'inst-1',
      name: 'web-1',
      projectId: 'proj-1',
      region: 'us-east-1',
      image: 'ubuntu-22.04',
    })
  );
  assert.strictEqual(inst.state, INSTANCE_STATES.pending, 'initial state pending');
  assert.strictEqual(lifecycle.get('inst-1').id, 'inst-1', 'instance retrievable by id');

  // Valid transitions
  await lifecycle.start('inst-1');
  assert.strictEqual(
    lifecycle.get('inst-1').state,
    INSTANCE_STATES.running,
    'start -> running'
  );
  await lifecycle.stop('inst-1');
  assert.strictEqual(
    lifecycle.get('inst-1').state,
    INSTANCE_STATES.stopped,
    'stop -> stopped'
  );
  await lifecycle.start('inst-1');
  assert.strictEqual(
    lifecycle.get('inst-1').state,
    INSTANCE_STATES.running,
    'restart -> running'
  );
  await lifecycle.delete('inst-1');
  assert.strictEqual(lifecycle.get('inst-1'), null, 'delete removes instance');

  // Invalid transition: pending -> stopped directly should throw
  const inst2 = await lifecycle.create(
    new Instance({
      id: 'inst-2',
      name: 'web-2',
      projectId: 'proj-1',
      region: 'us-east-1',
    })
  );
  assert.throws(() => inst2.transition(INSTANCE_STATES.stopped), /Invalid transition/);

  // Delete non-existent throws
  await assert.rejects(() => lifecycle.delete('nope'), /not found/);

  console.log('compute instance lifecycle unit tests passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
