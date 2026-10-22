/**
 * Universal Antigravity & OpenAI Codex Auth Vault
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
  CODEX_AUTH,
  CODEX_SESSION,
  PLATFORM,
  IS_WIN,
  GREEN,
  BLUE,
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
const {
  isCodexInstalled,
  readCodexAuth,
  readCodexSession,
  getCodexEmail,
  getCodexExpiry,
  getCodexAccountInfo,
  isCodexDaemonActive,
  restartCodexDaemon,
  writeCodexAuth,
  detachCodex
} = require('./codex');
const { getDbConfig, cliDbPush, cliDbAutoPull } = require('./db');

function getVaultProfiles() {
  if (!fs.existsSync(PROFILES_DIR)) return [];
  return fs.readdirSync(PROFILES_DIR)
    .filter(d => {
      const p = path.join(PROFILES_DIR, d);
      if (!fs.statSync(p).isDirectory()) return false;
      const hasAg = fs.existsSync(path.join(p, 'antigravity-oauth-token'));
      const hasCodex = fs.existsSync(path.join(p, 'codex_auth.json'));
      return hasAg || hasCodex;
    })
    .sort();
}

function getProfileType(profileName) {
  const p = path.join(PROFILES_DIR, profileName);
  const hasAg = fs.existsSync(path.join(p, 'antigravity-oauth-token'));
  const hasCodex = fs.existsSync(path.join(p, 'codex_auth.json'));
  if (hasAg && hasCodex) return 'dual';
  if (hasCodex) return 'codex';
  return 'antigravity';
}

async function cmdCurrent() {
  console.log(`${BOLD}${CYAN}=== Universal Antigravity & OpenAI Codex Active Sessions ===${NC}`);
  console.log(`Platform:       ${BOLD}${PLATFORM}${NC}\n`);

  // 1. Antigravity Session Status
  console.log(`${BOLD}${MAGENTA}--- Google Antigravity Session ---${NC}`);
  let agEmail = '';
  let agExp = '';
  let agSrc = '';

  if (fs.existsSync(ACTIVE_TOKEN)) {
    agEmail = getTokenEmail(ACTIVE_TOKEN);
    agExp = getTokenExpiry(ACTIVE_TOKEN);
    agSrc = `File (${ACTIVE_TOKEN})`;
  } else {
    agEmail = getTokenEmail('keychain');
    if (agEmail) {
      agExp = getTokenExpiry('keychain');
      agSrc = 'OS Keyring (service: gemini, account: antigravity)';
    }
  }

  if (!agEmail) {
    console.log(`${YELLOW}Status:${NC} Detached / No active Antigravity session found.`);
  } else {
    console.log(`${GREEN}Active Account:${NC} ${BOLD}${agEmail}${NC}`);
    if (agExp) console.log(`Token Expiry:   ${agExp}`);
    console.log(`Storage Source: ${agSrc}`);

    console.log(`\nRuntime Surfaces:`);
    if (fs.existsSync(ACTIVE_TOKEN)) {
      console.log(`  • ${GREEN}✔ CLI (agy):${NC} Active in ${ACTIVE_TOKEN}`);
    } else {
      console.log(`  • ${YELLOW}○ CLI (agy):${NC} Detached`);
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

    const pdir = path.join(PROFILES_DIR, agEmail);
    if (fs.existsSync(pdir)) {
      const q = await getProfileQuota(pdir, false);
      if (q) {
        console.log(`\n${BOLD}AI Quota Limits:${NC}`);
        const gw = q.gemini?.weekly || {};
        const g5 = q.gemini?.['5h'] || {};
        const cw = q.claude?.weekly || {};
        const c5 = q.claude?.['5h'] || {};

        if (gw.unmetered) {
          console.log(`  Gemini: ${renderProgressBar(100, 8)} ${GREEN}Unlimited (Unmetered Standard Tier)${NC}`);
        } else {
          const g5Res = g5.resets_in ? ` ${DIM}(resets: ${g5.resets_in})${NC}` : '';
          const gwRes = gw.resets_in ? ` ${DIM}(resets: ${gw.resets_in})${NC}` : '';
          console.log(`  Gemini: 5h: ${renderProgressBar(g5.pct, 8)} ${colorPct(g5.pct)}${g5Res} | Wk: ${renderProgressBar(gw.pct, 8)} ${colorPct(gw.pct)}${gwRes}`);
        }

        const c5Res = c5.resets_in ? ` ${DIM}(resets: ${c5.resets_in})${NC}` : '';
        const cwRes = cw.resets_in ? ` ${DIM}(resets: ${cw.resets_in})${NC}` : '';
        console.log(`  Claude: 5h: ${renderProgressBar(c5.pct, 8)} ${colorPct(c5.pct)}${c5Res} | Wk: ${renderProgressBar(cw.pct, 8)} ${colorPct(cw.pct)}${cwRes}`);
      }
    }
  }

  // 2. OpenAI Codex Session Status
  console.log(`\n${BOLD}${CYAN}--- OpenAI Codex Session ---${NC}`);
  if (!isCodexInstalled()) {
    console.log(`${DIM}Codex CLI is not installed on this system.${NC}`);
  } else {
    const codexAuth = readCodexAuth();
    if (!codexAuth) {
      console.log(`${YELLOW}Status:${NC} Detached / No active Codex auth.json found.`);
    } else {
      const codexEmail = getCodexEmail(codexAuth);
      const codexExp = getCodexExpiry(codexAuth);
      console.log(`${GREEN}Active Account:${NC} ${BOLD}${codexEmail || 'Authenticated User'}${NC}`);
      console.log(`Auth Mode:      ${codexAuth.auth_mode || 'chatgpt'}`);
      if (codexExp) console.log(`Token Expiry:   ${codexExp}`);
      if (codexAuth.tokens?.account_id) console.log(`Account ID:     ${codexAuth.tokens.account_id}`);

      const daemonActive = isCodexDaemonActive();
      if (daemonActive) {
        console.log(`App-Server:     ${GREEN}✔ Running${NC} (persistent local daemon)`);
      } else {
        console.log(`App-Server:     ${DIM}○ Inactive${NC} (starts on next codex invocation)`);
      }

      // Check account plan details
      const info = await getCodexAccountInfo(codexAuth);
      if (info?.plan_type) {
        console.log(`Plan Tier:      ${BOLD}${CYAN}${info.plan_type.toUpperCase()}${NC}${info.organization ? ` (Org: ${info.organization})` : ''}`);
      }
    }
  }
}

async function cmdSave(targetName, toolChoice = 'auto') {
  ensureVaultDirs();

  let agEmail = '';
  if (fs.existsSync(ACTIVE_TOKEN)) {
    agEmail = getTokenEmail(ACTIVE_TOKEN);
  } else {
    agEmail = getTokenEmail('keychain');
  }

  const codexAuth = readCodexAuth();
  const codexSession = readCodexSession();
  const codexEmail = codexAuth ? getCodexEmail(codexAuth) : '';

  const saveAg = (toolChoice === 'all' || toolChoice === 'antigravity' || toolChoice === 'auto') && (agEmail || fs.existsSync(ACTIVE_TOKEN));
  const saveCodex = (toolChoice === 'all' || toolChoice === 'codex' || toolChoice === 'auto') && codexAuth;

  if (!saveAg && !saveCodex) {
    console.log(`${RED}Error:${NC} No active Antigravity or Codex session found to save.`);
    process.exit(1);
  }

  // Determine profile name
  let profileName = targetName;
  if (!profileName) {
    if (saveAg && saveCodex && agEmail === codexEmail) {
      profileName = agEmail;
    } else if (saveAg && !saveCodex) {
      profileName = agEmail;
    } else if (saveCodex && !saveAg) {
      profileName = codexEmail;
    } else {
      profileName = agEmail || codexEmail;
    }
  }

  if (!profileName) {
    console.log(`${RED}Error:${NC} Could not auto-detect session email. Specify name: ag-auth save <name>`);
    process.exit(1);
  }

  const profilePath = path.join(PROFILES_DIR, profileName);
  fs.mkdirSync(profilePath, { recursive: true });
  if (!IS_WIN) {
    try { fs.chmodSync(profilePath, 0o700); } catch (_) {}
  }

  const captured = [];

  // Save Antigravity session
  if (saveAg) {
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
    if (IDE_STORAGE && fs.existsSync(IDE_STORAGE)) {
      const state = readSurfaceState(IDE_STORAGE);
      if (state) fs.writeFileSync(path.join(profilePath, 'ide_state.json'), JSON.stringify(state, null, 2), 'utf8');
    }
    if (APP_STORAGE && fs.existsSync(APP_STORAGE)) {
      const state = readSurfaceState(APP_STORAGE);
      if (state) fs.writeFileSync(path.join(profilePath, 'app_state.json'), JSON.stringify(state, null, 2), 'utf8');
    }
    captured.push('Antigravity (CLI, IDE, 2.0)');
  }

  // Save Codex session
  if (saveCodex) {
    fs.writeFileSync(path.join(profilePath, 'codex_auth.json'), JSON.stringify(codexAuth, null, 2), 'utf8');
    if (codexSession) {
      fs.writeFileSync(path.join(profilePath, 'codex_session.json'), JSON.stringify(codexSession, null, 2), 'utf8');
    }
    captured.push('OpenAI Codex (CLI, Daemon)');
  }

  const meta = {
    profile: profileName,
    ag_email: agEmail || null,
    codex_email: codexEmail || null,
    platform: PLATFORM,
    tool: (saveAg && saveCodex) ? 'dual' : (saveCodex ? 'codex' : 'antigravity'),
    saved_at: new Date().toISOString()
  };
  fs.writeFileSync(path.join(profilePath, 'profile.json'), JSON.stringify(meta, null, 2), 'utf8');

  console.log(`${GREEN}✔ Profile successfully saved to vault:${NC} ${BOLD}${profileName}${NC}`);
  console.log(`  Vault location: ${profilePath}`);
  console.log(`  Providers captured: ${GREEN}${captured.join(' + ')}${NC}`);

  // Auto-sync push if configured
  if (getDbConfig()) {
    console.log(`  ${CYAN}☁ Auto-syncing profile to team cloud vault...${NC}`);
    try {
      await cliDbPush();
      console.log(`  ${GREEN}✔ Profile synced to team database!${NC}`);
    } catch (_) {}
  }
}

async function cmdSwitch(target, surfaceChoice = 'all', toolChoice = 'auto') {
  ensureVaultDirs();
  await cliDbAutoPull(true);

  let selected = target;
  if (!selected) {
    selected = await pickInteractive();
    if (!selected) process.exit(0);
  }

  const profilePath = path.join(PROFILES_DIR, selected);
  if (!fs.existsSync(profilePath)) {
    console.log(`${RED}Error:${NC} Profile '${selected}' does not exist in vault.`);
    await cmdList();
    process.exit(1);
  }

  const pType = getProfileType(selected);
  const switchAg = (toolChoice === 'all' || toolChoice === 'antigravity' || toolChoice === 'auto') && (pType === 'antigravity' || pType === 'dual');
  const switchCodex = (toolChoice === 'all' || toolChoice === 'codex' || toolChoice === 'auto') && (pType === 'codex' || pType === 'dual');

  // Auto-preserve active Antigravity session if switching Antigravity
  if (switchAg) {
    const currentEmail = getTokenEmail(ACTIVE_TOKEN);
    if (currentEmail && currentEmail !== selected) {
      try { await cmdSave(currentEmail, 'antigravity'); } catch (_) {}
    }
  }

  // Auto-preserve active Codex session if switching Codex
  if (switchCodex) {
    const curCodexAuth = readCodexAuth();
    const curCodexEmail = getCodexEmail(curCodexAuth);
    if (curCodexEmail && curCodexEmail !== selected) {
      try { await cmdSave(curCodexEmail, 'codex'); } catch (_) {}
    }
  }

  const restored = [];

  // 1. Switch Antigravity Surfaces
  if (switchAg) {
    const tokenFile = path.join(profilePath, 'antigravity-oauth-token');
    if (fs.existsSync(tokenFile)) {
      if (surfaceChoice === 'all' || surfaceChoice === 'cli') {
        fs.mkdirSync(CLI_DIR, { recursive: true });
        fs.copyFileSync(tokenFile, ACTIVE_TOKEN);
        keyringSync(ACTIVE_TOKEN);

        const credsFile = path.join(profilePath, 'oauth_creds.json');
        if (fs.existsSync(credsFile)) fs.copyFileSync(credsFile, ACTIVE_CREDS);
        const accsFile = path.join(profilePath, 'google_accounts.json');
        if (fs.existsSync(accsFile)) fs.copyFileSync(accsFile, ACTIVE_ACCOUNTS);
        restored.push('Antigravity CLI');
      }

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
        restored.push('Antigravity IDE');
      }

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
        restored.push('Antigravity 2.0 Desktop');
      }
    }
  }

  // 2. Switch Codex Surface
  if (switchCodex) {
    const codexFile = path.join(profilePath, 'codex_auth.json');
    if (fs.existsSync(codexFile)) {
      try {
        const authData = JSON.parse(fs.readFileSync(codexFile, 'utf8'));
        const sessFile = path.join(profilePath, 'codex_session.json');
        const sessData = fs.existsSync(sessFile) ? JSON.parse(fs.readFileSync(sessFile, 'utf8')) : null;
        writeCodexAuth(authData, sessData);
        restored.push('OpenAI Codex');
        if (isCodexDaemonActive()) {
          console.log(`  ${GREEN}✔ Codex app-server daemon restarted with new credentials.${NC}`);
        }
      } catch (_) {}
    }
  }

  console.log(`${GREEN}✔ Successfully switched to profile:${NC} ${BOLD}${selected}${NC}`);
  console.log(`  Restored surfaces: ${GREEN}${restored.join(', ')}${NC}`);
  await cmdCurrent();
}

async function cmdList(refresh = false) {
  ensureVaultDirs();
  await cliDbAutoPull(true);

  const profiles = getVaultProfiles();
  const activeAgEmail = getTokenEmail(ACTIVE_TOKEN);
  const activeCodexAuth = readCodexAuth();
  const activeCodexEmail = getCodexEmail(activeCodexAuth);

  console.log(`${BOLD}${CYAN}=== Vaulted Antigravity & Codex Profiles & Quotas ===${NC}\n`);
  if (profiles.length === 0) {
    console.log(`${YELLOW}No profiles found in vault.${NC}`);
    console.log(`Run '${BOLD}ag-auth save${NC}' to archive your active session.`);
    return;
  }

  // Concurrently prefetch quotas for high performance
  const quotaMap = {};
  await Promise.all(profiles.map(async (p) => {
    const pdir = path.join(PROFILES_DIR, p);
    try {
      quotaMap[p] = await getProfileQuota(pdir, refresh);
    } catch (_) {
      quotaMap[p] = null;
    }
  }));

  for (const p of profiles) {
    const pdir = path.join(PROFILES_DIR, p);
    const pType = getProfileType(p);
    const isActiveAg = p === activeAgEmail;
    const isActiveCodex = p === activeCodexEmail;
    const isActive = isActiveAg || isActiveCodex;
    const marker = isActive ? `${GREEN}${BOLD}▶ ${NC}` : '  ';
    const tag = isActive ? ` ${GREEN}[ACTIVE]${NC}` : '';

    let badge = '';
    if (pType === 'dual') badge = `${MAGENTA}[Dual: Antigravity + Codex]${NC}`;
    else if (pType === 'codex') badge = `${CYAN}[OpenAI Codex]${NC}`;
    else badge = `${BLUE}[Antigravity]${NC}`;

    console.log(`${marker}${BOLD}${p}${NC}${tag} ${badge}`);

    const q = quotaMap[p];
    if (q) {
      if (q.gemini || q.claude) {
        const gw = q.gemini?.weekly || {};
        const g5 = q.gemini?.['5h'] || {};
        const cw = q.claude?.weekly || {};
        const c5 = q.claude?.['5h'] || {};

        if (gw.unmetered) {
          console.log(`      Gemini:  ${renderProgressBar(100, 8)} ${GREEN}Unlimited (Unmetered Standard Tier)${NC}`);
        } else {
          const g5Res = g5.resets_in ? ` ${DIM}(resets: ${g5.resets_in})${NC}` : '';
          const gwRes = gw.resets_in ? ` ${DIM}(resets: ${gw.resets_in})${NC}` : '';
          console.log(`      Gemini:  5h: ${renderProgressBar(g5.pct, 8)} ${colorPct(g5.pct)}${g5Res} | Wk: ${renderProgressBar(gw.pct, 8)} ${colorPct(gw.pct)}${gwRes}`);
        }

        const c5Res = c5.resets_in ? ` ${DIM}(resets: ${c5.resets_in})${NC}` : '';
        const cwRes = cw.resets_in ? ` ${DIM}(resets: ${cw.resets_in})${NC}` : '';
        console.log(`      Claude:  5h: ${renderProgressBar(c5.pct, 8)} ${colorPct(c5.pct)}${c5Res} | Wk: ${renderProgressBar(cw.pct, 8)} ${colorPct(cw.pct)}${cwRes}`);
      }

      if (q.codex) {
        const cdx = q.codex;
        console.log(`      Codex:   Plan: ${BOLD}${CYAN}${cdx.plan_type.toUpperCase()}${NC} | Mode: ${cdx.auth_mode}${cdx.organization ? ` | Org: ${cdx.organization}` : ''}`);
        if (cdx.token_expiry) console.log(`      Codex Token Expiry: ${cdx.token_expiry}`);
      }
    }

    const agTokenFile = path.join(pdir, 'antigravity-oauth-token');
    if (fs.existsSync(agTokenFile)) {
      const exp = getTokenExpiry(agTokenFile);
      if (exp) console.log(`      AG Token Expiry: ${exp}`);
    }
    console.log('');
  }
}

function printProfileQuotaCard(p, q, pType, isActive, indent = '  ') {
  const activeBadge = isActive ? ` ${GREEN}${BOLD}[ACTIVE]${NC}` : '';
  let badge = '';
  if (pType === 'dual') badge = `${MAGENTA}[Dual: Antigravity + Codex]${NC}`;
  else if (pType === 'codex') badge = `${CYAN}[OpenAI Codex]${NC}`;
  else badge = `${BLUE}[Antigravity]${NC}`;

  console.log(`${indent}${BOLD}${CYAN}▶ ${p}${NC}${activeBadge} ${badge}`);

  if (!q) {
    console.log(`${indent}    ${YELLOW}Could not retrieve quota details.${NC}\n`);
    return;
  }

  if (q.gemini || q.claude) {
    const gw = q.gemini?.weekly || {};
    const g5 = q.gemini?.['5h'] || {};
    const cw = q.claude?.weekly || {};
    const c5 = q.claude?.['5h'] || {};

    console.log(`${indent}    ${BOLD}${BLUE}• Google Gemini Models:${NC}`);
    if (gw.unmetered) {
      console.log(`${indent}        Status:        ${GREEN}${BOLD}Unlimited Capacity${NC} (Unmetered Standard Tier)`);
    } else {
      const g5Res = g5.resets_in ? ` (resets: ${g5.resets_in})` : '';
      const gwRes = gw.resets_in ? ` (resets: ${gw.resets_in})` : '';
      console.log(`${indent}        5-Hour Window: ${renderProgressBar(g5.pct, 12)} ${colorPct(g5.pct)}${g5Res}`);
      console.log(`${indent}        Weekly Limit:  ${renderProgressBar(gw.pct, 12)} ${colorPct(gw.pct)}${gwRes}`);
    }

    console.log(`${indent}    ${BOLD}${MAGENTA}• Claude & GPT Models (Code / Reasoning):${NC}`);
    const c5Res = c5.resets_in ? ` (resets: ${c5.resets_in})` : '';
    const cwRes = cw.resets_in ? ` (resets: ${cw.resets_in})` : '';
    console.log(`${indent}        5-Hour Window: ${renderProgressBar(c5.pct, 12)} ${colorPct(c5.pct)}${c5Res}`);
    console.log(`${indent}        Weekly Limit:  ${renderProgressBar(cw.pct, 12)} ${colorPct(cw.pct)}${cwRes}`);
  }

  if (q.codex) {
    const cdx = q.codex;
    console.log(`${indent}    ${BOLD}${CYAN}• OpenAI Codex Session:${NC}`);
    console.log(`${indent}        Plan Tier:     ${BOLD}${GREEN}${cdx.plan_type.toUpperCase()}${NC}`);
    console.log(`${indent}        Auth Mode:     ${cdx.auth_mode}`);
    if (cdx.organization) console.log(`${indent}        Organization:  ${cdx.organization}`);
    if (cdx.account_id) console.log(`${indent}        Account ID:    ${cdx.account_id}`);
    if (cdx.token_expiry) console.log(`${indent}        Token Expiry:  ${cdx.token_expiry}`);
  }
}

async function cmdQuota(targetProfile, refresh = true) {
  ensureVaultDirs();
  const activeAgEmail = getTokenEmail(ACTIVE_TOKEN);
  const activeCodexAuth = readCodexAuth();
  const activeCodexEmail = getCodexEmail(activeCodexAuth);

  const profiles = getVaultProfiles();
  if (profiles.length === 0) {
    console.log(`${YELLOW}No profiles found in vault.${NC}`);
    return;
  }

  // If a specific profile was requested
  if (targetProfile && targetProfile !== 'all') {
    const pdir = path.join(PROFILES_DIR, targetProfile);
    if (!fs.existsSync(pdir)) {
      console.log(`${RED}Error:${NC} Profile '${targetProfile}' not found in vault.`);
      return;
    }
    const pType = getProfileType(targetProfile);
    const isActive = (targetProfile === activeAgEmail || targetProfile === activeCodexEmail);
    console.log(`${BOLD}${CYAN}=== AI Quota & Plan Dashboard ===${NC}`);
    console.log(`${DIM}Fetching fresh live limits from Google Cloud Code & OpenAI...${NC}\n`);
    const q = await getProfileQuota(pdir, refresh);
    printProfileQuotaCard(targetProfile, q, pType, isActive, '  ');
    console.log('');
    return;
  }

  // Otherwise, refresh and display ALL AI agent profiles in vault
  console.log(`${BOLD}${CYAN}=== Live AI Quotas & Limits (All Agents Freshly Updated) ===${NC}`);
  console.log(`${DIM}Connecting to Google Cloud Code PA & OpenAI to update latest limits across all agents...${NC}\n`);

  for (const p of profiles) {
    const pdir = path.join(PROFILES_DIR, p);
    const pType = getProfileType(p);
    const isActive = (p === activeAgEmail || p === activeCodexEmail);
    const q = await getProfileQuota(pdir, refresh);
    printProfileQuotaCard(p, q, pType, isActive, '  ');
    console.log('');
  }
}

async function cmdDetach(surfaceChoice = 'all', toolChoice = 'all') {
  ensureVaultDirs();
  console.log(`${YELLOW}Preparing to detach session (surfaces: ${surfaceChoice}, tool: ${toolChoice})...${NC}`);

  const email = getTokenEmail(ACTIVE_TOKEN);
  if (email && (toolChoice === 'all' || toolChoice === 'antigravity')) {
    console.log(`1. Auto-saving active Antigravity session for '${BOLD}${email}${NC}'...`);
    await cmdSave(email, 'antigravity');
  }

  const codexAuth = readCodexAuth();
  const codexEmail = getCodexEmail(codexAuth);
  if (codexEmail && (toolChoice === 'all' || toolChoice === 'codex')) {
    console.log(`2. Auto-saving active Codex session for '${BOLD}${codexEmail}${NC}'...`);
    await cmdSave(codexEmail, 'codex');
  }

  // Detach Antigravity
  if (toolChoice === 'all' || toolChoice === 'antigravity') {
    if (surfaceChoice === 'all' || surfaceChoice === 'cli') {
      console.log(`Removing CLI active token: ${ACTIVE_TOKEN}...`);
      try { fs.unlinkSync(ACTIVE_TOKEN); } catch (_) {}
      console.log('Clearing OS Keyring entry (gemini/antigravity)...');
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
  }

  // Detach Codex
  if (toolChoice === 'all' || toolChoice === 'codex') {
    console.log('Detaching OpenAI Codex session...');
    detachCodex();
  }

  console.log(`${GREEN}✔ Active session(s) successfully detached!${NC}`);
  console.log(`\n${BOLD}${CYAN}Next Steps to Authenticate New Account:${NC}`);
  console.log(`  • Antigravity: Launch CLI (agy) or IDE -> OAuth login -> ${BOLD}ag-auth save${NC}`);
  console.log(`  • Codex: Run ${BOLD}codex login${NC} -> ${BOLD}ag-auth save${NC}`);
  console.log(`  • Instant Switcher: ${BOLD}@${NC}`);
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

  const activeAgEmail = getTokenEmail(ACTIVE_TOKEN);
  const activeCodexAuth = readCodexAuth();
  const activeCodexEmail = getCodexEmail(activeCodexAuth);

  const items = [];

  for (const p of profiles) {
    const pdir = path.join(PROFILES_DIR, p);
    const pType = getProfileType(p);
    const q = await getProfileQuota(pdir, false);
    let tag = '';

    if (q) {
      if (q.gemini || q.claude) {
        const parts = [];
        if (q.gemini) {
          const g5 = q.gemini['5h'];
          const gw = q.gemini.weekly;
          if (gw?.unmetered) {
            parts.push('Gem: Unmetered');
          } else {
            const isWk = gw?.resets_in && (!g5?.resets_in || gw.resets_in.includes('d'));
            const gemPct = isWk ? colorPct(gw.pct) : colorPct(g5?.pct ?? gw.pct);
            const gemRes = isWk ? `wk:${gw.resets_in}` : (g5?.resets_in ? `5h:${g5.resets_in}` : '');
            parts.push(`Gem: ${gemPct}${gemRes ? ` (${gemRes})` : ''}`);
          }
        }
        if (q.claude) {
          const c5 = q.claude['5h'];
          const cw = q.claude.weekly;
          const cldWk = colorPct(cw?.pct);
          const cld5h = colorPct(c5?.pct);
          const cldRes = cw?.resets_in && cw.pct < 100 ? ` (${cw.resets_in})` : (c5?.resets_in && c5.pct < 100 ? ` (${c5.resets_in})` : '');
          parts.push(`Cld 5h:${cld5h} Wk:${cldWk}${cldRes}`);
        }
        tag = `[${parts.join(' | ')}]`;
      } else if (q.codex?.plan_type) {
        tag = `[Plan: ${q.codex.plan_type.toUpperCase()} | Mode: ${q.codex.auth_mode}]`;
      }
    }

    let badge = '';
    if (pType === 'dual') badge = `(Dual)`;
    else if (pType === 'codex') badge = `(Codex)`;
    else badge = `(Antigravity)`;

    items.push({ name: p, tag, badge, pType });
  }

  if (!process.stdin.isTTY) {
    return items[0].name;
  }

  let selected = 0;
  for (let i = 0; i < items.length; i++) {
    if (items[i].name !== activeAgEmail && items[i].name !== activeCodexEmail) {
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
      let out = '\r\x1b[K\x1b[1;36mSelect Vault Account (↑/↓ arrow keys, Enter to switch, 1-9 direct, q to cancel):\x1b[0m\n\r';
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const isActive = (item.name === activeAgEmail || item.name === activeCodexEmail) ? ` ${GREEN}[ACTIVE]${NC}` : '';
        const tagStr = item.tag ? `  ${item.tag}` : '';
        const badgeStr = ` ${DIM}${item.badge}${NC}`;
        if (i === selected) {
          out += `\r\x1b[K  ${GREEN}${BOLD}▶ [${i + 1}] ${item.name}${NC}${badgeStr}${tagStr}${isActive}\n\r`;
        } else {
          out += `\r\x1b[K    [${i + 1}] ${item.name}${badgeStr}${tagStr}${isActive}\n\r`;
        }
      }
      process.stderr.write(out);
      process.stderr.write(`\x1b[${items.length + 1}A`);
    }

    render();

    function cleanup() {
      process.stdin.removeListener('data', onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stderr.write(`\x1b[${items.length + 1}B\r\x1b[K\x1b[?25h`); // Restore cursor
    }

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

    process.stdin.on('data', onData);
  });
}

module.exports = {
  getVaultProfiles,
  getProfileType,
  cmdCurrent,
  cmdSave,
  cmdSwitch,
  cmdList,
  cmdQuota,
  cmdDetach,
  cmdDelete,
  pickInteractive
};
