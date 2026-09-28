/**
 * Universal Antigravity Auth Vault
 * Multi-Surface SQLite State Manager (Antigravity IDE & 2.0 Desktop App)
 */

const fs = require('fs');
const { execSync, spawnSync } = require('child_process');
const { IS_WIN } = require('./config');

let DatabaseSync = null;
try {
  const sqlite = require('node:sqlite');
  DatabaseSync = sqlite.DatabaseSync;
} catch (_) {}

function readSurfaceState(dbPath) {
  if (!dbPath || !fs.existsSync(dbPath)) return null;

  if (DatabaseSync) {
    try {
      const db = new DatabaseSync(dbPath, { readOnly: true });
      const stmt = db.prepare("SELECT key, value FROM ItemTable WHERE key IN ('antigravityUnifiedStateSync.oauthToken', 'antigravityUnifiedStateSync.userStatus', 'antigravityAuthStatus')");
      const rows = stmt.all();
      db.close();
      const res = {};
      for (const r of rows) {
        res[r.key] = r.value;
      }
      return Object.keys(res).length > 0 ? res : null;
    } catch (_) {}
  }

  // Fallback using sqlite3 CLI
  try {
    const cmd = `sqlite3 "${dbPath}" "SELECT key, value FROM ItemTable WHERE key IN ('antigravityUnifiedStateSync.oauthToken', 'antigravityUnifiedStateSync.userStatus', 'antigravityAuthStatus');"`;
    const out = execSync(cmd, { encoding: 'utf8' }).trim();
    if (!out) return null;
    const res = {};
    for (const line of out.split('\n')) {
      const idx = line.indexOf('|');
      if (idx !== -1) {
        res[line.slice(0, idx)] = line.slice(idx + 1);
      }
    }
    return Object.keys(res).length > 0 ? res : null;
  } catch (_) {}

  return null;
}

function writeSurfaceState(dbPath, stateDict) {
  if (!dbPath || !fs.existsSync(dbPath) || !stateDict) return false;

  if (DatabaseSync) {
    try {
      const db = new DatabaseSync(dbPath);
      const insertStmt = db.prepare("INSERT OR REPLACE INTO ItemTable (key, value) VALUES (?, ?)");
      const deleteStmt = db.prepare("DELETE FROM ItemTable WHERE key = ?");

      for (const [k, v] of Object.entries(stateDict)) {
        if (v !== null && v !== undefined) {
          insertStmt.run(k, String(v));
        } else {
          deleteStmt.run(k);
        }
      }
      db.close();
      return true;
    } catch (_) {}
  }

  // Fallback using sqlite3 CLI
  try {
    let sql = 'BEGIN TRANSACTION;\n';
    for (const [k, v] of Object.entries(stateDict)) {
      if (v !== null && v !== undefined) {
        const escaped = String(v).replace(/'/g, "''");
        sql += `INSERT OR REPLACE INTO ItemTable (key, value) VALUES ('${k}', '${escaped}');\n`;
      } else {
        sql += `DELETE FROM ItemTable WHERE key = '${k}';\n`;
      }
    }
    sql += 'COMMIT;';
    execSync(`sqlite3 "${dbPath}" "${sql}"`, { stdio: 'ignore' });
    return true;
  } catch (_) {}

  return false;
}

function isProcActive(procPattern) {
  try {
    if (IS_WIN) {
      const out = execSync('tasklist', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      return out.toLowerCase().includes(procPattern.toLowerCase());
    } else {
      const out = execSync(`pgrep -f "${procPattern}" 2>/dev/null`, { encoding: 'utf8' });
      return Boolean(out.trim());
    }
  } catch (_) {
    return false;
  }
}

module.exports = {
  readSurfaceState,
  writeSurfaceState,
  isProcActive
};
