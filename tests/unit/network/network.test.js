const assert = require('node:assert');
const { NetworkService, NetworkRule } = require('../../../internal/network/index.js');

(async () => {
  const net = new NetworkService();

  // VPC
  const vpc = net.createVpc('my-vpc', '10.0.0.0/16', 'proj-1');
  assert.strictEqual(vpc.cidrBlock, '10.0.0.0/16');
  assert.strictEqual(net.listVpcs().length, 1);

  // Subnet
  const subnet = net.createSubnet('subnet-1', vpc.id, '10.0.1.0/24', 'us-east-1a');
  assert.strictEqual(subnet.vpcId, vpc.id);
  assert.strictEqual(net.listSubnets(vpc.id).length, 1);

  // Security group with rule
  const sg = net.createSecurityGroup('web-sg', vpc.id, 'web tier');
  net.addSecurityGroupRule(sg.id, new NetworkRule({
    direction: 'ingress',
    protocol: 'tcp',
    portRange: { from: 80, to: 80 },
    cidr: '0.0.0.0/0',
    action: 'allow',
    priority: 100,
  }));

  // Evaluate: allow port 80 from anywhere
  assert.ok(net.evaluateSecurityGroup(sg.id, {
    direction: 'ingress', protocol: 'tcp', port: 80, ip: '1.2.3.4',
  }), 'port 80 allowed');

  // Evaluate: deny port 22 (no rule)
  assert.ok(!net.evaluateSecurityGroup(sg.id, {
    direction: 'ingress', protocol: 'tcp', port: 22, ip: '1.2.3.4',
  }), 'port 22 denied by default');

  // NACL
  const nacl = net.createNetworkAcl('my-nacl', subnet.id);
  net.addNetworkAclRule(nacl.id, new NetworkRule({
    direction: 'ingress', protocol: 'all', portRange: null, cidr: '0.0.0.0/0',
    action: 'allow', priority: 100,
  }));
  assert.ok(net.evaluateNetworkAcl(nacl.id, {
    direction: 'ingress', protocol: 'tcp', port: 80, ip: '1.2.3.4',
  }), 'nacl allows all');

  // Internet gateway
  const igw = net.createInternetGateway(vpc.id);
  assert.ok(igw.attached, 'igw attached');
  assert.strictEqual(net.listInternetGateways().length, 1);

  // Elastic IP
  const eip = net.allocateElasticIp('proj-1');
  assert.ok(eip.ip, 'eip has ip');
  net.associateElasticIp(eip.id, 'inst-1');
  assert.strictEqual(eip.associatedInstanceId, 'inst-1');
  assert.strictEqual(net.listElasticIps().length, 1);

  console.log('network VPC/security group/NACL/igw/eip unit tests passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
