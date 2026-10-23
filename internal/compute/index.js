const { query } = require('@minicloud/internal-database/pool');
const INSTANCE_STATES = {
  pending: 'pending',
  running: 'running',
  stopping: 'stopping',
  stopped: 'stopped',
  terminating: 'terminating',
  terminated: 'terminated',
  error: 'error',
};

const ALLOWED_TRANSITIONS = {
  [INSTANCE_STATES.pending]: [INSTANCE_STATES.running, INSTANCE_STATES.error],
  [INSTANCE_STATES.running]: [
    INSTANCE_STATES.stopped,
    INSTANCE_STATES.terminating,
    INSTANCE_STATES.error,
  ],
  [INSTANCE_STATES.stopped]: [
    INSTANCE_STATES.running,
    INSTANCE_STATES.terminating,
    INSTANCE_STATES.error,
  ],
  [INSTANCE_STATES.terminating]: [INSTANCE_STATES.terminated, INSTANCE_STATES.error],
  [INSTANCE_STATES.terminated]: [],
  [INSTANCE_STATES.error]: [INSTANCE_STATES.stopped, INSTANCE_STATES.terminating],
};

class Instance {
  constructor({
    id,
    name,
    projectId,
    region,
    image,
    cpu,
    ramMb,
    storageGb,
    state = INSTANCE_STATES.pending,
  }) {
    this.id = id;
    this.name = name;
    this.projectId = projectId;
    this.region = region;
    this.image = image;
    this.cpu = cpu || 1;
    this.ramMb = ramMb || 512;
    this.storageGb = storageGb || 10;
    this.state = state;
    this.createdAt = new Date().toISOString();
    this.updatedAt = this.createdAt;
    this.ipAddress = null;
    this.nodeId = null;
  }

  canTransition(toState) {
    const allowed = ALLOWED_TRANSITIONS[this.state] || [];
    return allowed.includes(toState);
  }

  transition(toState) {
    if (!this.canTransition(toState)) {
      throw new Error(`Invalid transition ${this.state} -> ${toState}`);
    }
    this.state = toState;
    this.updatedAt = new Date().toISOString();
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      project_id: this.projectId,
      region: this.region,
      image: this.image,
      cpu: this.cpu,
      ram_mb: this.ramMb,
      storage_gb: this.storageGb,
      state: this.state,
      ip_address: this.ipAddress,
      node_id: this.nodeId,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
  }
}

class InstanceLifecycle {
  constructor() {
    this.instances = new Map();
  }

  get(id) {
    return this.instances.get(id) || null;
  }

  list() {
    return [...this.instances.values()];
  }

  async saveInstance(instance) {
    const pool = require('@minicloud/internal-database/pool').getPool();
    if (!pool) {
      return;
    }
    await query(
      `INSERT INTO instances (id, name, project_id, region, image, cpu, ram_mb,
         storage_gb, state, ip_address, node_id, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, project_id = EXCLUDED.project_id,
         region = EXCLUDED.region, image = EXCLUDED.image,
         cpu = EXCLUDED.cpu, ram_mb = EXCLUDED.ram_mb,
         storage_gb = EXCLUDED.storage_gb, state = EXCLUDED.state,
         ip_address = EXCLUDED.ip_address, node_id = EXCLUDED.node_id,
         updated_at = EXCLUDED.updated_at`,
      [
        instance.id,
        instance.name,
        instance.projectId,
        instance.region,
        instance.image,
        instance.cpu,
        instance.ramMb,
        instance.storageGb,
        instance.state,
        instance.ipAddress,
        instance.nodeId,
        instance.updatedAt,
      ]
    );
  }

  async loadInstances() {
    const pool = require('@minicloud/internal-database/pool').getPool();
    if (!pool) {
      return;
    }
    const res = await query('SELECT * FROM instances');
    for (const row of res.rows) {
      const instance = new Instance({
        id: row.id,
        name: row.name,
        projectId: row.project_id,
        region: row.region,
        image: row.image,
        cpu: row.cpu,
        ramMb: row.ram_mb,
        storageGb: row.storage_gb,
        state: row.state,
      });
      instance.ipAddress = row.ip_address;
      instance.nodeId = row.node_id;
      instance.createdAt = row.created_at;
      instance.updatedAt = row.updated_at;
      this.instances.set(instance.id, instance);
    }
  }

  async create(instance) {
    if (this.instances.has(instance.id)) {
      throw new Error(`Instance ${instance.id} already exists`);
    }
    this.instances.set(instance.id, instance);
    await this.saveInstance(instance);
    return instance;
  }

  async start(id) {
    const instance = this.get(id);
    if (!instance) {
      throw new Error(`Instance ${id} not found`);
    }
    instance.transition(INSTANCE_STATES.running);
    await this.saveInstance(instance);
    return instance;
  }

  async stop(id) {
    const instance = this.get(id);
    if (!instance) {
      throw new Error(`Instance ${id} not found`);
    }
    instance.transition(INSTANCE_STATES.stopped);
    await this.saveInstance(instance);
    return instance;
  }

  async delete(id) {
    const instance = this.get(id);
    if (!instance) {
      throw new Error(`Instance ${id} not found`);
    }
    instance.transition(INSTANCE_STATES.terminating);
    instance.transition(INSTANCE_STATES.terminated);
    this.instances.delete(id);
    const pool = require('@minicloud/internal-database/pool').getPool();
    if (pool) {
      await query('DELETE FROM instances WHERE id = $1', [id]);
    }
    return instance;
  }
}

module.exports = { INSTANCE_STATES, Instance, InstanceLifecycle };
