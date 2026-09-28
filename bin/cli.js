#!/usr/bin/env node

/**
 * Universal Antigravity Auth Vault
 * Cross-Platform Installer & CLI Runner for NPX
 * macOS • Linux • Windows
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync, execSync } = require('child_process');

const isWin = os.platform() === 'win32';
const homeDir = os.homedir();
const hiddenVaultDir = path.join(homeDir, '.antigravity-auth-vault');
const sourceRootDir = path.resolve(__dirname, '..');

// Colors
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function installVault() {
  console.log(`${BOLD}${CYAN}========================================================${RESET}`);
  console.log(`${BOLD}${CYAN}  Universal Antigravity Auth Vault — NPX Installer      ${RESET}`);
  console.log(`${BOLD}${CYAN}  macOS • Linux • Windows (CLI, IDE, 2.0 Desktop)       ${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================${RESET}\n`);

  console.log(`1. Installing to hidden system directory: ${BOLD}${hiddenVaultDir}${RESET}...`);
  fs.mkdirSync(hiddenVaultDir, { recursive: true });

  // Copy bin files and scripts
  const itemsToCopy = ['bin', 'package.json', 'README.md', 'LICENSE', 'install.sh', 'uninstall.sh', 'install.ps1', 'uninstall.ps1'];
  for (const item of itemsToCopy) {
    const src = path.join(sourceRootDir, item);
    const dest = path.join(hiddenVaultDir, item);
    if (fs.existsSync(src)) {
      copyRecursiveSync(src, dest);
    }
  }

  const installedAgAuth = path.join(hiddenVaultDir, 'bin', isWin ? 'ag-auth.cmd' : 'ag-auth');
  if (!isWin && fs.existsSync(installedAgAuth)) {
    try {
      fs.chmodSync(installedAgAuth, 0o755);
    } catch (_) {}
  }

  // Determine bin directory
  const binDir = isWin ? path.join(homeDir, 'bin') : path.join(homeDir, '.local', 'bin');
  fs.mkdirSync(binDir, { recursive: true });

  console.log(`2. Linking binaries to: ${BOLD}${binDir}${RESET}...`);
  if (isWin) {
    // Windows: copy .cmd files
    try {
      fs.copyFileSync(path.join(hiddenVaultDir, 'bin', 'ag-auth.cmd'), path.join(binDir, 'ag-auth.cmd'));
      fs.copyFileSync(path.join(hiddenVaultDir, 'bin', '@.cmd'), path.join(binDir, '@.cmd'));
    } catch (e) {
      console.log(`${YELLOW}Warning linking Windows commands: ${e.message}${RESET}`);
    }
  } else {
    // macOS / Linux: symlink
    const targetBin = path.join(binDir, 'ag-auth');
    const targetAt = path.join(binDir, '@');
    try {
      if (fs.existsSync(targetBin) || fs.lstatSync(targetBin).isSymbolicLink()) {
        fs.unlinkSync(targetBin);
      }
    } catch (_) {}
    try {
      if (fs.existsSync(targetAt) || fs.lstatSync(targetAt).isSymbolicLink()) {
        fs.unlinkSync(targetAt);
      }
    } catch (_) {}

    try {
      fs.symlinkSync(installedAgAuth, targetBin);
      fs.symlinkSync(targetBin, targetAt);
    } catch (e) {
      // Fallback to copy if symlink fails
      fs.copyFileSync(installedAgAuth, targetBin);
      fs.copyFileSync(installedAgAuth, targetAt);
    }
    try {
      fs.chmodSync(targetBin, 0o755);
      fs.chmodSync(targetAt, 0o755);
    } catch (_) {}
  }

  console.log(`3. Configuring PATH and Shell Aliases...`);
  if (!isWin) {
    const rcFiles = [path.join(homeDir, '.zshrc'), path.join(homeDir, '.bashrc')];
    const pathLine = `export PATH="$HOME/.local/bin:$PATH"`;
    const aliasLine = `alias @="ag-auth @"`;

    for (const rc of rcFiles) {
      if (fs.existsSync(rc)) {
        let content = fs.readFileSync(rc, 'utf-8');
        let modified = false;
        if (!content.includes('.local/bin')) {
          content += `\n${pathLine}\n`;
          modified = true;
        }
        if (!content.includes('alias @=')) {
          content += `\n${aliasLine}\n`;
          modified = true;
        }
        if (modified) {
          fs.writeFileSync(rc, content, 'utf-8');
        }
      }
    }

    // Auto install tab completion
    console.log(`4. Installing tab autocompletion...`);
    try {
      spawnSync(installedAgAuth, ['completion', 'install'], { stdio: 'inherit' });
    } catch (_) {}

    console.log(`\n${GREEN}✔ Universal Antigravity Auth Vault successfully installed!${RESET}\n`);
    try {
      spawnSync(installedAgAuth, ['current'], { stdio: 'inherit' });
    } catch (_) {}
  } else {
    // Windows PATH check
    try {
      const psScript = `
        $UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
        $BinPath = "$HOME\\bin"
        if ($UserPath -notlike "*$BinPath*") {
          [Environment]::SetEnvironmentVariable("Path", "$UserPath;$BinPath", "User")
        }
      `;
      spawnSync('powershell', ['-NoProfile', '-Command', psScript], { stdio: 'inherit' });
    } catch (_) {}

    console.log(`\n${GREEN}✔ Universal Antigravity Auth Vault successfully installed on Windows!${RESET}\n`);
    try {
      spawnSync(installedAgAuth, ['current'], { stdio: 'inherit' });
    } catch (_) {}
  }

  console.log(`\n${BOLD}${CYAN}How to Use:${RESET}`);
  console.log(`  ${BOLD}@${RESET}                           Launch instant arrow-key switcher`);
  console.log(`  ${BOLD}ag-auth switch <TAB>${RESET}        Tab autocompletion for all saved accounts`);
  console.log(`  ${BOLD}ag-auth db setup "<uri>"${RESET}    Connect to Neon / PostgreSQL team vault`);
  console.log(`  ${BOLD}ag-auth uninstall${RESET}           Cleanly delete this tool anytime\n`);
}

function uninstallVault(purgeData = false) {
  console.log(`${BOLD}${YELLOW}========================================================${RESET}`);
  console.log(`${BOLD}${YELLOW}  Universal Antigravity Auth Vault — Uninstaller        ${RESET}`);
  console.log(`${BOLD}${YELLOW}========================================================${RESET}\n`);

  console.log(`1. Removing hidden installation directory: ${hiddenVaultDir}...`);
  if (fs.existsSync(hiddenVaultDir)) {
    try {
      fs.rmSync(hiddenVaultDir, { recursive: true, force: true });
      console.log(`  ${GREEN}✔ Deleted ${hiddenVaultDir}${RESET}`);
    } catch (e) {
      console.log(`  ${RED}✖ Could not remove ${hiddenVaultDir}: ${e.message}${RESET}`);
    }
  }

  console.log(`2. Removing binary symlinks...`);
  const binDir = isWin ? path.join(homeDir, 'bin') : path.join(homeDir, '.local', 'bin');
  const filesToRemove = isWin
    ? [path.join(binDir, 'ag-auth.cmd'), path.join(binDir, 'ag-auth.ps1'), path.join(binDir, '@.cmd')]
    : [path.join(binDir, 'ag-auth'), path.join(binDir, '@')];

  for (const f of filesToRemove) {
    if (fs.existsSync(f)) {
      try {
        fs.unlinkSync(f);
        console.log(`  ${GREEN}✔ Removed ${f}${RESET}`);
      } catch (_) {}
    }
  }

  console.log(`3. Removing shell completions...`);
  const completions = [
    path.join(homeDir, '.zfunc', '_ag-auth'),
    path.join(homeDir, '.ag-auth-completion.bash'),
    path.join(homeDir, '.config', 'fish', 'completions', 'ag-auth.fish'),
    path.join(homeDir, '.config', 'fish', 'completions', '@.fish')
  ];
  for (const c of completions) {
    if (fs.existsSync(c)) {
      try {
        fs.unlinkSync(c);
        console.log(`  ${GREEN}✔ Removed ${c}${RESET}`);
      } catch (_) {}
    }
  }

  console.log(`4. Cleaning shell configuration files...`);
  const rcFiles = [path.join(homeDir, '.zshrc'), path.join(homeDir, '.bashrc'), path.join(homeDir, '.bash_profile')];
  for (const rc of rcFiles) {
    if (fs.existsSync(rc)) {
      let content = fs.readFileSync(rc, 'utf-8');
      const filtered = content
        .split('\n')
        .filter((line) => !line.includes('ag-auth') && !line.includes('alias @="ag-auth @"') && !line.includes('.zfunc') && !line.includes('.ag-auth-completion'))
        .join('\n');
      if (filtered !== content) {
        fs.writeFileSync(rc, filtered, 'utf-8');
        console.log(`  ${GREEN}✔ Cleaned ${rc}${RESET}`);
      }
    }
  }

  const dataVault = path.join(homeDir, '.gemini', 'auth_vault');
  if (purgeData) {
    if (fs.existsSync(dataVault)) {
      fs.rmSync(dataVault, { recursive: true, force: true });
      console.log(`  ${GREEN}✔ Purged all local vaulted tokens and database config: ${dataVault}${RESET}`);
    }
  } else {
    console.log(`\n${CYAN}ℹ Notice:${RESET} Your vaulted tokens & cloud database keys in ${BOLD}${dataVault}${RESET} were preserved.`);
    console.log(`  To completely remove all stored account data: run with ${BOLD}--purge${RESET}`);
  }

  console.log(`\n${GREEN}✔ Uninstallation complete! Antigravity Auth Vault has been cleanly removed.${RESET}\n`);
}

// CLI Dispatcher
const args = process.argv.slice(2);
if (args.includes('--uninstall') || args.includes('uninstall') || args.includes('-u')) {
  const purge = args.includes('--purge') || args.includes('-p');
  uninstallVault(purge);
  process.exit(0);
}

if (args.includes('--help') || args.includes('-h')) {
  console.log(`${BOLD}Universal Antigravity Auth Vault (NPX CLI)${RESET}\n`);
  console.log(`Usage:`);
  console.log(`  npx antigravity-auth-vault              Install to hidden ~/.antigravity-auth-vault`);
  console.log(`  npx antigravity-auth-vault uninstall    Cleanly remove binary links and shell hooks`);
  console.log(`  npx antigravity-auth-vault --purge      Remove binary and delete stored tokens`);
  console.log(`  npx antigravity-auth-vault <command>    Run any ag-auth command directly`);
  process.exit(0);
}

// If subcommands are passed directly, e.g. `npx antigravity-auth-vault switch`
const subcommands = ['switch', 'quota', 'list', 'current', 'save', 'detach', 'delete', 'db', 'completion', 'version', 'help'];
if (args.length > 0 && subcommands.includes(args[0])) {
  const scriptPath = path.join(__dirname, isWin ? 'ag-auth.cmd' : 'ag-auth');
  const res = spawnSync(scriptPath, args, { stdio: 'inherit' });
  process.exit(res.status || 0);
}

// Default: Run installation
installVault();
