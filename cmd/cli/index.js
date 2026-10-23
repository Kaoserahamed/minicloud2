#!/usr/bin/env node

const { logger } = require('@minicloud/logging');

const args = process.argv.slice(2);
const command = args[0];

const commands = {
  compute: 'manage compute instances',
  storage: 'manage object storage buckets and objects',
  network: 'manage VPC, subnets, security groups, load balancers',
  database: 'manage database instances',
  dns: 'manage DNS zones and records',
  version: 'show version',
  help: 'show help',
};

function showHelp() {
  console.log('MiniCloud CLI (mc)');
  console.log('');
  console.log('Usage: mc <command> [options]');
  console.log('');
  console.log('Commands:');
  for (const [cmd, desc] of Object.entries(commands)) {
    console.log(`  ${cmd.padEnd(12)} ${desc}`);
  }
}

if (command === 'help' || command === '--help' || command === '-h' || !command) {
  showHelp();
  process.exit(0);
}

if (command === 'version' || command === '--version') {
  console.log('mc version 0.1.0-foundation');
  process.exit(0);
}

if (!commands[command]) {
  logger.error(`Unknown command: ${command}`);
  showHelp();
  process.exit(1);
}

logger.info(`Executing mc ${command}`, { args: args.slice(1) });
console.log(`mc ${command} - not yet implemented`);
