/**
 * Universal Antigravity Auth Vault
 * Configuration, Paths, Endpoints & Styling
 */

const os = require('os');
const path = require('path');
const fs = require('fs');

const PLATFORM = os.platform(); // 'darwin', 'linux', 'win32'
const IS_WIN = PLATFORM === 'win32';
const HOME = os.homedir();

// Gemini & Antigravity directory paths
const GEMINI_DIR = path.join(HOME, '.gemini');
const VAULT_DIR = path.join(GEMINI_DIR, 'auth_vault');
const PROFILES_DIR = path.join(VAULT_DIR, 'profiles');
const CLI_DIR = path.join(GEMINI_DIR, 'antigravity-cli');
const ACTIVE_TOKEN = path.join(CLI_DIR, 'antigravity-oauth-token');
const ACTIVE_CREDS = path.join(GEMINI_DIR, 'oauth_creds.json');
const ACTIVE_ACCOUNTS = path.join(GEMINI_DIR, 'google_accounts.json');

// Hidden permanent installation directory
const HIDDEN_DIR = path.join(HOME, '.antigravity-auth-vault');

// OpenAI Codex paths & endpoints
const CODEX_DIR = path.join(HOME, '.codex');
const CODEX_AUTH = path.join(CODEX_DIR, 'auth.json');
const CODEX_SESSION = path.join(HOME, '.codex-session');
const CODEX_DAEMON_PID = path.join(CODEX_DIR, 'app-server-daemon', 'daemon.pid');

const OPENAI_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';
const OPENAI_TOKEN_URL = 'https://auth.openai.com/oauth/token';
const CHATGPT_ACCOUNTS_URL = 'https://chatgpt.com/backend-api/accounts/check/v4-2023-04-27';
const CHATGPT_ME_URL = 'https://chatgpt.com/backend-api/me';

// Multi-Surface Storage Paths (state.vscdb)
let IDE_STORAGE = '';
let APP_STORAGE = '';

if (PLATFORM === 'darwin') {
  IDE_STORAGE = path.join(HOME, 'Library', 'Application Support', 'Antigravity IDE', 'User', 'globalStorage', 'state.vscdb');
  APP_STORAGE = path.join(HOME, 'Library', 'Application Support', 'Antigravity', 'User', 'globalStorage', 'state.vscdb');
} else if (PLATFORM === 'linux') {
  IDE_STORAGE = path.join(HOME, '.config', 'Antigravity IDE', 'User', 'globalStorage', 'state.vscdb');
  APP_STORAGE = path.join(HOME, '.config', 'Antigravity', 'User', 'globalStorage', 'state.vscdb');
} else if (IS_WIN) {
  const appData = process.env.APPDATA || path.join(HOME, 'AppData', 'Roaming');
  IDE_STORAGE = path.join(appData, 'Antigravity IDE', 'User', 'globalStorage', 'state.vscdb');
  APP_STORAGE = path.join(appData, 'Antigravity', 'User', 'globalStorage', 'state.vscdb');
}

// Google OAuth & Quota Endpoints
const CLIENT_ID = '1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const QUOTA_URL = 'https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary';
const DAILY_QUOTA_URL = 'https://daily-cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary';
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes cache

// ANSI Styling
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const NC = '\x1b[0m';

function ensureVaultDirs() {
  fs.mkdirSync(PROFILES_DIR, { recursive: true });
  if (!IS_WIN) {
    try {
      fs.chmodSync(VAULT_DIR, 0o700);
      fs.chmodSync(PROFILES_DIR, 0o700);
    } catch (_) {}
  }
}

module.exports = {
  VERSION: '2.4.0',
  PLATFORM,
  IS_WIN,
  HOME,
  GEMINI_DIR,
  VAULT_DIR,
  PROFILES_DIR,
  CLI_DIR,
  ACTIVE_TOKEN,
  ACTIVE_CREDS,
  ACTIVE_ACCOUNTS,
  HIDDEN_DIR,
  CODEX_DIR,
  CODEX_AUTH,
  CODEX_SESSION,
  CODEX_DAEMON_PID,
  OPENAI_CLIENT_ID,
  OPENAI_TOKEN_URL,
  CHATGPT_ACCOUNTS_URL,
  CHATGPT_ME_URL,
  IDE_STORAGE,
  APP_STORAGE,
  CLIENT_ID,
  CLIENT_SECRET,
  TOKEN_URL,
  QUOTA_URL,
  DAILY_QUOTA_URL,
  CACHE_TTL_MS,
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
};
