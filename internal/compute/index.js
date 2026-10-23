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

  create(instance) {
    if (this.instances.has(instance.id)) {
      throw new Error(`Instance ${instance.id} already exists`);
    }
    this.instances.set(instance.id, instance);
    return instance;
  }

  get(id) {
    return this.instances.get(id) || null;
  }

  list() {
    return [...this.instances.values()];
  }

  start(id) {
    const instance = this.get(id);
    if (!instance) {
      throw new Error(`Instance ${id} not found`);
    }
    instance.transition(INSTANCE_STATES.running);
    return instance;
  }

  stop(id) {
    const instance = this.get(id);
    if (!instance) {
      throw new Error(`Instance ${id} not found`);
    }
    instance.transition(INSTANCE_STATES.stopped);
    return instance;
  }

  delete(id) {
    const instance = this.get(id);
    if (!instance) {
      throw new Error(`Instance ${id} not found`);
    }
    instance.transition(INSTANCE_STATES.terminating);
    instance.transition(INSTANCE_STATES.terminated);
    this.instances.delete(id);
    return instance;
  }
}

module.exports = { INSTANCE_STATES, Instance, InstanceLifecycle };
