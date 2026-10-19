/**
 * Universal Antigravity & Codex Auth Vault
 * OpenAI Codex Runtime & Multi-Account State Manager
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync, spawnSync } = require('child_process');
const {
  CODEX_DIR,
  CODEX_AUTH,
  CODEX_SESSION,
  CODEX_DAEMON_PID,
  OPENAI_CLIENT_ID,
  OPENAI_TOKEN_URL,
  CHATGPT_ACCOUNTS_URL,
  CHATGPT_ME_URL,
  CACHE_TTL_MS
} = require('./config');

function isCodexInstalled() {
  if (fs.existsSync(CODEX_DIR)) return true;
  try {
    const res = spawnSync('which', ['codex'], { stdio: 'ignore' });
    return res.status === 0;
  } catch (_) {
    return false;
  }
}

function readCodexAuth() {
  if (!fs.existsSync(CODEX_AUTH)) return null;
  try {
    return JSON.parse(fs.readFileSync(CODEX_AUTH, 'utf8'));
  } catch (_) {
    return null;
  }
}

function readCodexSession() {
  if (!fs.existsSync(CODEX_SESSION)) return null;
  try {
    return JSON.parse(fs.readFileSync(CODEX_SESSION, 'utf8'));
  } catch (_) {
    return null;
  }
}

function parseCodexClaims(authData) {
  if (!authData) return null;
  const idToken = authData.tokens?.id_token;
  if (!idToken) return null;
  try {
    const parts = idToken.split('.');
    if (parts.length < 2) return null;
    const payload = Buffer.from(parts[1], 'base64').toString('utf8');
    return JSON.parse(payload);
  } catch (_) {
    return null;
  }
}

function getCodexEmail(authData) {
  if (!authData) return '';
  const claims = parseCodexClaims(authData);
  if (claims?.email) return claims.email;
  if (claims?.sub && claims.sub.includes('@')) return claims.sub;
  if (authData.auth_mode === 'api_key' && authData.OPENAI_API_KEY) {
    return `apikey-${authData.OPENAI_API_KEY.slice(0, 10)}...`;
  }
  return '';
}

function getCodexExpiry(authData) {
  const claims = parseCodexClaims(authData);
  if (claims?.exp) {
    const dt = new Date(claims.exp * 1000);
    return dt.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  }
  return '';
}

function getHttpsJson(url, token, headers = {}) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const req = https.request(parsed, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'codex-cli',
          'Accept': 'application/json',
          ...headers
        },
        timeout: 5000
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(body));
            } catch (_) {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
      req.end();
    } catch (_) {
      resolve(null);
    }
  });
}

async function getCodexAccountInfo(authData) {
  if (!authData) return null;
  const email = getCodexEmail(authData);
  const expiry = getCodexExpiry(authData);
  const authMode = authData.auth_mode || 'unknown';
  const token = authData.tokens?.access_token;

  const result = {
    email: email || 'Unknown',
    auth_mode: authMode,
    account_id: authData.tokens?.account_id || null,
    plan_type: 'free / standard',
    organization: '',
    token_expiry: expiry,
    cached_at: new Date().toISOString()
  };

  if (!token) return result;

  try {
    const [accCheck, me] = await Promise.all([
      getHttpsJson(CHATGPT_ACCOUNTS_URL, token),
      getHttpsJson(CHATGPT_ME_URL, token)
    ]);

    if (accCheck && accCheck.accounts) {
      const defaultAcc = accCheck.accounts[authData.tokens?.account_id] || accCheck.accounts['default'] || Object.values(accCheck.accounts)[0];
      if (defaultAcc?.account?.plan_type) {
        result.plan_type = defaultAcc.account.plan_type;
      }
    }

    if (me) {
      if (me.email && !email) result.email = me.email;
      if (Array.isArray(me.orgs?.data) && me.orgs.data.length > 0) {
        const defaultOrg = me.orgs.data.find(o => o.is_default) || me.orgs.data[0];
        result.organization = defaultOrg.title || defaultOrg.name || '';
      }
    }
  } catch (_) {}

  return result;
}

function isCodexDaemonActive() {
  if (!fs.existsSync(CODEX_DAEMON_PID)) return false;
  try {
    const pidStr = fs.readFileSync(CODEX_DAEMON_PID, 'utf8').trim();
    const pid = parseInt(pidStr, 10);
    if (!pid || isNaN(pid)) return false;
    process.kill(pid, 0); // Check if process is alive
    return true;
  } catch (_) {
    return false;
  }
}

function restartCodexDaemon() {
  try {
    spawnSync('codex', ['app-server', 'daemon', 'restart'], { stdio: 'ignore', timeout: 5000 });
    return true;
  } catch (_) {
    return false;
  }
}

function writeCodexAuth(authData, sessionData = null) {
  if (!authData) return false;
  try {
    fs.mkdirSync(CODEX_DIR, { recursive: true });
    fs.writeFileSync(CODEX_AUTH, JSON.stringify(authData, null, 2), 'utf8');
    if (sessionData) {
      fs.writeFileSync(CODEX_SESSION, JSON.stringify(sessionData, null, 2), 'utf8');
    }
    if (isCodexDaemonActive()) {
      restartCodexDaemon();
    }
    return true;
  } catch (_) {
    return false;
  }
}

function detachCodex() {
  try {
    if (fs.existsSync(CODEX_AUTH)) fs.unlinkSync(CODEX_AUTH);
    if (fs.existsSync(CODEX_SESSION)) fs.unlinkSync(CODEX_SESSION);
    if (isCodexDaemonActive()) {
      restartCodexDaemon();
    }
    return true;
  } catch (_) {
    return false;
  }
}

module.exports = {
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
};
