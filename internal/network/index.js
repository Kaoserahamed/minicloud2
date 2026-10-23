const crypto = require('crypto');

function cidrContains(cidr, ip) {
  const [net, bits] = cidr.split('/');
  const netNum = ipToNumber(net);
  const ipNum = ipToNumber(ip);
  const mask = ~(0xffffffff >>> (32 - parseInt(bits, 10))) & 0xffffffff;
  return (netNum & mask) === (ipNum & mask);
}

function ipToNumber(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

class NetworkRule {
  constructor({ id, direction, protocol, portRange, cidr, action = 'allow', priority = 100 }) {
    this.id = id;
    this.direction = direction; // ingress | egress
    this.protocol = protocol; // tcp | udp | icmp | all
    this.portRange = portRange; // { from, to } or null
    this.cidr = cidr;
    this.action = action; // allow | deny
    this.priority = priority;
  }

  matches(packet) {
    if (this.direction !== packet.direction) {
      return false;
    }
    if (this.protocol !== 'all' && this.protocol !== packet.protocol) {
      return false;
    }
    if (this.portRange && packet.port) {
      if (packet.port < this.portRange.from || packet.port > this.portRange.to) {
        return false;
      }
    }
    if (this.cidr && !cidrContains(this.cidr, packet.ip)) {
      return false;
    }
    return true;
  }
}

class SecurityGroup {
  constructor({ id, name, vpcId, description = '' }) {
    this.id = id;
    this.name = name;
    this.vpcId = vpcId;
    this.description = description;
    this.rules = [];
    this.createdAt = new Date().toISOString();
  }

  addRule(rule) {
    this.rules.push(rule);
  }

  evaluate(packet) {
    // Default deny: no matching allow rule = denied
    const sorted = [...this.rules].sort((a, b) => a.priority - b.priority);
    for (const rule of sorted) {
      if (rule.matches(packet)) {
        return rule.action === 'allow';
      }
    }
    return false;
  }
}

class NetworkAcl {
  constructor({ id, name, subnetId }) {
    this.id = id;
    this.name = name;
    this.subnetId = subnetId;
    this.rules = [];
    this.createdAt = new Date().toISOString();
  }

  addRule(rule) {
    this.rules.push(rule);
  }

  evaluate(packet) {
    const sorted = [...this.rules].sort((a, b) => a.priority - b.priority);
    for (const rule of sorted) {
      if (rule.matches(packet)) {
        return rule.action === 'allow';
      }
    }
    return false; // default deny
  }
}

class VPC {
  constructor({ id, name, cidrBlock, projectId }) {
    this.id = id;
    this.name = name;
    this.cidrBlock = cidrBlock;
    this.projectId = projectId;
    this.createdAt = new Date().toISOString();
  }

  toJSON() {
    return { id: this.id, name: this.name, cidr_block: this.cidrBlock, project_id: this.projectId };
  }
}

class Subnet {
  constructor({ id, name, vpcId, cidrBlock, availabilityZone }) {
    this.id = id;
    this.name = name;
    this.vpcId = vpcId;
    this.cidrBlock = cidrBlock;
    this.availabilityZone = availabilityZone;
    this.createdAt = new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      vpc_id: this.vpcId,
      cidr_block: this.cidrBlock,
      availability_zone: this.availabilityZone,
    };
  }
}

class RouteTable {
  constructor({ id, vpcId, routes = [] }) {
    this.id = id;
    this.vpcId = vpcId;
    this.routes = routes;
  }

  addRoute(destinationCidr, targetId, targetType) {
    this.routes.push({
      destination_cidr: destinationCidr,
      target_id: targetId,
      target_type: targetType,
    });
  }

  lookup(destinationIp) {
    // Longest prefix match
    let best = null;
    let bestBits = -1;
    for (const route of this.routes) {
      const bitCount = parseInt(route.destination_cidr.split('/')[1], 10);
      if (bitCount > bestBits && cidrContains(route.destination_cidr, destinationIp)) {
        best = route;
        bestBits = bitCount;
      }
    }
    return best;
  }
}

class InternetGateway {
  constructor({ id, vpcId }) {
    this.id = id;
    this.vpcId = vpcId;
    this.attached = false;
    this.createdAt = new Date().toISOString();
  }

  attach() {
    this.attached = true;
  }

  detach() {
    this.attached = false;
  }
}

class ElasticIp {
  constructor({ id, ip, projectId }) {
    this.id = id;
    this.ip = ip;
    this.projectId = projectId;
    this.associatedInstanceId = null;
    this.createdAt = new Date().toISOString();
  }

  associate(instanceId) {
    this.associatedInstanceId = instanceId;
  }

  disassociate() {
    this.associatedInstanceId = null;
  }
}

class NetworkService {
  constructor() {
    this.vpcs = new Map();
    this.subnets = new Map();
    this.routeTables = new Map();
    this.securityGroups = new Map();
    this.networkAcls = new Map();
    this.internetGateways = new Map();
    this.elasticIps = new Map();
    this.loadBalancers = new Map();
    this.targetGroups = new Map();
    this.listeners = new Map();
  }

  createVpc(name, cidrBlock, projectId) {
    const id = `vpc_${crypto.randomBytes(8).toString('hex')}`;
    const vpc = new VPC({ id, name, cidrBlock, projectId });
    this.vpcs.set(id, vpc);
    return vpc;
  }

  listVpcs() {
    return [...this.vpcs.values()].map((v) => v.toJSON());
  }

  getVpc(id) {
    return this.vpcs.get(id) || null;
  }

  deleteVpc(id) {
    if (!this.vpcs.has(id)) {
      const err = new Error(`VPC ${id} not found`);
      err.statusCode = 404;
      throw err;
    }
    this.vpcs.delete(id);
  }

  createSubnet(name, vpcId, cidrBlock, availabilityZone) {
    if (!this.vpcs.has(vpcId)) {
      const err = new Error(`VPC ${vpcId} not found`);
      err.statusCode = 404;
      throw err;
    }
    const id = `subnet_${crypto.randomBytes(8).toString('hex')}`;
    const subnet = new Subnet({ id, name, vpcId, cidrBlock, availabilityZone });
    this.subnets.set(id, subnet);
    return subnet;
  }

  listSubnets(vpcId) {
    return [...this.subnets.values()]
      .filter((s) => !vpcId || s.vpcId === vpcId)
      .map((s) => s.toJSON());
  }

  createSecurityGroup(name, vpcId, description) {
    if (!this.vpcs.has(vpcId)) {
      const err = new Error(`VPC ${vpcId} not found`);
      err.statusCode = 404;
      throw err;
    }
    const id = `sg_${crypto.randomBytes(8).toString('hex')}`;
    const sg = new SecurityGroup({ id, name, vpcId, description });
    this.securityGroups.set(id, sg);
    return sg;
  }

  addSecurityGroupRule(sgId, rule) {
    const sg = this.securityGroups.get(sgId);
    if (!sg) {
      const err = new Error(`Security group ${sgId} not found`);
      err.statusCode = 404;
      throw err;
    }
    rule.id = rule.id || `rule_${crypto.randomBytes(6).toString('hex')}`;
    sg.addRule(rule);
    return rule;
  }

  evaluateSecurityGroup(sgId, packet) {
    const sg = this.securityGroups.get(sgId);
    if (!sg) {
      return false;
    }
    return sg.evaluate(packet);
  }

  createNetworkAcl(name, subnetId) {
    if (!this.subnets.has(subnetId)) {
      const err = new Error(`Subnet ${subnetId} not found`);
      err.statusCode = 404;
      throw err;
    }
    const id = `nacl_${crypto.randomBytes(8).toString('hex')}`;
    const nacl = new NetworkAcl({ id, name, subnetId });
    this.networkAcls.set(id, nacl);
    return nacl;
  }

  addNetworkAclRule(naclId, rule) {
    const nacl = this.networkAcls.get(naclId);
    if (!nacl) {
      const err = new Error(`NACL ${naclId} not found`);
      err.statusCode = 404;
      throw err;
    }
    rule.id = rule.id || `rule_${crypto.randomBytes(6).toString('hex')}`;
    nacl.addRule(rule);
    return rule;
  }

  evaluateNetworkAcl(naclId, packet) {
    const nacl = this.networkAcls.get(naclId);
    if (!nacl) {
      return false;
    }
    return nacl.evaluate(packet);
  }

  createInternetGateway(vpcId) {
    if (!this.vpcs.has(vpcId)) {
      const err = new Error(`VPC ${vpcId} not found`);
      err.statusCode = 404;
      throw err;
    }
    const id = `igw_${crypto.randomBytes(8).toString('hex')}`;
    const igw = new InternetGateway({ id, vpcId });
    igw.attach();
    this.internetGateways.set(id, igw);
    return igw;
  }

  listInternetGateways() {
    return [...this.internetGateways.values()].map((g) => ({
      id: g.id,
      vpc_id: g.vpcId,
      attached: g.attached,
    }));
  }

  allocateElasticIp(projectId) {
    const id = `eip_${crypto.randomBytes(8).toString('hex')}`;
    const ip = `203.0.113.${Math.floor(Math.random() * 254) + 1}`;
    const eip = new ElasticIp({ id, ip, projectId });
    this.elasticIps.set(id, eip);
    return eip;
  }

  associateElasticIp(eipId, instanceId) {
    const eip = this.elasticIps.get(eipId);
    if (!eip) {
      const err = new Error(`Elastic IP ${eipId} not found`);
      err.statusCode = 404;
      throw err;
    }
    eip.associate(instanceId);
    return eip;
  }

  listElasticIps() {
    return [...this.elasticIps.values()].map((e) => ({
      id: e.id,
      ip: e.ip,
      project_id: e.projectId,
      associated_instance_id: e.associatedInstanceId,
    }));
  }

  createLoadBalancer(name, vpcId, subnets = [], type = 'application') {
    if (!this.vpcs.has(vpcId)) {
      const err = new Error(`VPC ${vpcId} not found`);
      err.statusCode = 404;
      throw err;
    }
    const id = `lb_${crypto.randomBytes(8).toString('hex')}`;
    const lb = new LoadBalancer({ id, name, vpcId, subnets, type });
    this.loadBalancers.set(id, lb);
    return lb;
  }

  listLoadBalancers() {
    return [...this.loadBalancers.values()].map((lb) => lb.toJSON());
  }

  getLoadBalancer(id) {
    return this.loadBalancers.get(id) || null;
  }

  createTargetGroup(name, vpcId, protocol = 'HTTP', port = 80, targetType = 'instance') {
    if (!this.vpcs.has(vpcId)) {
      const err = new Error(`VPC ${vpcId} not found`);
      err.statusCode = 404;
      throw err;
    }
    const id = `tg_${crypto.randomBytes(8).toString('hex')}`;
    const tg = new TargetGroup({ id, name, vpcId, protocol, port, targetType });
    this.targetGroups.set(id, tg);
    return tg;
  }

  listTargetGroups() {
    return [...this.targetGroups.values()].map((tg) => tg.toJSON());
  }

  createListener(loadBalancerId, protocol, port, targetGroupId) {
    const lb = this.loadBalancers.get(loadBalancerId);
    if (!lb) {
      const err = new Error(`Load balancer ${loadBalancerId} not found`);
      err.statusCode = 404;
      throw err;
    }
    const tg = this.targetGroups.get(targetGroupId);
    if (!tg) {
      const err = new Error(`Target group ${targetGroupId} not found`);
      err.statusCode = 404;
      throw err;
    }
    const id = `listener_${crypto.randomBytes(8).toString('hex')}`;
    const listener = new Listener({ id, loadBalancerId, protocol, port, targetGroupId });
    this.listeners.set(id, listener);
    return listener;
  }

  listListeners() {
    return [...this.listeners.values()].map((l) => l.toJSON());
  }
}

class LoadBalancer {
  constructor({ id, name, vpcId, subnets = [], type = 'application' }) {
    this.id = id;
    this.name = name;
    this.vpcId = vpcId;
    this.subnets = subnets;
    this.type = type;
    this.dnsName = `${name}.elb.${vpcId}.minicloud.local`;
    this.state = 'active';
    this.createdAt = new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      vpc_id: this.vpcId,
      subnets: this.subnets,
      type: this.type,
      dns_name: this.dnsName,
      state: this.state,
      created_at: this.createdAt,
    };
  }
}

class TargetGroup {
  constructor({ id, name, vpcId, protocol = 'HTTP', port = 80, targetType = 'instance' }) {
    this.id = id;
    this.name = name;
    this.vpcId = vpcId;
    this.protocol = protocol;
    this.port = port;
    this.targetType = targetType;
    this.targets = [];
    this.createdAt = new Date().toISOString();
  }

  registerTarget(targetId) {
    if (!this.targets.includes(targetId)) {
      this.targets.push(targetId);
    }
  }

  deregisterTarget(targetId) {
    this.targets = this.targets.filter((t) => t !== targetId);
  }

  healthCheck() {
    return this.targets.map((t) => ({ target_id: t, state: 'healthy' }));
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      vpc_id: this.vpcId,
      protocol: this.protocol,
      port: this.port,
      target_type: this.targetType,
      targets: this.targets,
      created_at: this.createdAt,
    };
  }
}

class Listener {
  constructor({ id, loadBalancerId, protocol, port, targetGroupId }) {
    this.id = id;
    this.loadBalancerId = loadBalancerId;
    this.protocol = protocol;
    this.port = port;
    this.targetGroupId = targetGroupId;
    this.createdAt = new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      load_balancer_id: this.loadBalancerId,
      protocol: this.protocol,
      port: this.port,
      target_group_id: this.targetGroupId,
      created_at: this.createdAt,
    };
  }
}

module.exports = {
  NetworkService,
  NetworkRule,
  SecurityGroup,
  NetworkAcl,
  VPC,
  Subnet,
  RouteTable,
  InternetGateway,
  ElasticIp,
  LoadBalancer,
  TargetGroup,
  Listener,
  cidrContains,
};
