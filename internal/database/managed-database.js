const crypto = require('crypto');

const DB_INSTANCE_STATES = {
  creating: 'creating',
  available: 'available',
  modifying: 'modifying',
  backing_up: 'backing-up',
  restoring: 'restoring',
  deleting: 'deleting',
  deleted: 'deleted',
  failed: 'failed',
};

class ManagedDatabase {
  constructor({
    id,
    name,
    engine,
    engineVersion,
    instanceClass,
    allocatedStorage,
    masterUsername,
    projectId,
    vpcId,
    subnetIds,
    multiAz = false,
    backupRetentionDays = 1,
  }) {
    this.id = id;
    this.name = name;
    this.engine = engine;
    this.engineVersion = engineVersion;
    this.instanceClass = instanceClass;
    this.allocatedStorage = allocatedStorage;
    this.masterUsername = masterUsername;
    this.projectId = projectId;
    this.vpcId = vpcId;
    this.subnetIds = subnetIds;
    this.multiAz = multiAz;
    this.backupRetentionDays = backupRetentionDays;
    this.state = DB_INSTANCE_STATES.creating;
    this.endpoint = `${name}.${crypto.randomBytes(4).toString('hex')}.rds.minicloud.local`;
    this.port = 5432;
    this.createdAt = new Date().toISOString();
    this.backups = [];
    this.readReplicas = [];
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      engine: this.engine,
      engine_version: this.engineVersion,
      instance_class: this.instanceClass,
      allocated_storage: this.allocatedStorage,
      master_username: this.masterUsername,
      project_id: this.projectId,
      vpc_id: this.vpcId,
      subnet_ids: this.subnetIds,
      multi_az: this.multiAz,
      backup_retention_days: this.backupRetentionDays,
      state: this.state,
      endpoint: this.endpoint,
      port: this.port,
      created_at: this.createdAt,
    };
  }
}

class ManagedDatabaseService {
  constructor() {
    this.instances = new Map();
  }

  createInstance({
    name,
    engine = 'postgres',
    engineVersion = '14',
    instanceClass = 'db.t3.micro',
    allocatedStorage = 20,
    masterUsername,
    projectId,
    vpcId,
    subnetIds,
    multiAz = false,
    backupRetentionDays = 1,
  }) {
    if (!masterUsername) {
      const err = new Error('masterUsername is required');
      err.statusCode = 400;
      throw err;
    }
    const id = `db_${crypto.randomBytes(8).toString('hex')}`;
    const instance = new ManagedDatabase({
      id,
      name,
      engine,
      engineVersion,
      instanceClass,
      allocatedStorage,
      masterUsername,
      projectId,
      vpcId,
      subnetIds,
      multiAz,
      backupRetentionDays,
    });
    this.instances.set(id, instance);
    return instance;
  }

  listInstances() {
    return [...this.instances.values()].map((i) => i.toJSON());
  }

  getInstance(id) {
    return this.instances.get(id) || null;
  }

  deleteInstance(id) {
    const instance = this.instances.get(id);
    if (!instance) {
      const err = new Error(`Database ${id} not found`);
      err.statusCode = 404;
      throw err;
    }
    instance.state = DB_INSTANCE_STATES.deleted;
    this.instances.delete(id);
    return instance;
  }

  createBackup(instanceId) {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      const err = new Error(`Database ${instanceId} not found`);
      err.statusCode = 404;
      throw err;
    }
    const backupId = `backup_${crypto.randomBytes(8).toString('hex')}`;
    const backup = {
      id: backupId,
      instance_id: instanceId,
      status: 'available',
      created_at: new Date().toISOString(),
    };
    instance.backups.push(backup);
    return backup;
  }

  listBackups(instanceId) {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      return [];
    }
    return instance.backups;
  }

  createReadReplica(instanceId, replicaName) {
    const source = this.instances.get(instanceId);
    if (!source) {
      const err = new Error(`Source database ${instanceId} not found`);
      err.statusCode = 404;
      throw err;
    }
    const id = `db_${crypto.randomBytes(8).toString('hex')}`;
    const replica = new ManagedDatabase({
      id,
      name: replicaName,
      engine: source.engine,
      engineVersion: source.engineVersion,
      instanceClass: source.instanceClass,
      allocatedStorage: source.allocatedStorage,
      masterUsername: source.masterUsername,
      projectId: source.projectId,
      vpcId: source.vpcId,
      subnetIds: source.subnetIds,
      multiAz: source.multiAz,
      backupRetentionDays: source.backupRetentionDays,
    });
    replica.state = DB_INSTANCE_STATES.available;
    source.readReplicas.push(id);
    this.instances.set(id, replica);
    return replica;
  }

  listReadReplicas(instanceId) {
    const source = this.instances.get(instanceId);
    if (!source) {
      return [];
    }
    return source.readReplicas.map((rid) => this.instances.get(rid)).filter(Boolean);
  }
}

module.exports = {
  ManagedDatabase,
  ManagedDatabaseService,
  DB_INSTANCE_STATES,
};
