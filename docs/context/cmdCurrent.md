# cmdCurrent

## Function
- **Name:** `cmdCurrent`
- **File:** `src/vault.js`
- **Line Range:** Lines 72–171

## How It Works

`cmdCurrent` displays the currently active session state, storage locations, connected runtime surfaces, and real-time AI quota metrics across both Google Antigravity runtimes and OpenAI Codex environments.

1. **Header and Platform Banner (lines 72–75):**
   - Outputs the section header and displays the current operating system platform (darwin, linux, or win32) detected by `PLATFORM`.

2. **Google Antigravity Session Detection (lines 76–93):**
   - Checks if the primary Antigravity CLI token file exists at `ACTIVE_TOKEN` (`~/.gemini/antigravity-cli/antigravity-oauth-token`) on line 82.
   - If present, reads the account email via `getTokenEmail(ACTIVE_TOKEN)` and expiration timestamp via `getTokenExpiry(ACTIVE_TOKEN)`, marking the storage source as `File (<path>)` (lines 83–85).
   - If `ACTIVE_TOKEN` does not exist on disk, attempts to retrieve credentials from the operating system credential store via `getTokenEmail('keychain')` and `getTokenExpiry('keychain')` using OS Keyring (`service: gemini, account: antigravity`) (lines 86–92).

3. **Antigravity Status & Runtime Surface Inspection (lines 94–119):**
   - If no email is detected, reports status as detached (lines 94–95).
   - If authenticated, prints the active email, token expiration timestamp, and credential source (lines 97–99).
   - Inspects the three supported Antigravity execution surfaces (lines 101–118):
     - **CLI (`agy`)**: Verifies whether `ACTIVE_TOKEN` exists on disk (lines 102–106).
     - **Antigravity IDE**: Verifies whether `IDE_STORAGE` (`state.vscdb`) exists at the standard application support path (lines 108–112).
     - **2.0 Desktop**: Verifies whether `APP_STORAGE` exists for the Antigravity desktop application (lines 114–118).

4. **Antigravity AI Quota Inspection (lines 120–139):**
   - Resolves the profile directory `PROFILES_DIR/<agEmail>` (`~/.gemini-vault/profiles/<email>`) on line 120.
   - If the vault profile exists, invokes `getProfileQuota(pdir, false)` on line 122 to fetch cached quota metrics without triggering unnecessary network re-fetches.
   - Formats and renders visual progress bars and percentages for:
     - Gemini Models: Displays weekly limit and 5-hour window, or indicates `Unlimited (Unmetered Standard Tier)` if marked unmetered (lines 125–133).
     - Claude & GPT Models: Displays weekly quota percentage with reset countdown and 5-hour window limits (lines 134–137).

5. **OpenAI Codex Session & Daemon Status (lines 141–170):**
   - Checks if Codex CLI is installed on the host system via `isCodexInstalled()` (lines 143–145).
   - Reads the active Codex credentials file (`~/.codex/auth.json`) by invoking `readCodexAuth()` on line 146.
   - If unauthenticated, reports the Codex runtime as detached (lines 147–149).
   - If authenticated, extracts the account email (`getCodexEmail`), token expiry (`getCodexExpiry`), authentication mode (`chatgpt` or `api_key`), and account ID (lines 150–155).
   - Detects if the persistent background daemon (`app-server-daemon`) is actively running via `isCodexDaemonActive()` (reading PID from `~/.codex/app-server-daemon/daemon.pid`) (lines 157–162).
   - Queries ChatGPT backend account APIs via `getCodexAccountInfo(codexAuth)` to print subscription plan tier (e.g. `PLUS`, `TEAM`, `PRO`, `FREE`) and default organization title (lines 164–169).

## Code Copy

```javascript
// src/vault.js (lines 72–171)
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

        const gwBar = renderProgressBar(gw.pct);
        const gwText = gw.unmetered ? `${GREEN}Unlimited (Unmetered Standard Tier)${NC}` : `${colorPct(gw.pct)} weekly | ${colorPct(g5.pct)} 5h`;
        console.log(`  Gemini: ${gwBar} ${gwText}`);

        const cwBar = renderProgressBar(cw.pct);
        const cwRes = cw.resets_in ? ` ${DIM}(resets: ${cw.resets_in})${NC}` : '';
        console.log(`  Claude: ${cwBar} ${colorPct(cw.pct)} weekly${cwRes} | ${colorPct(c5.pct)} 5h`);
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
```
