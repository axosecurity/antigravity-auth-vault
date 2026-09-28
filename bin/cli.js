#!/usr/bin/env node

/**
 * Universal Antigravity Auth Vault
 * Cross-Platform Installer & CLI Runner for NPX
 * macOS • Linux • Windows
 */

const path = require('path');
const { spawnSync } = require('child_process');
const { installToHiddenDir, uninstallFromSystem } = require('../src/installer');
const { BOLD, CYAN, NC } = require('../src/config');

const args = process.argv.slice(2);

// Handle uninstallation
if (args.includes('--uninstall') || args.includes('uninstall') || args.includes('-u')) {
  const purge = args.includes('--purge') || args.includes('-p');
  uninstallFromSystem(purge);
  process.exit(0);
}

// Handle help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`${BOLD}Universal Antigravity Auth Vault (NPX CLI)${NC}\n`);
  console.log(`Usage:`);
  console.log(`  npx github:axosecurity/antigravity-auth-vault           Install to hidden ~/.antigravity-auth-vault`);
  console.log(`  npx github:axosecurity/antigravity-auth-vault uninstall Cleanly remove binary links and shell hooks`);
  console.log(`  npx github:axosecurity/antigravity-auth-vault --purge   Remove binary and wipe stored tokens`);
  console.log(`  npx github:axosecurity/antigravity-auth-vault <command> Run any ag-auth command directly\n`);
  process.exit(0);
}

// If subcommands are passed directly, forward to bin/ag-auth.js
const subcommands = ['switch', 'quota', 'list', 'current', 'save', 'detach', 'delete', 'db', 'completion', 'version', 'help', '@'];
if (args.length > 0 && (subcommands.includes(args[0]) || args[0].startsWith('-'))) {
  const scriptPath = path.join(__dirname, 'ag-auth.js');
  const res = spawnSync(process.execPath, [scriptPath, ...args], { stdio: 'inherit' });
  process.exit(res.status || 0);
}

// Default: Run installation
const sourceRootDir = path.resolve(__dirname, '..');
installToHiddenDir(sourceRootDir);
