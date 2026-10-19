# cmdSwitch

## Function
- **Name:** `cmdSwitch`
- **File:** `src/vault.js`
- **Line Range:** Lines 280–386

## How It Works

`cmdSwitch` manages atomic switching of active credentials and session tokens across Antigravity surfaces (CLI, IDE SQLite database, 2.0 Desktop app SQLite database) and OpenAI Codex CLI/Daemon environments.

1. **Vault Readiness and Remote Sync (lines 280–283):**
   - Ensures vault directory hierarchy exists (`ensureVaultDirs()`).
   - Runs `cliDbAutoPull(true)` on line 282 to pull any updated profiles from the remote cloud vault if team synchronization is enabled.

2. **Target Profile Resolution (lines 284–295):**
   - Evaluates the provided `target` argument (line 284).
   - If no target is passed (e.g. running `@` or `ag-auth switch` without arguments), invokes interactive raw terminal selection `pickInteractive()` allowing the user to select an account using arrow keys or numeric keys 1–9 (lines 285–288).
   - Verifies the requested profile directory exists in `PROFILES_DIR/<selected>` (`~/.gemini-vault/profiles/<selected>`), printing available profiles and exiting if not found (lines 290–295).

3. **Tool Classification & Provider Routing (lines 297–300):**
   - Calls `getProfileType(selected)` on line 297, which inspects the profile folder for `antigravity-oauth-token` and `codex_auth.json` to classify the target as `'antigravity'`, `'codex'`, or `'dual'`.
   - Resolves boolean flags `switchAg` and `switchCodex` based on profile type and the requested `toolChoice` (`'auto'`, `'all'`, `'antigravity'`, or `'codex'`) (lines 298–299).

4. **Automatic Active Session Preservation (lines 301–316):**
   - Prior to overwriting credentials, prevents data loss by automatically snapshotting the currently active Antigravity session if it belongs to a different email: `cmdSave(currentEmail, 'antigravity')` (lines 302–307).
   - Similarly snapshots the active Codex session if it belongs to a different email: `cmdSave(curCodexEmail, 'codex')` (lines 309–316).

5. **Antigravity Surface Restoration (lines 320–364):**
   - If `switchAg` is active and `antigravity-oauth-token` exists in the profile:
     - **CLI Surface (`surfaceChoice === 'all' || surfaceChoice === 'cli'`)**: Creates `~/.gemini/antigravity-cli`, copies `antigravity-oauth-token` to `ACTIVE_TOKEN`, calls `keyringSync(ACTIVE_TOKEN)` to update the OS Keychain/Keyring (`service: gemini, account: antigravity`), and restores `oauth_creds.json` and `google_accounts.json` if available (lines 324–334).
     - **IDE Surface (`surfaceChoice === 'all' || surfaceChoice === 'ide'`)**: If `IDE_STORAGE` exists (`state.vscdb`), parses `ide_state.json` and writes the authentication keys directly into the SQLite `ItemTable` via `writeSurfaceState(IDE_STORAGE, state)` (lines 336–348). Checks if the Antigravity IDE process is running and displays a reload notification if needed.
     - **2.0 Desktop Surface (`surfaceChoice === 'all' || surfaceChoice === 'app'`)**: If `APP_STORAGE` exists, updates the Desktop app's SQLite `ItemTable` via `writeSurfaceState(APP_STORAGE, state)` (lines 350–362).

6. **OpenAI Codex Surface Restoration & Daemon Restart (lines 366–381):**
   - If `switchCodex` is active and `codex_auth.json` exists in the profile:
     - Parses `codex_auth.json` (and optional `codex_session.json`).
     - Calls `writeCodexAuth(authData, sessData)` to atomically update `~/.codex/auth.json` and `~/.codex-session` (lines 370–375).
     - If the Codex background daemon (`isCodexDaemonActive()`) is running, `writeCodexAuth` restarts the daemon via `codex app-server daemon restart`, ensuring background processes immediately use the switched credentials without manual intervention (lines 376–378).

7. **Completion & Verification (lines 383–386):**
   - Logs restored surfaces and runs `cmdCurrent()` to display the newly activated session details and quotas.

## Code Copy

```javascript
// src/vault.js (lines 280–386)
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
```
