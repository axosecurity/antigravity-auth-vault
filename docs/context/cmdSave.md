# cmdSave

## Function
- **Name:** `cmdSave`
- **File:** `src/vault.js`
- **Line Range:** Lines 173–278

## How It Works

`cmdSave` captures, normalizes, and stores active credentials, session state, and database settings for Google Antigravity runtimes and OpenAI Codex environments into a secured profile within the local vault (`~/.gemini-vault/profiles/<profileName>`), with optional cloud synchronization.

1. **Vault Preparation and Active Identity Discovery (lines 173–186):**
   - Ensures vault directories exist via `ensureVaultDirs()` on line 174.
   - Discovers active Antigravity email from `ACTIVE_TOKEN` (`~/.gemini/antigravity-cli/antigravity-oauth-token`) or falls back to reading from OS Keyring (`'keychain'`) (lines 176–181).
   - Reads active Codex authentication via `readCodexAuth()` and session data via `readCodexSession()`, extracting the account email from JWT claims via `getCodexEmail(codexAuth)` (lines 183–185).

2. **Tool Selection and Validation (lines 187–193):**
   - Evaluates boolean flags `saveAg` and `saveCodex` against `toolChoice` (`'auto'`, `'all'`, `'antigravity'`, or `'codex'`) and token availability (lines 187–188).
   - If neither Antigravity nor Codex has an active session, halts with an error message (lines 190–193).

3. **Profile Name Determination & Directory Creation (lines 195–218):**
   - Determines the target profile folder name (lines 196–207):
     - Uses `targetName` if explicitly provided by the user.
     - If omitted, auto-detects based on active session emails: if both Antigravity and Codex share the same email, or if only one is present, uses that email as the profile identifier.
   - If no profile name can be resolved, exits with an error (lines 209–212).
   - Creates the profile directory `PROFILES_DIR/<profileName>` (`~/.gemini-vault/profiles/<profileName>`) and restricts POSIX permissions to `0700` (`rwx------`) on non-Windows platforms (lines 214–218).

4. **Capturing Antigravity Credentials & Surface State (lines 222–245):**
   - If `saveAg` is true:
     - Copies `ACTIVE_TOKEN` or dumps raw credentials from the OS Keyring to `<profilePath>/antigravity-oauth-token` (lines 224–229).
     - Copies `oauth_creds.json` and `google_accounts.json` if they exist (lines 230–235).
     - Reads SQLite `ItemTable` state from Antigravity IDE (`IDE_STORAGE`) via `readSurfaceState` and serializes it to `ide_state.json` (lines 236–239).
     - Reads SQLite `ItemTable` state from Antigravity 2.0 Desktop app (`APP_STORAGE`) via `readSurfaceState` and serializes it to `app_state.json` (lines 240–243).
     - Appends `'Antigravity (CLI, IDE, 2.0)'` to captured surface summary (line 244).

5. **Capturing OpenAI Codex Credentials & Session State (lines 247–254):**
   - If `saveCodex` is true:
     - Writes `codexAuth` JSON data to `<profilePath>/codex_auth.json` (line 249).
     - If `codexSession` exists, writes it to `<profilePath>/codex_session.json` (lines 250–252).
     - Appends `'OpenAI Codex (CLI, Daemon)'` to captured surface summary (line 253).

6. **Manifest Generation and Cloud Push (lines 256–277):**
   - Writes a unified metadata manifest `<profilePath>/profile.json` containing `profile`, `ag_email`, `codex_email`, `platform`, `tool` (`'dual'`, `'codex'`, or `'antigravity'`), and `saved_at` timestamp (lines 256–264).
   - Displays confirmation details to the console (lines 266–269).
   - If cloud database configuration is enabled (`getDbConfig()`), automatically triggers `cliDbPush()` to sync the newly archived profile into the PostgreSQL cloud vault (lines 270–277).

## Code Copy

```javascript
// src/vault.js (lines 173–278)
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
```
