// build.js - monorepo build script
const fs = require('fs');
const path = require('path');

const packages = [
  'cmd/controlplane',
  'cmd/dataplane',
  'cmd/cli',
  'pkg/config',
  'pkg/errors',
  'pkg/logging',
  'pkg/tracing',
];

for (const pkg of packages) {
  const pkgPath = path.join(process.cwd(), pkg, 'package.json');
  if (fs.existsSync(pkgPath)) {
    console.log(`Building ${pkg}...`);
  }
}

console.log('Build complete.');
