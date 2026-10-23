const assert = require('node:assert');
const { NetworkService } = require('../../../internal/network/index.js');

(async () => {
  const net = new NetworkService();

  // Upload certificate
  const cert = net.uploadCertificate(
    'example.com',
    '-----BEGIN CERTIFICATE-----...',
    '-----BEGIN PRIVATE KEY-----...',
    '-----BEGIN CERTIFICATE-----chain...',
    'proj-1'
  );
  assert.strictEqual(cert.domainName, 'example.com');
  assert.ok(cert.id, 'cert has id');
  assert.ok(cert.expiresAt, 'cert has expiry');
  assert.strictEqual(net.listCertificates().length, 1);

  // Get certificate
  const got = net.getCertificate(cert.id);
  assert.strictEqual(got.domainName, 'example.com');

  // Not found
  assert.strictEqual(net.getCertificate('nope'), null, 'missing cert returns null');

  // Delete certificate
  net.deleteCertificate(cert.id);
  assert.strictEqual(net.listCertificates().length, 0, 'cert deleted');

  // Delete missing throws
  assert.throws(() => net.deleteCertificate('nope'), /not found/);

  console.log('SSL certificate unit tests passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
