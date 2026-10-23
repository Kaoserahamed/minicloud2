const assert = require('node:assert');
const { Scheduler } = require('../../internal/scheduler/index.js');

const scheduler = new Scheduler({ strategy: 'bin-packing' });

const nodes = [
  { id: 'n1', cpu_total: 8, cpu_used: 2, ram_total: 16384, ram_used: 4096, storage_total: 500, storage_used: 100 },
  { id: 'n2', cpu_total: 4, cpu_used: 3, ram_total: 8192, ram_used: 6144, storage_total: 200, storage_used: 50 },
];

const chosen = scheduler.place({ cpu: 2, ramMb: 2048, storageGb: 50 }, nodes);
assert.strictEqual(chosen.id, 'n1', 'bin-packing should choose n1');

const tooBig = scheduler.place({ cpu: 100, ramMb: 100000, storageGb: 1000 }, nodes);
assert.strictEqual(tooBig, null, 'oversized instance should not place');

const ff = new Scheduler({ strategy: 'first-fit' });
const firstFitChosen = ff.place({ cpu: 1, ramMb: 512, storageGb: 10 }, nodes);
assert.strictEqual(firstFitChosen.id, 'n1', 'first-fit should choose first fitting node');

console.log('scheduler unit tests passed');
