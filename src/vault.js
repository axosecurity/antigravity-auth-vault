/**
 * Universal Antigravity Auth Vault
 * Core Vault Operations (Save, Switch, List, Quota, Detach, Interactive Picker)
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const {
  PROFILES_DIR,
  ACTIVE_TOKEN,
  ACTIVE_CREDS,
  ACTIVE_ACCOUNTS,
  IDE_STORAGE,
  APP_STORAGE,
  CLI_DIR,
  GEMINI_DIR,
  PLATFORM,
  IS_WIN,
  GREEN,
  YELLOW,
  RED,
  CYAN,
  MAGENTA,
  BOLD,
  DIM,
  NC,
  ensureVaultDirs
} = require('./config');
const { keyringRead, keyringSync, keyringDelete } = require('./keyring');
const { readSurfaceState, writeSurfaceState, isProcActive } = require('./surfaces');
const { getTokenEmail, getTokenExpiry, getProfileQuota, renderProgressBar, colorPct } = require('./quota');
const { getDbConfig, cliDbPush, cliDbAutoPull } = require('./db');

function getVaultProfiles() {
  if (!fs.existsSync(PROFILES_DIR)) return [];
  return fs.readdirSync(PROFILES_DIR)
    .filter(d => {
      const p = path.join(PROFILES_DIR, d);
      return fs.existsSync(path.join(p, 'antigravity-oauth-token')) && fs.statSync(p).isDirectory();
    })
    .sort();
}

async function cmdCurrent() {
  console.log(`${BOLD}${CYAN}=== Universal Antigravity Active Session ===${NC}`);
  console.log(`Platform:       ${BOLD}${PLATFORM}${NC}`);

  let email = '';
  let exp = '';
  let src = '';

  if (fs.existsSync(ACTIVE_TOKEN)) {
    email = getTokenEmail(ACTIVE_TOKEN);
    exp = getTokenExpiry(ACTIVE_TOKEN);
    src = `File (${ACTIVE_TOKEN})`;
  } else {
    email = getTokenEmail('keychain');
    if (email) {
      exp = getTokenExpiry('keychain');
      src = 'OS Keyring (service: gemini, account: antigravity)';
    }
  }

  if (!email) {
    console.log(`${YELLOW}Status:${NC} Detached / No active session found.`);
    console.log('Ready for fresh login via Antigravity CLI, IDE, or 2.0 Desktop.');
    return;
  }

  console.log(`${GREEN}Active Account:${NC} ${BOLD}${email}${NC}`);
  if (exp) console.log(`Token Expiry:   ${exp}`);
  console.log(`Storage Source: ${src}`);

  console.log(`\n${BOLD}Runtime Surfaces:${NC}`);
  if (fs.existsSync(ACTIVE_TOKEN)) {
    console.log(`  • ${GREEN}✔ CLI:${NC} Active in ${ACTIVE_TOKEN}`);
  } else {
    console.log(`  • ${YELLOW}○ CLI:${NC} Detached`);
  }

  if (IDE_STORAGE && fs.existsSync(IDE_STORAGE)) {
    console.log(`  • ${GREEN}✔ IDE:${NC} Storage connected (${IDE_STORAGE})`);
  } else {
    console.log(`  • ${DIM}○ IDE:${NC} Not installed or default DB not found`);
  }

  if (APP_STORAGE && fs.existsSync(APP_STORAGE)) {
    console.log(`  • ${GREEN}✔ 2.0 Desktop:${NC} Storage connected (${APP_STORAGE})`);
  } else {
    console.log(`  • ${DIM}○ 2.0 Desktop:${NC} Not installed or default DB not found`);
  }

  const pdir = path.join(PROFILES_DIR, email);
  if (fs.existsSync(pdir)) {
    const q = await getProfileQuota(pdir, false);
    if (q) {
      console.log(`\n${BOLD}AI Quota Limits:${NC}`);
      const gw = q.gemini?.weekly || {};
      const g5 = q.gemini?.['5h'] || {};
      const cw = q.claude?.weekly || {};
      const c5 = q.claude?.['5h'] || {};

      const gwBar = renderProgressBar(gw.pct);
      const gwRes = gw.resets_in ? ` ${DIM}(resets: ${gw.resets_in})${NC}` : '';
      console.log(`  Gemini: ${gwBar} ${colorPct(gw.pct)} weekly${gwRes} | ${colorPct(g5.pct)} 5h`);

      const cwBar = renderProgressBar(cw.pct);
      const cwRes = cw.resets_in ? ` ${DIM}(resets: ${cw.resets_in})${NC}` : '';
      console.log(`  Claude: ${cwBar} ${colorPct(cw.pct)} weekly${cwRes} | ${colorPct(c5.pct)} 5h`);
    }
  }
}

async function cmdSave(targetName) {
  ensureVaultDirs();

  let email = '';
  if (fs.existsSync(ACTIVE_TOKEN)) {
    email = getTokenEmail(ACTIVE_TOKEN);
  } else {
    email = getTokenEmail('keychain');
  }

  if (!email && !fs.existsSync(ACTIVE_TOKEN)) {
    console.log(`${RED}Error:${NC} No active token found in filesystem or OS Keyring to save.`);
    process.exit(1);
  }

  const profileName = targetName || email;
  if (!profileName) {
    console.log(`${RED}Error:${NC} Could not auto-detect email claim. Provide a name: ag-auth save <name>`);
    process.exit(1);
  }

  const profilePath = path.join(PROFILES_DIR, profileName);
  fs.mkdirSync(profilePath, { recursive: true });
  if (!IS_WIN) {
    try { fs.chmodSync(profilePath, 0o700); } catch (_) {}
  }

  if (fs.existsSync(ACTIVE_TOKEN)) {
    fs.copyFileSync(ACTIVE_TOKEN, path.join(profilePath, 'antigravity-oauth-token'));
  } else {
    const raw = keyringRead();
    fs.writeFileSync(path.join(profilePath, 'antigravity-oauth-token'), raw, 'utf8');
  }

  if (fs.existsSync(ACTIVE_CREDS)) {
    fs.copyFileSync(ACTIVE_CREDS, path.join(profilePath, 'oauth_creds.json'));
  }
  if (fs.existsSync(ACTIVE_ACCOUNTS)) {
    fs.copyFileSync(ACTIVE_ACCOUNTS, path.join(profilePath, 'google_accounts.json'));
  }

  // Capture SQLite surface states
  if (IDE_STORAGE && fs.existsSync(IDE_STORAGE)) {
    const state = readSurfaceState(IDE_STORAGE);
    if (state) {
      fs.writeFileSync(path.join(profilePath, 'ide_state.json'), JSON.stringify(state, null, 2), 'utf8');
    }
  }
  if (APP_STORAGE && fs.existsSync(APP_STORAGE)) {
    const state = readSurfaceState(APP_STORAGE);
    if (state) {
      fs.writeFileSync(path.join(profilePath, 'app_state.json'), JSON.stringify(state, null, 2), 'utf8');
    }
  }

  const meta = {
    profile: profileName,
    email: email || profileName,
    platform: PLATFORM,
    saved_at: new Date().toISOString()
  };
  fs.writeFileSync(path.join(profilePath, 'profile.json'), JSON.stringify(meta, null, 2), 'utf8');

  console.log(`${GREEN}✔ Profile successfully saved to vault:${NC} ${BOLD}${profileName}${NC}`);
  console.log(`  Vault location: ${profilePath}`);

  let savedSurfaces = 'CLI';
  if (fs.existsSync(path.join(profilePath, 'ide_state.json'))) savedSurfaces += ' + IDE';
  if (fs.existsSync(path.join(profilePath, 'app_state.json'))) savedSurfaces += ' + 2.0 Desktop';
  console.log(`  Surfaces captured: ${GREEN}${savedSurfaces}${NC}`);

  // Auto-sync push if configured
  if (getDbConfig()) {
    console.log(`  ${CYAN}☁ Auto-syncing profile to team cloud vault...${NC}`);
    try {
      await cliDbPush();
      console.log(`  ${GREEN}✔ Profile synced to team database!${NC}`);
    } catch (_) {}
  }
}

async function cmdSwitch(target, surfaceChoice = 'all') {
  ensureVaultDirs();
  await cliDbAutoPull(true);

  let selected = target;
  if (!selected) {
    selected = await pickInteractive();
    if (!selected) process.exit(0);
  }

  const profilePath = path.join(PROFILES_DIR, selected);
  const tokenFile = path.join(profilePath, 'antigravity-oauth-token');

  if (!fs.existsSync(profilePath) || !fs.existsSync(tokenFile)) {
    console.log(`${RED}Error:${NC} Profile '${selected}' does not exist in vault.`);
    await cmdList();
    process.exit(1);
  }

  // Auto-preserve active account
  const currentEmail = getTokenEmail(ACTIVE_TOKEN);
  if (currentEmail && currentEmail !== selected) {
    try {
      await cmdSave(currentEmail);
    } catch (_) {}
  }

  // 1. Sync CLI token & OS Keyring
  if (surfaceChoice === 'all' || surfaceChoice === 'cli') {
    fs.mkdirSync(CLI_DIR, { recursive: true });
    fs.copyFileSync(tokenFile, ACTIVE_TOKEN);
    keyringSync(ACTIVE_TOKEN);

    const credsFile = path.join(profilePath, 'oauth_creds.json');
    if (fs.existsSync(credsFile)) {
      fs.copyFileSync(credsFile, ACTIVE_CREDS);
    }
    const accsFile = path.join(profilePath, 'google_accounts.json');
    if (fs.existsSync(accsFile)) {
      fs.copyFileSync(accsFile, ACTIVE_ACCOUNTS);
    }
  }

  // 2. Restore IDE State
  if ((surfaceChoice === 'all' || surfaceChoice === 'ide') && IDE_STORAGE && fs.existsSync(IDE_STORAGE)) {
    const ideStatePath = path.join(profilePath, 'ide_state.json');
    if (fs.existsSync(ideStatePath)) {
      try {
        const state = JSON.parse(fs.readFileSync(ideStatePath, 'utf8'));
        writeSurfaceState(IDE_STORAGE, state);
      } catch (_) {}
    }
    if (isProcActive('Antigravity IDE')) {
      console.log(`  ${YELLOW}ℹ Antigravity IDE is running. Reload window (Cmd/Ctrl+Shift+P -> 'Reload Window') to apply session.${NC}`);
    }
  }

  // 3. Restore 2.0 Desktop State
  if ((surfaceChoice === 'all' || surfaceChoice === 'app') && APP_STORAGE && fs.existsSync(APP_STORAGE)) {
    const appStatePath = path.join(profilePath, 'app_state.json');
    if (fs.existsSync(appStatePath)) {
      try {
        const state = JSON.parse(fs.readFileSync(appStatePath, 'utf8'));
        writeSurfaceState(APP_STORAGE, state);
      } catch (_) {}
    }
    if (isProcActive('Antigravity')) {
      console.log(`  ${YELLOW}ℹ Antigravity 2.0 Desktop App is running. Restart app to apply session.${NC}`);
    }
  }

  console.log(`${GREEN}✔ Successfully switched to profile:${NC} ${BOLD}${selected}${NC} (surface: ${surfaceChoice})`);
  await cmdCurrent();
}

async function cmdList(refresh = false) {
  ensureVaultDirs();
  await cliDbAutoPull(true);

  const profiles = getVaultProfiles();
  const activeEmail = getTokenEmail(ACTIVE_TOKEN);

  console.log(`${BOLD}${CYAN}=== Vaulted Antigravity Profiles & Quotas ===${NC}\n`);
  if (profiles.length === 0) {
    console.log(`${YELLOW}No profiles found in vault.${NC}`);
    console.log(`Run '${BOLD}ag-auth save${NC}' to archive your active session.`);
    return;
  }

  for (const p of profiles) {
    const pdir = path.join(PROFILES_DIR, p);
    const isActive = p === activeEmail;
    const marker = isActive ? `${GREEN}${BOLD}▶ ${NC}` : '  ';
    const tag = isActive ? ` ${GREEN}[CURRENT ACTIVE]${NC}` : '';

    let surfaces = 'CLI';
    if (fs.existsSync(path.join(pdir, 'ide_state.json'))) surfaces += ', IDE';
    if (fs.existsSync(path.join(pdir, 'app_state.json'))) surfaces += ', App';

    console.log(`${marker}${BOLD}${p}${NC}${tag} ${DIM}(${surfaces})${NC}`);

    const q = await getProfileQuota(pdir, refresh);
    if (q) {
      const gw = q.gemini?.weekly || {};
      const g5 = q.gemini?.['5h'] || {};
      const cw = q.claude?.weekly || {};
      const c5 = q.claude?.['5h'] || {};

      const gwBar = renderProgressBar(gw.pct);
      const gwRes = gw.resets_in ? ` ${DIM}(resets: ${gw.resets_in})${NC}` : '';
      console.log(`      Gemini:  ${gwBar} ${colorPct(gw.pct)} weekly${gwRes} | ${colorPct(g5.pct)} 5h`);

      const cwBar = renderProgressBar(cw.pct);
      const cwRes = cw.resets_in ? ` ${DIM}(resets: ${cw.resets_in})${NC}` : '';
      console.log(`      Claude:  ${cwBar} ${colorPct(cw.pct)} weekly${cwRes} | ${colorPct(c5.pct)} 5h`);
    }

    const exp = getTokenExpiry(path.join(pdir, 'antigravity-oauth-token'));
    if (exp) console.log(`      Token Expiry: ${exp}`);
    console.log('');
  }
}

async function cmdQuota(targetProfile, refresh = false) {
  ensureVaultDirs();
  const activeEmail = getTokenEmail(ACTIVE_TOKEN);
  const target = targetProfile || activeEmail;

  if (!target) {
    console.log(`${YELLOW}No active profile found.${NC} Specify an account: ag-auth quota <email>`);
    return;
  }

  const pdir = path.join(PROFILES_DIR, target);
  if (!fs.existsSync(pdir)) {
    console.log(`${RED}Error:${NC} Profile '${target}' not found in vault.`);
    return;
  }

  console.log(`${BOLD}${CYAN}=== Antigravity AI Quota Dashboard: ${target} ===${NC}\n`);
  const q = await getProfileQuota(pdir, refresh);
  if (!q) {
    console.log(`${YELLOW}Could not retrieve quota for ${target}.${NC}`);
    return;
  }

  const gw = q.gemini?.weekly || {};
  const g5 = q.gemini?.['5h'] || {};
  const cw = q.claude?.weekly || {};
  const c5 = q.claude?.['5h'] || {};

  console.log(`  ${BOLD}• Gemini Models (Flash, Pro):${NC}`);
  console.log(`      Weekly Limit:  ${renderProgressBar(gw.pct, 12)} ${colorPct(gw.pct)} ${gw.resets_in ? `(${gw.resets_in})` : ''}`);
  console.log(`      5-Hour Window: ${renderProgressBar(g5.pct, 12)} ${colorPct(g5.pct)} ${g5.resets_in ? `(${g5.resets_in})` : ''}\n`);

  console.log(`  ${BOLD}• Claude & GPT Models (Sonnet, Opus, GPT-OSS):${NC}`);
  console.log(`      Weekly Limit:  ${renderProgressBar(cw.pct, 12)} ${colorPct(cw.pct)} ${cw.resets_in ? `(${cw.resets_in})` : ''}`);
  console.log(`      5-Hour Window: ${renderProgressBar(c5.pct, 12)} ${colorPct(c5.pct)} ${c5.resets_in ? `(${c5.resets_in})` : ''}\n`);
}

async function cmdDetach(surfaceChoice = 'all') {
  ensureVaultDirs();
  console.log(`${YELLOW}Preparing to detach current session (surface: ${surfaceChoice})...${NC}`);

  const email = getTokenEmail(ACTIVE_TOKEN);
  if (email) {
    console.log(`1. Auto-saving active session for '${BOLD}${email}${NC}'...`);
    await cmdSave(email);
  }

  if (surfaceChoice === 'all' || surfaceChoice === 'cli') {
    console.log(`2. Removing CLI active token: ${ACTIVE_TOKEN}...`);
    try { fs.unlinkSync(ACTIVE_TOKEN); } catch (_) {}
    console.log('3. Clearing OS Keyring entry (gemini/antigravity)...');
    keyringDelete();
  }

  const emptyState = {
    'antigravityUnifiedStateSync.oauthToken': '',
    'antigravityUnifiedStateSync.userStatus': '',
    'antigravityAuthStatus': null
  };

  if ((surfaceChoice === 'all' || surfaceChoice === 'ide') && IDE_STORAGE && fs.existsSync(IDE_STORAGE)) {
    writeSurfaceState(IDE_STORAGE, emptyState);
  }
  if ((surfaceChoice === 'all' || surfaceChoice === 'app') && APP_STORAGE && fs.existsSync(APP_STORAGE)) {
    writeSurfaceState(APP_STORAGE, emptyState);
  }

  console.log(`${GREEN}✔ Active session successfully detached!${NC}`);
  console.log(`\n${BOLD}${CYAN}Next Steps to Authenticate New Account:${NC}`);
  console.log(`  1. Launch Antigravity CLI, IDE, or Desktop App`);
  console.log(`  2. Complete Google OAuth in browser`);
  console.log(`  3. Run: ${BOLD}ag-auth save${NC}`);
  console.log(`  4. Switch anytime using: ${BOLD}@${NC}`);
}

function cmdDelete(target) {
  ensureVaultDirs();
  if (!target) {
    console.log(`${RED}Error:${NC} Specify profile to delete: ag-auth delete <profile>`);
    return;
  }
  const pdir = path.join(PROFILES_DIR, target);
  if (!fs.existsSync(pdir)) {
    console.log(`${RED}Error:${NC} Profile '${target}' does not exist.`);
    return;
  }
  fs.rmSync(pdir, { recursive: true, force: true });
  console.log(`${GREEN}✔ Profile '${target}' removed from vault.${NC}`);
}

async function pickInteractive() {
  ensureVaultDirs();
  await cliDbAutoPull(true);

  const profiles = getVaultProfiles();
  if (profiles.length === 0) {
    console.log(`${YELLOW}No saved profiles found in vault.${NC}`);
    return null;
  }

  const activeEmail = getTokenEmail(ACTIVE_TOKEN);
  const items = [];

  for (const p of profiles) {
    const pdir = path.join(PROFILES_DIR, p);
    const q = await getProfileQuota(pdir, false);
    let tag = '';
    if (q) {
      const gp = q.gemini?.weekly?.pct;
      const cp = q.claude?.weekly?.pct;
      const parts = [];
      if (gp !== undefined) parts.push(`Gem: ${colorPct(gp)}`);
      if (cp !== undefined) parts.push(`Cld: ${colorPct(cp)}`);
      if (parts.length > 0) tag = `[${parts.join(' | ')}]`;
    }
    items.push({ name: p, tag });
  }

  if (!process.stdin.isTTY) {
    return items[0].name;
  }

  let selected = 0;
  for (let i = 0; i < items.length; i++) {
    if (items[i].name !== activeEmail) {
      selected = i;
      break;
    }
  }

  return new Promise((resolve) => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stderr.write('\x1b[?25l'); // Hide cursor

    function render() {
      let out = '\r\x1b[K\x1b[1;36mSelect Universal Antigravity Account (↑/↓ arrow keys, Enter to switch, q to cancel):\x1b[0m\n\r';
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const isActive = item.name === activeEmail ? ` ${GREEN}[CURRENT ACTIVE]${NC}` : '';
        const tagStr = item.tag ? `  ${item.tag}` : '';
        if (i === selected) {
          out += `\r\x1b[K  ${GREEN}${BOLD}▶ [${i + 1}] ${item.name}${NC}${tagStr}${isActive}\n\r`;
        } else {
          out += `\r\x1b[K    [${i + 1}] ${item.name}${tagStr}${isActive}\n\r`;
        }
      }
      process.stderr.write(out);
      process.stderr.write(`\x1b[${items.length + 1}A`);
    }

    render();

    function onData(key) {
      if (key === '\u001b[A' || key === '\u001bOA' || key === 'k') { // UP
        selected = (selected - 1 + items.length) % items.length;
        render();
      } else if (key === '\u001b[B' || key === '\u001bOB' || key === 'j') { // DOWN
        selected = (selected + 1) % items.length;
        render();
      } else if (key === '\r' || key === '\n') { // ENTER
        cleanup();
        resolve(items[selected].name);
      } else if (key >= '1' && key <= '9') {
        const num = parseInt(key, 10);
        if (num >= 1 && num <= items.length) {
          selected = num - 1;
          cleanup();
          resolve(items[selected].name);
        }
      } else if (key === '\u0003' || key.toLowerCase() === 'q') { // Ctrl+C or q
        cleanup();
        resolve(null);
      }
    }

    function cleanup() {
      process.stdin.removeListener('data', onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stderr.write(`\x1b[${items.length + 1}B\r\x1b[K\x1b[?25h`); // Restore cursor
    }

    process.stdin.on('data', onData);
  });
}

module.exports = {
  getVaultProfiles,
  cmdCurrent,
  cmdSave,
  cmdSwitch,
  cmdList,
  cmdQuota,
  cmdDetach,
  cmdDelete,
  pickInteractive
};
