/**
 * Universal Antigravity Auth Vault
 * Real-Time AI Quota Monitoring, Token Refresh & Visual Dashboard
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { CLIENT_ID, CLIENT_SECRET, TOKEN_URL, QUOTA_URL, CACHE_TTL_MS, GREEN, YELLOW, RED, CYAN, BOLD, DIM, NC } = require('./config');
const { keyringRead } = require('./keyring');

function postJson(url, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const bodyStr = typeof data === 'string' ? data : JSON.stringify(data);
    const req = https.request(parsed, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        ...headers
      },
      timeout: 10000
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(raw));
          } catch (_) {
            resolve(raw);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${raw}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
    req.write(bodyStr);
    req.end();
  });
}

function parseTokenEmail(tokenData) {
  if (!tokenData) return '';
  try {
    const data = typeof tokenData === 'string' ? JSON.parse(tokenData) : tokenData;
    const idToken = data.id_token;
    if (!idToken) return '';
    const parts = idToken.split('.');
    if (parts.length < 2) return '';
    const payload = Buffer.from(parts[1], 'base64').toString('utf8');
    const claims = JSON.parse(payload);
    return claims.email || '';
  } catch (_) {
    return '';
  }
}

function parseTokenExpiry(tokenData) {
  if (!tokenData) return '';
  try {
    const data = typeof tokenData === 'string' ? JSON.parse(tokenData) : tokenData;
    const idToken = data.id_token;
    if (!idToken) return '';
    const parts = idToken.split('.');
    if (parts.length < 2) return '';
    const payload = Buffer.from(parts[1], 'base64').toString('utf8');
    const claims = JSON.parse(payload);
    if (claims.exp) {
      const dt = new Date(claims.exp * 1000);
      return dt.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    }
    return '';
  } catch (_) {
    return '';
  }
}

function getTokenEmail(tokenFile) {
  if (tokenFile && tokenFile !== 'keychain' && fs.existsSync(tokenFile)) {
    try {
      const content = fs.readFileSync(tokenFile, 'utf8');
      return parseTokenEmail(content);
    } catch (_) {}
  }
  const kr = keyringRead();
  return parseTokenEmail(kr);
}

function getTokenExpiry(tokenFile) {
  if (tokenFile && tokenFile !== 'keychain' && fs.existsSync(tokenFile)) {
    try {
      const content = fs.readFileSync(tokenFile, 'utf8');
      return parseTokenExpiry(content);
    } catch (_) {}
  }
  const kr = keyringRead();
  return parseTokenExpiry(kr);
}

async function refreshAccessToken(refreshToken) {
  const body = {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  };
  const res = await postJson(TOKEN_URL, body);
  return res || {};
}

function formatResetCountdown(targetDateStr) {
  if (!targetDateStr) return '';
  try {
    const target = new Date(targetDateStr).getTime();
    const diffSec = Math.floor((target - Date.now()) / 1000);
    if (diffSec <= 0) return 'resets soon';
    const days = Math.floor(diffSec / 86400);
    const hours = Math.floor((diffSec % 86400) / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  } catch (_) {
    return '';
  }
}

async function getProfileQuota(profileDir, force = false) {
  const tokenFile = path.join(profileDir, 'antigravity-oauth-token');
  const cacheFile = path.join(profileDir, 'quota_cache.json');

  if (!fs.existsSync(tokenFile)) return null;

  if (!force && fs.existsSync(cacheFile)) {
    try {
      const stats = fs.statSync(cacheFile);
      if (Date.now() - stats.mtimeMs < CACHE_TTL_MS) {
        return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      }
    } catch (_) {}
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

  try {
    fs.writeFileSync(cacheFile, JSON.stringify(result, null, 2), 'utf8');
  } catch (_) {}

  return result;
}

function renderProgressBar(pct, width = 10) {
  if (pct === null || pct === undefined) {
    return `[${'░'.repeat(width)}]`;
  }
  const filled = Math.min(width, Math.max(0, Math.round((pct / 100) * width)));
  const empty = width - filled;
  let color = GREEN;
  if (pct < 20) color = RED;
  else if (pct < 50) color = YELLOW;

  return `${color}[${'█'.repeat(filled)}${'░'.repeat(empty)}]${NC}`;
}

function colorPct(pct) {
  if (pct === null || pct === undefined) return `${DIM}N/A${NC}`;
  let color = GREEN;
  if (pct < 20) color = RED;
  else if (pct < 50) color = YELLOW;
  return `${color}${pct.toFixed(1).padStart(5)}%${NC}`;
}

module.exports = {
  getTokenEmail,
  getTokenExpiry,
  getProfileQuota,
  renderProgressBar,
  colorPct
};
