const assert = require('node:assert');
const { can } = require('../../internal/controlplane/auth.js');

assert.ok(can('admin', '*'), 'admin has wildcard permission');
assert.ok(can('admin', 'compute:write'), 'admin can write compute');
assert.ok(can('user', 'compute:read'), 'user can read compute');
assert.ok(can('user', 'compute:write'), 'user can write compute');
assert.ok(can('user', 'storage:read'), 'user can read storage');
assert.ok(can('viewer', 'compute:read'), 'viewer can read compute');
assert.strictEqual(can('viewer', 'compute:write'), false, 'viewer cannot write compute');
assert.strictEqual(can('viewer', 'storage:write'), false, 'viewer cannot write storage');
assert.strictEqual(can('nonexistent', 'compute:read'), false, 'unknown role has no permissions');

console.log('auth unit tests passed');
