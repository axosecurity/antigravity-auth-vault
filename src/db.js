/**
 * Universal Antigravity Auth Vault
 * Remote Team Database & Continuous Auto-Synchronization Suite
 * PostgreSQL / Neon • Supabase • Shared Cloud Drive
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const os = require('os');
const { VAULT_DIR, PROFILES_DIR, GREEN, YELLOW, RED, CYAN, MAGENTA, BOLD, DIM, NC, IS_WIN } = require('./config');
const { encryptStr, decryptStr } = require('./crypto');

let Client = null;
try {
  Client = require('pg').Client;
} catch (_) {}

function getDbConfig() {
  const cfgPath = path.join(VAULT_DIR, 'db_config.json');
  if (fs.existsSync(cfgPath)) {
    try {
      return JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    } catch (_) {}
  }
  return null;
}

function saveDbConfig(config) {
  const cfgPath = path.join(VAULT_DIR, 'db_config.json');
  fs.writeFileSync(cfgPath, JSON.stringify(config, null, 2), 'utf8');
  if (!IS_WIN) {
    try {
      fs.chmodSync(cfgPath, 0o600);
    } catch (_) {}
  }
}

async function getPostgresClient(connStr) {
  if (!Client) {
    throw new Error("PostgreSQL client 'pg' is required. Run 'npm install' or reinstall.");
  }
  const cleanUri = connStr.replace(/[?&]sslmode=[^&]*/g, '').replace(/\?&/, '?').replace(/[?&]$/, '');
  const client = new Client({
    connectionString: cleanUri,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  return client;
}

async function dbApiFetch(config) {
  const provider = config.provider;
  const endpoint = config.endpoint || '';

  if (provider === 'postgres' || endpoint.startsWith('postgres://') || endpoint.startsWith('postgresql://')) {
    const client = await getPostgresClient(endpoint);
    await client.query(`
      CREATE TABLE IF NOT EXISTS antigravity_vault (
        email TEXT PRIMARY KEY,
        enc_payload TEXT NOT NULL,
        updated_by TEXT NOT NULL,
        last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    const res = await client.query('SELECT email, enc_payload, updated_by, last_synced_at FROM antigravity_vault ORDER BY email');
    await client.end();
    return res.rows.map(r => ({
      email: r.email,
      enc_payload: r.enc_payload,
      updated_by: r.updated_by,
      last_synced_at: r.last_synced_at instanceof Date ? r.last_synced_at.toISOString() : String(r.last_synced_at)
    }));
  } else if (provider === 'file-share') {
    const shareDir = path.resolve(config.path || '');
    if (!fs.existsSync(shareDir)) return [];
    const files = fs.readdirSync(shareDir).filter(f => f.endsWith('.vault.enc'));
    const rows = [];
    for (const f of files) {
      try {
        const content = fs.readFileSync(path.join(shareDir, f), 'utf8').trim();
        const email = f.replace(/\.vault\.enc$/, '');
        rows.push({
          email,
          enc_payload: content,
          updated_by: 'file-share',
          last_synced_at: fs.statSync(path.join(shareDir, f)).mtime.toISOString()
        });
      } catch (_) {}
    }
    return rows;
  } else if (provider === 'supabase' || provider === 'custom-http') {
    const url = endpoint.replace(/\/$/, '') + '/rest/v1/' + (config.table || 'antigravity_vault') + '?select=*';
    const parsed = new URL(url);
    const headers = { 'apikey': config.api_key || '', 'Authorization': `Bearer ${config.api_key || ''}` };
    const lib = parsed.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
      lib.get(parsed, { headers, timeout: 10000 }, (res) => {
        let raw = '';
        res.on('data', d => raw += d);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(raw));
            } catch (e) {
              resolve([]);
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${raw}`));
          }
        });
      }).on('error', reject);
    });
  }

  return [];
}

async function dbApiUpsert(config, records) {
  const provider = config.provider;
  const endpoint = config.endpoint || '';

  if (provider === 'postgres' || endpoint.startsWith('postgres://') || endpoint.startsWith('postgresql://')) {
    const client = await getPostgresClient(endpoint);
    await client.query(`
      CREATE TABLE IF NOT EXISTS antigravity_vault (
        email TEXT PRIMARY KEY,
        enc_payload TEXT NOT NULL,
        updated_by TEXT NOT NULL,
        last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    for (const r of records) {
      await client.query(`
        INSERT INTO antigravity_vault (email, enc_payload, updated_by, last_synced_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (email) DO UPDATE
        SET enc_payload = EXCLUDED.enc_payload,
            updated_by = EXCLUDED.updated_by,
            last_synced_at = EXCLUDED.last_synced_at
      `, [r.email, r.enc_payload, r.updated_by]);
    }
    await client.end();
    return true;
  } else if (provider === 'file-share') {
    const shareDir = path.resolve(config.path || '');
    fs.mkdirSync(shareDir, { recursive: true });
    for (const r of records) {
      fs.writeFileSync(path.join(shareDir, `${r.email}.vault.enc`), r.enc_payload, 'utf8');
    }
    return true;
  }

  return false;
}

async function cliDbSetup(targetUrl, passphraseArg) {
  if (targetUrl) {
    const config = {};
    if (targetUrl.startsWith('postgres://') || targetUrl.startsWith('postgresql://')) {
      config.provider = 'postgres';
      config.endpoint = targetUrl;
    } else if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
      config.provider = targetUrl.includes('supabase') ? 'supabase' : 'custom-http';
      config.endpoint = targetUrl;
      if (config.provider === 'supabase') config.table = 'antigravity_vault';
    } else {
      config.provider = 'file-share';
      config.path = targetUrl;
    }

    config.passphrase = passphraseArg || 'antigravity-team-vault';
    config.auto_sync = true;

    saveDbConfig(config);
    console.log(`${GREEN}✔ Database configuration saved to ${path.join(VAULT_DIR, 'db_config.json')}${NC}`);
    console.log(`\n${CYAN}Testing remote connection (${config.provider})...${NC}`);
    try {
      const rows = await dbApiFetch(config);
      console.log(`${GREEN}✔ Connected successfully! Remote profiles found: ${rows.length}${NC}`);
    } catch (err) {
      console.log(`${RED}Connection test failed:${NC} ${err.message}`);
      return;
    }

    console.log(`\n${BOLD}${CYAN}=== Starting Initial Auto-Synchronization ===${NC}`);
    await cliDbSync();
    console.log(`\n${GREEN}✔ Auto-sync is now ACTIVE for this vault!${NC}`);
    console.log(`  ${DIM}• Local sessions will automatically push to team vault on save.${NC}`);
    console.log(`  ${DIM}• New team accounts will automatically pull when you switch or list.${NC}`);
    return;
  }

  console.log(`${BOLD}${MAGENTA}======================================================${NC}`);
  console.log(`${BOLD}${MAGENTA}  Universal Antigravity Team Vault & Database Setup   ${NC}`);
  console.log(`${BOLD}${MAGENTA}======================================================${NC}\n`);
  console.log(`  ${BOLD}ag-auth db setup "postgresql://<connection_string>"${NC}\n`);
}

async function cliDbStatus() {
  const config = getDbConfig();
  if (!config) {
    console.log(`${YELLOW}Status:${NC} Disconnected (No remote database configured).`);
    console.log(`Run '${BOLD}ag-auth db setup "<uri>"${NC}' to connect your team vault.`);
    return;
  }

  console.log(`${BOLD}${MAGENTA}========================================${NC}`);
  console.log(`${BOLD}${MAGENTA}  Universal Antigravity Team Vault Status${NC}`);
  console.log(`${BOLD}${MAGENTA}========================================${NC}`);
  console.log(`Provider:  ${BOLD}${config.provider}${NC}`);

  if (config.endpoint) {
    let ep = config.endpoint;
    if (ep.includes('@') && ep.includes('://')) {
      try {
        const [proto, rest] = ep.split('://');
        const [creds, hostPart] = rest.split('@');
        const user = creds.includes(':') ? creds.split(':')[0] : creds;
        ep = `${proto}://${user}:••••••••@${hostPart}`;
      } catch (_) {}
    }
    console.log(`Endpoint:  ${ep}`);
  }
  if (config.path) console.log(`Path:      ${config.path}`);
  if (config.table) console.log(`Table:     ${config.table}`);
  console.log(`Security:  ${GREEN}AES-256 Zero-Knowledge Client-Side Encryption${NC}`);

  const autoSync = config.auto_sync !== false;
  const autoStr = autoSync ? `${GREEN}Active (Auto-pushes on save, auto-pulls on switch/list)${NC}` : `${YELLOW}Disabled${NC}`;
  console.log(`Auto-Sync: ${autoStr}`);

  console.log(`\n${CYAN}Testing remote connection...${NC}`);
  try {
    const rows = await dbApiFetch(config);
    console.log(`${GREEN}✔ Connection healthy!${NC}`);
    console.log(`Remote Profiles: ${BOLD}${rows.length}${NC}`);
    for (const r of rows) {
      console.log(`  • ${r.email} ${DIM}(last synced: ${r.last_synced_at}, by ${r.updated_by})${NC}`);
    }
  } catch (err) {
    console.log(`${RED}Connection failed:${NC} ${err.message}`);
  }
}

async function cliDbPush() {
  const config = getDbConfig();
  if (!config) {
    console.log(`${RED}Error:${NC} No database connected. Run '${BOLD}ag-auth db setup${NC}' first.`);
    return;
  }
  const passphrase = config.passphrase;
  if (!passphrase) {
    console.log(`${RED}Error:${NC} No encryption passphrase configured.`);
    return;
  }

  if (!fs.existsSync(PROFILES_DIR)) {
    console.log(`${YELLOW}No local profiles found to push.${NC}`);
    return;
  }

  const dirs = fs.readdirSync(PROFILES_DIR);
  const records = [];
  const who = process.env.USER || process.env.USERNAME || 'developer';
  const updater = `${who}@${os.hostname()}`;

  for (const d of dirs) {
    const p = path.join(PROFILES_DIR, d);
    const tokenPath = path.join(p, 'antigravity-oauth-token');
    if (fs.existsSync(tokenPath) && fs.statSync(p).isDirectory()) {
      const payload = { email: d, files: {} };
      for (const fn of fs.readdirSync(p)) {
        const fp = path.join(p, fn);
        if (fs.statSync(fp).isFile() && !fn.endsWith('.tmp')) {
          payload.files[fn] = fs.readFileSync(fp, 'utf8');
        }
      }
      try {
        const enc = encryptStr(JSON.stringify(payload), passphrase);
        records.push({
          email: d,
          enc_payload: enc,
          updated_by: updater,
          last_synced_at: new Date().toISOString()
        });
      } catch (err) {
        console.log(`${RED}Failed to encrypt profile ${d}:${NC} ${err.message}`);
      }
    }
  }

  if (records.length === 0) {
    console.log(`${YELLOW}No valid profiles found to push.${NC}`);
    return;
  }

  console.log(`${CYAN}Pushing ${records.length} encrypted profile(s) to remote database (${config.provider})...${NC}`);
  try {
    await dbApiUpsert(config, records);
    console.log(`${GREEN}✔ Successfully pushed ${records.length} account(s) to team vault!${NC}`);
    for (const r of records) {
      console.log(`  • ${r.email}`);
    }
  } catch (err) {
    console.log(`${RED}Database Push Error:${NC} ${err.message}`);
  }
}

async function cliDbPull() {
  const config = getDbConfig();
  if (!config) {
    console.log(`${RED}Error:${NC} No database connected. Run '${BOLD}ag-auth db setup${NC}' first.`);
    return;
  }
  const passphrase = config.passphrase;
  if (!passphrase) {
    console.log(`${RED}Error:${NC} No encryption passphrase configured.`);
    return;
  }

  console.log(`${CYAN}Pulling team accounts from remote database (${config.provider})...${NC}`);
  let rows;
  try {
    rows = await dbApiFetch(config);
  } catch (err) {
    console.log(`${RED}Database Pull Error:${NC} ${err.message}`);
    return;
  }

  fs.mkdirSync(PROFILES_DIR, { recursive: true });
  let pulled = 0;

  for (const r of rows) {
    const { email, enc_payload, updated_by } = r;
    if (!email || !enc_payload) continue;

    let data;
    try {
      const decJson = decryptStr(enc_payload, passphrase);
      data = JSON.parse(decJson);
    } catch (_) {
      console.log(`  ${RED}✖ Failed to decrypt ${email}${NC} (incorrect passphrase!)`);
      continue;
    }

    const targetDir = path.join(PROFILES_DIR, email);
    fs.mkdirSync(targetDir, { recursive: true });
    if (!IS_WIN) {
      try { fs.chmodSync(targetDir, 0o700); } catch (_) {}
    }

    for (const [fn, content] of Object.entries(data.files || {})) {
      const fp = path.join(targetDir, fn);
      fs.writeFileSync(fp, content, 'utf8');
      if (!IS_WIN) {
        try { fs.chmodSync(fp, 0o600); } catch (_) {}
      }
    }

    pulled++;
    console.log(`  ${GREEN}✔ Synced:${NC} ${BOLD}${email}${NC} ${DIM}(updated by ${updated_by || 'remote'})${NC}`);
  }

  console.log(`\n${GREEN}✔ Decrypted and installed ${pulled} team account(s) into your local vault!${NC}`);
}

async function cliDbSync() {
  console.log(`${BOLD}${CYAN}=== Synchronizing Local & Team Vault ===${NC}`);
  console.log(`\n${BOLD}1. Pushing Local Profiles:${NC}`);
  await cliDbPush();
  console.log(`\n${BOLD}2. Pulling Team Profiles:${NC}`);
  await cliDbPull();
  console.log(`\n${GREEN}✔ Synchronization complete!${NC}`);
}

async function cliDbAutoPull(silent = true) {
  const config = getDbConfig();
  if (!config || config.auto_sync === false) return;

  const stampFile = path.join(VAULT_DIR, '.last_auto_pull');
  const now = Date.now();
  if (fs.existsSync(stampFile)) {
    try {
      const mtime = fs.statSync(stampFile).mtimeMs;
      if (now - mtime < 5 * 60 * 1000) return; // 5 min cooldown throttle
    } catch (_) {}
  }

  try {
    fs.writeFileSync(stampFile, String(now), 'utf8');
  } catch (_) {}

  try {
    const rows = await dbApiFetch(config);
    const passphrase = config.passphrase;
    if (!passphrase || !rows) return;

    fs.mkdirSync(PROFILES_DIR, { recursive: true });
    let newCnt = 0;

    for (const r of rows) {
      const { email, enc_payload } = r;
      if (!email || !enc_payload) continue;

      const targetDir = path.join(PROFILES_DIR, email);
      const tokenP = path.join(targetDir, 'antigravity-oauth-token');
      if (!fs.existsSync(tokenP)) {
        try {
          const decJson = decryptStr(enc_payload, passphrase);
          const data = JSON.parse(decJson);
          fs.mkdirSync(targetDir, { recursive: true });
          for (const [fn, content] of Object.entries(data.files || {})) {
            fs.writeFileSync(path.join(targetDir, fn), content, 'utf8');
          }
          newCnt++;
        } catch (_) {}
      }
    }
    if (newCnt > 0 && !silent) {
      process.stderr.write(`\x1b[36m☁ Auto-synced ${newCnt} new team profile(s) from database.\x1b[0m\n`);
    }
  } catch (_) {}
}

async function cliDbAutoSync(mode = 'status') {
  const config = getDbConfig();
  if (!config) {
    console.log(`${RED}Error:${NC} No database connected. Run '${BOLD}ag-auth db setup${NC}' first.`);
    return;
  }
  const curState = config.auto_sync !== false;
  if (['on', 'enable', 'true'].includes(mode)) {
    config.auto_sync = true;
    saveDbConfig(config);
    console.log(`${GREEN}✔ Auto-sync enabled.${NC} Accounts will sync with cloud automatically.`);
  } else if (['off', 'disable', 'false'].includes(mode)) {
    config.auto_sync = false;
    saveDbConfig(config);
    console.log(`${YELLOW}✔ Auto-sync disabled.${NC} Use '${BOLD}ag-auth db sync${NC}' for manual synchronization.`);
  } else {
    const stateStr = curState ? `${GREEN}Enabled (Active)${NC}` : `${YELLOW}Disabled${NC}`;
    console.log(`Database Auto-Sync: ${stateStr}`);
    console.log('  • Automatically pushes local accounts to cloud on save');
    console.log('  • Automatically pulls new team accounts on switch or list');
    console.log('\nTo toggle setting:');
    console.log('  ag-auth db auto-sync on   # Enable continuous auto-sync');
    console.log('  ag-auth db auto-sync off  # Disable (manual sync only)');
  }
}

async function cliDbDaemon(intervalSec = 300) {
  console.log(`${BOLD}${CYAN}=== Antigravity Team Vault Auto-Sync Daemon ===${NC}`);
  console.log(`Polling and synchronizing with database every ${BOLD}${intervalSec}${NC} seconds.`);
  console.log('Press Ctrl+C to stop.\n');

  while (true) {
    const timeStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    console.log(`[${timeStr}] Auto-syncing accounts...`);
    try {
      await cliDbSync();
    } catch (_) {}
    await new Promise(r => setTimeout(r, intervalSec * 1000));
  }
}

function cliDbDisconnect() {
  const cfgPath = path.join(VAULT_DIR, 'db_config.json');
  if (fs.existsSync(cfgPath)) {
    fs.unlinkSync(cfgPath);
    console.log(`${GREEN}✔ Remote database unlinked successfully.${NC}`);
    console.log('Your local vaulted profiles remain safe and intact.');
  } else {
    console.log(`${YELLOW}No remote database was connected.${NC}`);
  }
}

module.exports = {
  getDbConfig,
  saveDbConfig,
  cliDbSetup,
  cliDbStatus,
  cliDbPush,
  cliDbPull,
  cliDbSync,
  cliDbAutoPull,
  cliDbAutoSync,
  cliDbDaemon,
  cliDbDisconnect
};
