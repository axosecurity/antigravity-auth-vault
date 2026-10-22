# getProfileQuota

## Function
- **Name:** `getProfileQuota`
- **File:** `src/quota.js`
- **Line Range:** Lines 137–278

## How It Works

`getProfileQuota` queries, calculates, normalizes, and caches real-time AI quota usage across Google Antigravity (Gemini Models, Claude & GPT 3P models) and OpenAI Codex subscription tiers for any specified profile directory.

1. **Existence Check & Cache Verification (lines 137–151):**
   - Resolves file paths for `antigravity-oauth-token`, `codex_auth.json`, and `quota_cache.json` in the target profile folder (lines 138–140).
   - If neither Antigravity nor Codex authentication files exist, returns `null` (line 142).
   - Unless `force` is `true`, checks if `quota_cache.json` exists and is within `CACHE_TTL_MS` (5 minutes = 300,000 ms). If fresh, returns the cached quota object immediately to eliminate unnecessary API latency (lines 144–151).

2. **OpenAI Codex Quota Branch (lines 153–168):**
   - If the profile is purely an OpenAI Codex profile (`codex_auth.json` present without `antigravity-oauth-token`):
     - Parses `codex_auth.json` and invokes `getCodexAccountInfo(authData)` from `src/codex.js` (lines 156–158).
     - Queries ChatGPT account verification endpoints (`https://chatgpt.com/backend-api/accounts/check/v4-2023-04-27` and `/backend-api/me`) to extract plan type (`plus`, `team`, `pro`, `free`) and organization.
     - Saves normalized results with a timestamp to `quota_cache.json` and returns (lines 159–167).

3. **Antigravity Token Parsing & OAuth Refresh Handling (lines 170–210):**
   - Parses `tokenData` from `antigravity-oauth-token`, supporting both root-level tokens and nested `{ token: { access_token } }` structures (lines 170–179).
   - Attempts an initial request to Google Cloud Code's user quota summary endpoint (`QUOTA_URL` = `https://cloudcode-pa.googleapis.com/v1alpha/users/me:retrieveUserQuotaSummary`) using `Bearer ${accessToken}` (lines 182–189).
   - If the request fails or the access token is expired, attempts an automatic OAuth token refresh using `refreshToken` against `https://oauth2.googleapis.com/token` (`refreshAccessToken(refreshToken)`) (lines 191–210).
   - Updates `antigravity-oauth-token` on disk with the refreshed access token (and optional `id_token`), then retries the quota summary request (lines 196–208).
   - If summary data still cannot be retrieved, returns `null` (line 212).

4. **Quota Bucket Normalization (lines 214–265):**
   - Initializes a structured result dictionary containing `cached_at`, `gemini: {}`, and `claude: {}` (lines 214–218).
   - **Modern `summary.groups` schema (lines 220–242):** Iterates groups, checking if `displayName` matches `'gemini'` vs `'claude'`/`'gpt'`. For matching groups, iterates `g.buckets`, extracting remaining fractional amounts (`remainingFraction` or `fractionalRemaining`), calculating integer percentages (`Math.round(fraction * 1000) / 10`), formatting human-readable reset countdowns via `formatResetCountdown(resetsAt)`, and categorizing into `5h` or `weekly` windows.
   - **Legacy `summary.userQuotaBuckets` schema (lines 243–265):** Iterates flat buckets, mapping bucket name identifiers matching `'5h'`/`'five_hour'` or weekly to the respective model family.

5. **Unmetered Standard Tier Fallback for Gemini (lines 267–271):**
   - When Google Cloud Code's internal API returns quota groups only for 3P models (`Claude and GPT models`) on standard accounts, `result.gemini` has zero explicit rate-limit buckets.
   - Lines 268–271 intercept this state: if `Object.keys(result.gemini).length === 0`, it assigns `pct: 100`, `resets_in: ''`, and `unmetered: true` to both `weekly` and `5h` windows, preventing false "N/A" indicators in the terminal.

6. **Cache Storage & Output (lines 273–277):**
   - Writes the parsed result to `quota_cache.json` for 5-minute caching.
   - Returns the standardized quota object.

## Code Copy

```javascript
// src/quota.js (lines 137–278)
async function getProfileQuota(profileDir, force = false) {
  const tokenFile = path.join(profileDir, 'antigravity-oauth-token');
  const codexFile = path.join(profileDir, 'codex_auth.json');
  const cacheFile = path.join(profileDir, 'quota_cache.json');

  if (!fs.existsSync(tokenFile) && !fs.existsSync(codexFile)) return null;

  if (!force && fs.existsSync(cacheFile)) {
    try {
      const stats = fs.statSync(cacheFile);
      if (Date.now() - stats.mtimeMs < CACHE_TTL_MS) {
        return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      }
    } catch (_) {}
  }

  // Handle Codex profile quota
  if (!fs.existsSync(tokenFile) && fs.existsSync(codexFile)) {
    try {
      const { getCodexAccountInfo } = require('./codex');
      const authData = JSON.parse(fs.readFileSync(codexFile, 'utf8'));
      const accInfo = await getCodexAccountInfo(authData);
      const result = {
        cached_at: new Date().toISOString(),
        codex: accInfo
      };
      fs.writeFileSync(cacheFile, JSON.stringify(result, null, 2), 'utf8');
      return result;
    } catch (_) {
      return null;
    }
  }

  let tokenData;
  try {
    tokenData = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
  } catch (_) {
    return null;
  }

  const tokObj = tokenData.token || tokenData;
  let accessToken = tokObj.access_token || tokenData.access_token;
  const refreshToken = tokObj.refresh_token || tokenData.refresh_token;

  let summary = null;
  if (accessToken) {
    try {
      summary = await postJson(QUOTA_URL, { project: '' }, {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'antigravity/1.0'
      });
    } catch (_) {}
  }

  if (!summary && refreshToken) {
    try {
      const refreshed = await refreshAccessToken(refreshToken);
      accessToken = refreshed.access_token || refreshed;
      if (accessToken) {
        if (tokenData.token) {
          tokenData.token.access_token = accessToken;
          if (refreshed.id_token) tokenData.id_token = refreshed.id_token;
        } else {
          tokenData.access_token = accessToken;
          if (refreshed.id_token) tokenData.id_token = refreshed.id_token;
        }
        fs.writeFileSync(tokenFile, JSON.stringify(tokenData, null, 2), 'utf8');
        summary = await postJson(QUOTA_URL, { project: '' }, {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'antigravity/1.0'
        });
      }
    } catch (_) {}
  }

  if (!summary) return null;

  const result = {
    cached_at: new Date().toISOString(),
    gemini: {},
    claude: {}
  };

  if (Array.isArray(summary.groups)) {
    for (const g of summary.groups) {
      const gName = (g.displayName || '').toLowerCase();
      const isGemini = gName.includes('gemini');
      const isClaude = gName.includes('claude') || gName.includes('gpt');
      const targetGroup = isGemini ? result.gemini : (isClaude ? result.claude : null);

      if (targetGroup && Array.isArray(g.buckets)) {
        for (const b of g.buckets) {
          const win = (b.window || b.bucketId || '').toLowerCase();
          const fraction = b.remainingFraction !== undefined ? b.remainingFraction : (b.fractionalRemaining || 0);
          const resetsAt = b.resetTime || b.resetsAt || '';
          const pct = Math.round(fraction * 1000) / 10;
          const resetsIn = formatResetCountdown(resetsAt);

          if (win.includes('5h') || win.includes('5')) {
            targetGroup['5h'] = { pct, resets_in: resetsIn };
          } else {
            targetGroup['weekly'] = { pct, resets_in: resetsIn };
          }
        }
      }
    }
  } else if (Array.isArray(summary.userQuotaBuckets)) {
    for (const b of summary.userQuotaBuckets) {
      const name = (b.name || '').toLowerCase();
      const fraction = b.fractionalRemaining !== undefined ? b.fractionalRemaining : 0;
      const resetsAt = b.resetsAt || '';
      const pct = Math.round(fraction * 1000) / 10;
      const resetsIn = formatResetCountdown(resetsAt);

      if (name.includes('gemini') || name.includes('default')) {
        if (name.includes('5h') || name.includes('five_hour')) {
          result.gemini['5h'] = { pct, resets_in: resetsIn };
        } else {
          result.gemini['weekly'] = { pct, resets_in: resetsIn };
        }
      } else if (name.includes('claude') || name.includes('gpt')) {
        if (name.includes('5h') || name.includes('five_hour')) {
          result.claude['5h'] = { pct, resets_in: resetsIn };
        } else {
          result.claude['weekly'] = { pct, resets_in: resetsIn };
        }
      }
    }
  }

  // If Gemini has no explicit rate-limit buckets returned, it runs on the Unmetered Standard Tier
  if (Object.keys(result.gemini).length === 0) {
    result.gemini.weekly = { pct: 100, resets_in: '', unmetered: true };
    result.gemini['5h'] = { pct: 100, resets_in: '', unmetered: true };
  }

  try {
    fs.writeFileSync(cacheFile, JSON.stringify(result, null, 2), 'utf8');
  } catch (_) {}

  return result;
}
```

## Root Cause

`getProfileQuota` only called `QUOTA_URL` (`https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary`). The server endpoint stopped returning first-party Gemini model groups in `summary.groups` (returning solely 3P `"Claude and GPT models"`).

Because `summary.groups` omitted Gemini, `result.gemini` remained empty (`Object.keys(result.gemini).length === 0`). The fallback condition at lines 268–271 assumed that an empty Gemini group meant the account had unmetered capacity, marking Gemini as `{ unmetered: true, pct: 100 }`.

```javascript
// src/quota.js (lines 268–271) — Problematic logic
  if (Object.keys(result.gemini).length === 0) {
    result.gemini.weekly = { pct: 100, resets_in: '', unmetered: true };
    result.gemini['5h'] = { pct: 100, resets_in: '', unmetered: true };
  }
```

This caused `ag-auth switch` to render `[Gem: Unmetered | Cld: 100.0%]` across all accounts, preventing users from seeing remaining Gemini percentage balances (even when accounts were down to 14.0% or 6.0%). Real Gemini quota is metered and delivered via the companion endpoint `https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuota` (`userQuota.buckets`).

Root cause: Google's `retrieveUserQuotaSummary` endpoint omitted first-party Gemini groups, causing `getProfileQuota` to trigger its unmetered fallback and hide live Gemini quota percentages instead of querying `retrieveUserQuota`.

## Solution Implemented

1. Added `USER_QUOTA_URL = 'https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuota'` to `src/config.js`.
2. Updated `getProfileQuota` in `src/quota.js` to execute concurrent `Promise.all` requests across both `QUOTA_URL` (`retrieveUserQuotaSummary`) and `USER_QUOTA_URL` (`retrieveUserQuota`).
3. Parsed `userQuota.buckets` for real `gemini-*` remaining fractions and reset countdowns, correctly reporting live percentages (e.g. `14.0%`, `6.0%`, `88.8%`) and reset times.
5. Added distinct window segregation for Gemini models: if reset countdown exceeds 5.5 hours, the constraint is classified as the Weekly limit; if under 5.5 hours, it is classified as the 5-Hour rolling window.
6. Enhanced `ag-auth quota` to live-refresh all vaulted AI agent profiles on demand, and improved `ag-auth list` and `ag-auth switch` with verbose breakdowns showing both 5h and weekly percentages, progress bars, and countdown reset timers.

```javascript
// src/quota.js
  let summary = null;
  let userQuota = null;

  async function fetchQuotaEndpoints(token) {
    const headers = {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'antigravity/1.0'
    };
    const [sRes, uRes] = await Promise.all([
      postJson(QUOTA_URL, { project: '' }, headers).catch(() => null),
      postJson(USER_QUOTA_URL, { project: '' }, headers).catch(() => null)
    ]);
    return { summary: sRes, userQuota: uRes };
  }
```

