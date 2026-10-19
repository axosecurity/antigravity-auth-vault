#!/usr/bin/env node

/**
 * Universal Antigravity Auth Vault
 * Pure JavaScript Unified CLI
 * macOS • Linux • Windows (CLI, IDE, 2.0 Desktop)
 */

const path = require('path');
const readline = require('readline');
const { VERSION, PLATFORM, BOLD, GREEN, YELLOW, RED, CYAN, MAGENTA, DIM, NC } = require('../src/config');
const {
  cmdCurrent,
  cmdSave,
  cmdSwitch,
  cmdList,
  cmdQuota,
  cmdDetach,
  cmdDelete,
  getVaultProfiles,
  pickInteractive
} = require('../src/vault');
const {
  cliDbSetup,
  cliDbStatus,
  cliDbPush,
  cliDbPull,
  cliDbSync,
  cliDbAutoSync,
  cliDbDaemon,
  cliDbDisconnect
} = require('../src/db');
const {
  getBashCompletionScript,
  getZshCompletionScript,
  getFishCompletionScript,
  getPowerShellCompletionScript,
  installCompletion
} = require('../src/completions');
const { uninstallFromSystem } = require('../src/installer');

// Interactive Master Menu
async function cmdInteractive() {
  console.log(`${BOLD}${MAGENTA}========================================${NC}`);
  console.log(`${BOLD}${MAGENTA}  Universal Antigravity Vault (${VERSION})  ${NC}`);
  console.log(`${BOLD}${MAGENTA}  macOS • Linux • Windows (CLI, IDE, 2.0)${NC}`);
  console.log(`${BOLD}${MAGENTA}========================================${NC}\n`);

  await cmdCurrent();

  console.log(`\n${BOLD}Actions:${NC}`);
  console.log('  1) Save current session to vault (CLI + IDE + 2.0 Desktop)');
  console.log('  2) Switch account (↑ / ↓ arrow selection with live quota)');
  console.log('  3) View AI quota dashboard (Gemini & Claude limits)');
  console.log('  4) List all saved profiles with quotas');
  console.log('  5) Detach current session (prepare for new account login)');
  console.log('  6) Cloud Database & Team Vault Sync (Neon / PostgreSQL)');
  console.log('  7) Install Tab Autocompletion (lazy programmer mode)');
  console.log('  8) Delete a profile from vault');
  console.log('  9) Uninstall from computer');
  console.log('  10) Exit\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Select an option [1-10]: ', async (choice) => {
    rl.close();
    const c = choice.trim();
    if (c === '1') {
      const rl2 = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl2.question('Enter profile name (press Enter to auto-detect email): ', async (name) => {
        rl2.close();
        await cmdSave(name.trim());
      });
    } else if (c === '2') {
      await cmdSwitch();
    } else if (c === '3') {
      await cmdQuota();
    } else if (c === '4') {
      await cmdList();
    } else if (c === '5') {
      await cmdDetach();
    } else if (c === '6') {
      console.log('\nTeam Vault & Cloud Database:');
      console.log('  1) Sync accounts (Two-way Push & Pull)');
      console.log('  2) Push local accounts to cloud');
      console.log('  3) Pull team accounts from cloud');
      console.log('  4) Check database connection status');
      console.log('  5) Disconnect database');
      const rl3 = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl3.question('Select [1-5]: ', async (sub) => {
        rl3.close();
        if (sub.trim() === '1') await cliDbSync();
        else if (sub.trim() === '2') await cliDbPush();
        else if (sub.trim() === '3') await cliDbPull();
        else if (sub.trim() === '4') await cliDbStatus();
        else if (sub.trim() === '5') cliDbDisconnect();
      });
    } else if (c === '7') {
      installCompletion();
    } else if (c === '8') {
      const selected = await pickInteractive();
      if (selected) cmdDelete(selected);
    } else if (c === '9') {
      uninstallFromSystem(false);
    } else {
      console.log('Goodbye!');
    }
  });
}

function showHelp() {
  console.log(`${BOLD}ag-auth${NC} - Universal Multi-Account Session Vault (${BOLD}Antigravity & OpenAI Codex${NC})`);
  console.log(`Pure JavaScript / Node.js Engine (${VERSION})\n`);
  console.log(`${BOLD}Usage:${NC}`);
  console.log('  @                                 Instant interactive switcher with live quotas & plan badges');
  console.log('  @ <profile>                       Directly switch to an account by email/name');
  console.log('  ag-auth switch                    Interactive arrow-key account selector');
  console.log('  ag-auth switch <profile>          Switch surfaces (Antigravity CLI/IDE/2.0 & OpenAI Codex)');
  console.log('  ag-auth switch <profile> -t codex Switch only OpenAI Codex credentials');
  console.log('  ag-auth switch <profile> -t ag    Switch only Antigravity credentials');
  console.log('  ag-auth switch <profile> -s ide   Switch only Antigravity IDE');
  console.log('  ag-auth current                   Show active sessions, runtime surfaces, and quotas');
  console.log('  ag-auth list [--refresh]          List all stored profiles with quotas and plan tiers');
  console.log('  ag-auth quota [profile]           Display detailed quota / subscription dashboard');
  console.log('  ag-auth save [name]               Archive current session (auto-captures Antigravity + Codex)');
  console.log('  ag-auth save [name] -t codex      Archive only current OpenAI Codex session');
  console.log('  ag-auth detach [-t tool]          Stash active session & clear tokens for clean login');
  console.log('  ag-auth delete [profile]          Remove a profile from vault');
  console.log('  ag-auth uninstall [--purge]       Cleanly delete this tool from computer (keep or wipe data)\n');
  console.log(`${BOLD}Team Vault & Cloud Database:${NC}`);
  console.log('  ag-auth db setup [url] [key]      Connect database (PostgreSQL / Neon, Supabase, Folder)');
  console.log('  ag-auth db status                 Check connection health, auto-sync status & profile count');
  console.log('  ag-auth db sync                   Two-way sync (push local accounts + pull team accounts)');
  console.log('  ag-auth db push                   Encrypt and upload local accounts to team database');
  console.log('  ag-auth db pull                   Download and decrypt team accounts into local vault\n');
  console.log(`${BOLD}Shell Autocompletion:${NC}`);
  console.log('  ag-auth completion install        Install tab autocompletion for bash, zsh, fish, powershell');
  console.log('  ag-auth                           Launch full interactive menu\n');
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const baseCmd = path.basename(process.argv[1]);

  // Invoked directly as '@'
  if (baseCmd === '@' || process.argv[1].endsWith(path.sep + '@')) {
    await cmdSwitch(rawArgs[0] || '', 'all', 'auto');
    return;
  }

  // Parse surface flag (-s / --surface) and tool flag (-t / --tool)
  let surface = 'all';
  let tool = baseCmd.includes('codex') ? 'codex' : 'auto';
  const filteredArgs = [];

  for (let i = 0; i < rawArgs.length; i++) {
    const a = rawArgs[i];
    if (a === '-s' || a === '--surface') {
      surface = rawArgs[i + 1] || 'all';
      i++;
    } else if (a.startsWith('--surface=')) {
      surface = a.split('=')[1] || 'all';
    } else if (a === '-t' || a === '--tool') {
      const val = (rawArgs[i + 1] || '').toLowerCase();
      tool = (val === 'ag' || val === 'antigravity') ? 'antigravity' : val;
      i++;
    } else if (a.startsWith('--tool=')) {
      const val = a.split('=')[1].toLowerCase();
      tool = (val === 'ag' || val === 'antigravity') ? 'antigravity' : val;
    } else {
      filteredArgs.push(a);
    }
  }

  let cmd = filteredArgs[0] || '';

  // Shorthand: `ag-auth codex <subcommand>`
  if (cmd === 'codex') {
    tool = 'codex';
    cmd = filteredArgs[1] || 'current';
    filteredArgs.splice(0, 1);
  }

  if (cmd === '@') {
    await cmdSwitch(filteredArgs[1] || '', surface, tool);
  } else if (cmd === 'switch' || cmd === 'use') {
    await cmdSwitch(filteredArgs[1] || '', surface, tool);
  } else if (cmd === 'current' || cmd === 'status') {
    await cmdCurrent();
  } else if (cmd === 'list' || cmd === 'ls') {
    const refresh = filteredArgs.includes('--refresh') || filteredArgs.includes('-r');
    await cmdList(refresh);
  } else if (cmd === 'quota' || cmd === 'limits') {
    const refresh = filteredArgs.includes('--refresh') || filteredArgs.includes('-r');
    const target = filteredArgs.slice(1).find(a => !a.startsWith('-')) || '';
    await cmdQuota(target, refresh);
  } else if (cmd === 'save' || cmd === 'archive') {
    await cmdSave(filteredArgs[1] || '', tool);
  } else if (cmd === 'detach' || cmd === 'new' || cmd === 'logout-temp') {
    await cmdDetach(surface, tool);
  } else if (cmd === 'delete' || cmd === 'rm') {
    cmdDelete(filteredArgs[1] || '');
  } else if (cmd === 'db' || cmd === 'sync-db' || cmd === 'cloud') {
    const sub = filteredArgs[1] || 'status';
    if (sub === 'setup' || sub === 'configure') {
      await cliDbSetup(filteredArgs[2], filteredArgs[3]);
    } else if (sub === 'status' || sub === 'info') {
      await cliDbStatus();
    } else if (sub === 'push' || sub === 'upload') {
      await cliDbPush();
    } else if (sub === 'pull' || sub === 'download') {
      await cliDbPull();
    } else if (sub === 'sync') {
      await cliDbSync();
    } else if (sub === 'auto-sync' || sub === 'autosync') {
      await cliDbAutoSync(filteredArgs[2] || 'status');
    } else if (sub === 'daemon') {
      const interval = parseInt(filteredArgs[2] || '300', 10);
      await cliDbDaemon(isNaN(interval) ? 300 : interval);
    } else if (sub === 'disconnect' || sub === 'unlink') {
      cliDbDisconnect();
    } else {
      console.log('Usage: ag-auth db [setup [url] [passphrase]|status|push|pull|sync|auto-sync [on|off]|daemon|disconnect]');
    }
  } else if (cmd === '_profiles') {
    const profiles = getVaultProfiles();
    for (const p of profiles) console.log(p);
  } else if (cmd === 'completion') {
    const shell = filteredArgs[1] || '';
    if (shell === 'bash') console.log(getBashCompletionScript());
    else if (shell === 'zsh') console.log(getZshCompletionScript());
    else if (shell === 'fish') console.log(getFishCompletionScript());
    else if (shell === 'powershell') console.log(getPowerShellCompletionScript());
    else if (shell === 'install') installCompletion();
    else console.log('Usage: ag-auth completion [bash|zsh|fish|powershell|install]');
  } else if (cmd === 'uninstall' || cmd === 'remove-all') {
    const purge = filteredArgs.includes('--purge') || filteredArgs.includes('-p');
    uninstallFromSystem(purge);
  } else if (cmd === 'version' || cmd === '-v' || cmd === '--version') {
    console.log(`Universal ag-auth version ${VERSION} (${PLATFORM}) [Pure Node.js Engine]`);
  } else if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
    showHelp();
  } else if (!cmd) {
    await cmdInteractive();
  } else {
    console.log(`${RED}Unknown command:${NC} ${cmd}`);
    console.log("Run 'ag-auth help' for all commands.");
    process.exit(1);
  }
}

main().catch(err => {
  console.error(`\x1b[31mFatal error:\x1b[0m ${err.message}`);
  process.exit(1);
});
