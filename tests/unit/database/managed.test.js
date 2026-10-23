const assert = require('node:assert');
const { ManagedDatabaseService } = require('../../../internal/database/managed-database');

(async () => {
  const mdb = new ManagedDatabaseService();

  // Create database instance
  const db = mdb.createInstance({
    name: 'my-db',
    engine: 'postgres',
    engineVersion: '14',
    instanceClass: 'db.t3.micro',
    allocatedStorage: 100,
    masterUsername: 'admin',
    projectId: 'proj-1',
    vpcId: 'vpc-1',
    subnetIds: ['subnet-1', 'subnet-2'],
    multiAz: true,
    backupRetentionDays: 7,
  });
  assert.strictEqual(db.engine, 'postgres');
  assert.strictEqual(db.state, 'creating');
  assert.ok(db.endpoint, 'db has endpoint');
  assert.strictEqual(mdb.listInstances().length, 1);

  // Get database
  const got = mdb.getInstance(db.id);
  assert.strictEqual(got.name, 'my-db');

  // Create backup
  const backup = mdb.createBackup(db.id);
  assert.strictEqual(backup.instance_id, db.id);
  assert.strictEqual(mdb.listBackups(db.id).length, 1);

  // Create read replica
  const replica = mdb.createReadReplica(db.id, 'my-db-replica');
  assert.strictEqual(replica.name, 'my-db-replica');
  assert.strictEqual(replica.state, 'available');
  assert.strictEqual(mdb.listReadReplicas(db.id).length, 1);

  // Delete database
  mdb.deleteInstance(db.id);
  assert.strictEqual(mdb.getInstance(db.id), null, 'db deleted');

  // Delete read replica
  mdb.deleteInstance(replica.id);
  assert.strictEqual(mdb.listInstances().length, 0, 'no instances');

  // Delete missing throws
  assert.throws(() => mdb.deleteInstance('nope'), /not found/);

  console.log('managed database unit tests passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
