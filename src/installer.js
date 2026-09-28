/**
 * Universal Antigravity Auth Vault
 * Cross-Platform Hidden Directory Installer & Clean Uninstaller
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { HOME, HIDDEN_DIR, VAULT_DIR, IS_WIN, GREEN, YELLOW, RED, CYAN, BOLD, NC } = require('./config');
const { installCompletion } = require('./completions');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function installToHiddenDir(sourceDir) {
  console.log(`${BOLD}${CYAN}========================================================${NC}`);
  console.log(`${BOLD}${CYAN}  Universal Antigravity Auth Vault — Node.js Installer  ${NC}`);
  console.log(`${BOLD}${CYAN}  macOS • Linux • Windows (CLI, IDE, 2.0 Desktop)       ${NC}`);
  console.log(`${BOLD}${CYAN}========================================================${NC}\n`);

  console.log(`1. Installing to hidden system directory: ${BOLD}${HIDDEN_DIR}${NC}...`);
  fs.mkdirSync(HIDDEN_DIR, { recursive: true });

  const items = ['bin', 'src', 'package.json', 'README.md', 'LICENSE', 'install.sh', 'uninstall.sh', 'install.ps1', 'uninstall.ps1'];
  for (const item of items) {
    const src = path.join(sourceDir, item);
    const dest = path.join(HIDDEN_DIR, item);
    if (fs.existsSync(src)) {
      copyRecursiveSync(src, dest);
    }
  }

  // Ensure node_modules (e.g. pg) is available in HIDDEN_DIR
  const srcModules = path.join(sourceDir, 'node_modules');
  const destModules = path.join(HIDDEN_DIR, 'node_modules');
  if (fs.existsSync(srcModules) && !fs.existsSync(destModules)) {
    try { copyRecursiveSync(srcModules, destModules); } catch (_) {}
  }
  if (!fs.existsSync(path.join(HIDDEN_DIR, 'node_modules', 'pg'))) {
    try {
      spawnSync(IS_WIN ? 'npm.cmd' : 'npm', ['install', '--omit=dev', '--silent'], {
        cwd: HIDDEN_DIR,
        stdio: 'ignore'
      });
    } catch (_) {}
  }

  // Ensure binaries are executable
  const installedAgAuth = path.join(HIDDEN_DIR, 'bin', IS_WIN ? 'ag-auth.cmd' : 'ag-auth');
  const installedAgAuthJs = path.join(HIDDEN_DIR, 'bin', 'ag-auth.js');
  if (!IS_WIN) {
    try {
      if (fs.existsSync(installedAgAuth)) fs.chmodSync(installedAgAuth, 0o755);
      if (fs.existsSync(installedAgAuthJs)) fs.chmodSync(installedAgAuthJs, 0o755);
    } catch (_) {}
  }

  const binDir = IS_WIN ? path.join(HOME, 'bin') : path.join(HOME, '.local', 'bin');
  fs.mkdirSync(binDir, { recursive: true });

  console.log(`2. Linking binaries to: ${BOLD}${binDir}${NC}...`);
  if (IS_WIN) {
    try {
      fs.copyFileSync(path.join(HIDDEN_DIR, 'bin', 'ag-auth.cmd'), path.join(binDir, 'ag-auth.cmd'));
      fs.copyFileSync(path.join(HIDDEN_DIR, 'bin', '@.cmd'), path.join(binDir, '@.cmd'));
    } catch (_) {}
  } else {
    const targetBin = path.join(binDir, 'ag-auth');
    const targetAt = path.join(binDir, '@');

    try { if (fs.existsSync(targetBin) || fs.lstatSync(targetBin).isSymbolicLink()) fs.unlinkSync(targetBin); } catch (_) {}
    try { if (fs.existsSync(targetAt) || fs.lstatSync(targetAt).isSymbolicLink()) fs.unlinkSync(targetAt); } catch (_) {}

    try {
      fs.symlinkSync(installedAgAuth, targetBin);
      fs.symlinkSync(targetBin, targetAt);
    } catch (_) {
      fs.copyFileSync(installedAgAuth, targetBin);
      fs.copyFileSync(installedAgAuth, targetAt);
    }
    try {
      fs.chmodSync(targetBin, 0o755);
      fs.chmodSync(targetAt, 0o755);
    } catch (_) {}
  }

  console.log(`3. Configuring PATH and Shell Aliases...`);
  if (!IS_WIN) {
    const rcFiles = [path.join(HOME, '.zshrc'), path.join(HOME, '.bashrc')];
    const pathLine = 'export PATH="$HOME/.local/bin:$PATH"';
    const aliasLine = 'alias @="ag-auth @"';

    for (const rc of rcFiles) {
      if (fs.existsSync(rc)) {
        let content = fs.readFileSync(rc, 'utf8');
        let modified = false;
        if (!content.includes('.local/bin')) {
          content += `\n${pathLine}\n`;
          modified = true;
        }
        if (!content.includes('alias @=')) {
          content += `\n${aliasLine}\n`;
          modified = true;
        }
        if (modified) fs.writeFileSync(rc, content, 'utf8');
      }
    }

    console.log(`4. Installing tab autocompletion...`);
    try {
      installCompletion();
    } catch (_) {}
  } else {
    try {
      const psScript = `
        $UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
        $BinPath = "$HOME\\bin"
        if ($UserPath -notlike "*$BinPath*") {
          [Environment]::SetEnvironmentVariable("Path", "$UserPath;$BinPath", "User")
        }
      `;
      spawnSync('powershell', ['-NoProfile', '-Command', psScript], { stdio: 'ignore' });
    } catch (_) {}
  }

  console.log(`\n${GREEN}✔ Universal Antigravity Auth Vault successfully installed!${NC}\n`);
  console.log(`${BOLD}${CYAN}How to Use:${NC}`);
  console.log(`  ${BOLD}@${NC}                           Launch instant arrow-key switcher`);
  console.log(`  ${BOLD}ag-auth switch <TAB>${NC}        Tab autocompletion for all saved accounts`);
  console.log(`  ${BOLD}ag-auth db setup "<uri>"${NC}    Connect to Neon / PostgreSQL team vault`);
  console.log(`  ${BOLD}ag-auth uninstall${NC}           Cleanly delete this tool anytime\n`);
}

function uninstallFromSystem(purgeData = false) {
  console.log(`${BOLD}${YELLOW}========================================================${NC}`);
  console.log(`${BOLD}${YELLOW}  Universal Antigravity Auth Vault — Uninstaller        ${NC}`);
  console.log(`${BOLD}${YELLOW}========================================================${NC}\n`);

  console.log(`1. Removing hidden installation directory: ${HIDDEN_DIR}...`);
  if (fs.existsSync(HIDDEN_DIR)) {
    try {
      fs.rmSync(HIDDEN_DIR, { recursive: true, force: true });
      console.log(`  ${GREEN}✔ Deleted ${HIDDEN_DIR}${NC}`);
    } catch (e) {
      console.log(`  ${RED}✖ Could not remove ${HIDDEN_DIR}: ${e.message}${NC}`);
    }
  }

  console.log(`2. Removing binary executables & shortcuts...`);
  const binDir = IS_WIN ? path.join(HOME, 'bin') : path.join(HOME, '.local', 'bin');
  const files = IS_WIN
    ? [path.join(binDir, 'ag-auth.cmd'), path.join(binDir, 'ag-auth.ps1'), path.join(binDir, '@.cmd')]
    : [path.join(binDir, 'ag-auth'), path.join(binDir, '@')];

  for (const f of files) {
    if (fs.existsSync(f)) {
      try {
        fs.unlinkSync(f);
        console.log(`  ${GREEN}✔ Removed ${f}${NC}`);
      } catch (_) {}
    }
  }

  console.log(`3. Removing shell completions...`);
  const completions = [
    path.join(HOME, '.zfunc', '_ag-auth'),
    path.join(HOME, '.ag-auth-completion.bash'),
    path.join(HOME, '.config', 'fish', 'completions', 'ag-auth.fish'),
    path.join(HOME, '.config', 'fish', 'completions', '@.fish')
  ];
  for (const c of completions) {
    if (fs.existsSync(c)) {
      try {
        fs.unlinkSync(c);
        console.log(`  ${GREEN}✔ Removed ${c}${NC}`);
      } catch (_) {}
    }
  }

  console.log(`4. Cleaning shell startup files...`);
  const rcFiles = [path.join(HOME, '.zshrc'), path.join(HOME, '.bashrc'), path.join(HOME, '.bash_profile')];
  for (const rc of rcFiles) {
    if (fs.existsSync(rc)) {
      let content = fs.readFileSync(rc, 'utf8');
      const filtered = content
        .split('\n')
        .filter(l => !l.includes('ag-auth') && !l.includes('alias @=') && !l.includes('.zfunc') && !l.includes('.ag-auth-completion'))
        .join('\n');
      if (filtered !== content) {
        fs.writeFileSync(rc, filtered, 'utf8');
        console.log(`  ${GREEN}✔ Cleaned ${rc}${NC}`);
      }
    }
  }

  if (purgeData) {
    if (fs.existsSync(VAULT_DIR)) {
      fs.rmSync(VAULT_DIR, { recursive: true, force: true });
      console.log(`  ${GREEN}✔ Purged all local token profiles and database configs (${VAULT_DIR}).${NC}`);
    }
  } else {
    console.log(`\n${CYAN}Notice:${NC} Your vaulted account tokens & database keys in ${BOLD}${VAULT_DIR}${NC} were kept safe.`);
    console.log(`To completely wipe all saved credentials, re-run with: ${BOLD}ag-auth uninstall --purge${NC}`);
  }

  console.log(`\n${GREEN}✔ Antigravity Auth Vault has been cleanly uninstalled from your computer!${NC}\n`);
}

module.exports = {
  installToHiddenDir,
  uninstallFromSystem
};
