# Implementation Plan: Dual-Engine Antigravity & OpenAI Codex Vault

## 1. Executive Summary & Problem Analysis
`antigravity-auth-vault` was designed exclusively for Google Antigravity runtimes:
1. **Antigravity CLI (`agy`)**: reading/writing `~/.gemini/antigravity-cli/antigravity-oauth-token`, `~/.gemini/oauth_creds.json`, and OS Keyring (`service: gemini`, `account: antigravity`).
2. **Antigravity IDE & 2.0 Desktop**: reading/writing SQLite `ItemTable` in `state.vscdb`.

### Key Bugs & Malfunctions Identified in Existing Antigravity Implementation
1. **Gemini Quota Rendering "N/A" with empty bar `[░░░░░░░░░░]`**:
   - Google Cloud Code's internal API (`retrieveUserQuotaSummary`) only returns `Claude and GPT models` rate-limit buckets (`3p-weekly` and `3p-5h`) for standard accounts. Gemini models are unmetered or not rate-limited on the same 3P bucket.
   - When `summary.groups` lacked a group containing `"gemini"`, `result.gemini` was set to `{}`.
   - The CLI rendered `Gemini: [░░░░░░░░░░] N/A weekly | N/A 5h`, which made users think the quota monitor was broken.
   - **Fix**: Handle unmetered / standard Gemini quota gracefully (`[██████████] Unlimited (Unmetered Standard Tier)`), while parsing `userQuotaBuckets` and 3P buckets accurately.
2. **Slow Profile Listing & Quota API Latency**:
   - Sequential network requests in `cmdList` caused multi-second hangs when multiple accounts were present.
   - **Fix**: Fetch quotas concurrently (`Promise.all`) with request timeouts and robust caching.
3. **Interactive Selector Redraw Glitches**:
   - ANSI escape sequences for cursor positioning caused artifacts on smaller terminal windows or on Ctrl+C.
   - **Fix**: Sanitize terminal state, add proper signal handling and clean cursor restore.

---

## 2. OpenAI Codex Architecture Analysis
Codex CLI (`v0.162.1+` / `v0.163.0`) operates with:
- **Configuration & Auth Directory**: `~/.codex/`
- **Auth File**: `~/.codex/auth.json`
  - Modes:
    - `chatgpt`: `{ auth_mode: "chatgpt", tokens: { id_token, access_token, refresh_token, account_id }, last_refresh }`
    - `api_key`: `{ auth_mode: "api_key", OPENAI_API_KEY: "sk-...", tokens: null, last_refresh }`
- **Optional Cluster Session**: `~/.codex-session`
- **Active App-Server Daemon**:
  - `~/.codex/app-server-daemon/daemon.pid`
  - `~/.codex/app-server-control/app-server-control.sock`
  - Managed via `codex app-server daemon restart` or direct PID detection.
- **Identity & Quota Verification**:
  - JWT claim extraction from `id_token` (`email`, `sub`, `exp`).
  - Plan type and subscription verification via `https://chatgpt.com/backend-api/accounts/check/v4-2023-04-27` and `/backend-api/me`.
  - Token refresh via `https://auth.openai.com/oauth/token`.

---

## 3. Architecture for Codex & Antigravity Compatibility

### Module Additions & Modifications
1. **`src/config.js`**:
   - Add Codex paths: `CODEX_DIR` (`~/.codex`), `CODEX_AUTH` (`~/.codex/auth.json`), `CODEX_SESSION` (`~/.codex-session`), `CODEX_DAEMON_PID`.
   - Add OpenAI OAuth & API endpoints:
     - `OPENAI_TOKEN_URL = 'https://auth.openai.com/oauth/token'`
     - `OPENAI_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann'`
     - `CHATGPT_ACCOUNTS_URL = 'https://chatgpt.com/backend-api/accounts/check/v4-2023-04-27'`
     - `CHATGPT_ME_URL = 'https://chatgpt.com/backend-api/me'`
2. **`src/codex.js` (New Module)**:
   - `readCodexAuth()`: Reads and validates `~/.codex/auth.json`.
   - `writeCodexAuth(authData, sessionData)`: Writes `~/.codex/auth.json` and optional `~/.codex-session`.
   - `getCodexEmail(authData)`: Extracts email from JWT `id_token` or `/backend-api/me`.
   - `getCodexAccountInfo(authData)`: Retrieves plan type (`plus`, `team`, `pro`, `free`), account ID, org title.
   - `restartCodexDaemonIfActive()`: Gracefully triggers `codex app-server daemon restart` if daemon is running.
3. **`src/vault.js`**:
   - Update `cmdCurrent()` to display active Antigravity session AND active Codex session side-by-side with runtime surfaces and quota.
   - Update `cmdSave(name, tool)`: Support saving Antigravity profiles, Codex profiles, or both.
   - Update `cmdSwitch(target, surface, tool)`: Support switching Antigravity, Codex, or unified accounts.
   - Update `cmdList()`: Categorize or badge profiles with `[Antigravity]` and `[Codex]`.
   - Update `cmdQuota()`: Display detailed quota dashboard for both Antigravity and Codex accounts.
   - Update `pickInteractive()`: Interactive arrow-key switcher with tool badges.
   - Update `cmdDetach(surface, tool)`: Clean detachment of Antigravity and/or Codex sessions.
4. **`src/quota.js`**:
   - Fix Gemini quota parsing when 3P buckets only exist (display `Unlimited / Unmetered Standard Tier` instead of misleading `N/A`).
   - Add `getCodexQuota(profileDir)` to query and cache Codex plan details, email, and token expiry.
5. **`src/installer.js` & `bin/`**:
   - Register `codex-auth` symlink and binary wrapper alongside `ag-auth` and `@`.
   - Update shell completion scripts in `src/completions.js` to support new tool flags (`--tool`, `codex`, `antigravity`).
6. **Documentation & Tests**:
   - Comprehensive test suite for Antigravity + Codex session operations.
   - Updated `README.md` and context mechanics documentation.
