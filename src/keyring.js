/**
 * Universal Antigravity Auth Vault
 * OS Keyring Integration (macOS Keychain, Linux Secret Service, Windows Credential Manager)
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const { PLATFORM, IS_WIN } = require('./config');

const SERVICE = 'gemini';
const ACCOUNT = 'antigravity';

function keyringRead() {
  try {
    if (PLATFORM === 'darwin') {
      const out = execSync(`security find-generic-password -s ${SERVICE} -a ${ACCOUNT} -w 2>/dev/null`, { encoding: 'utf8' }).trim();
      if (out.startsWith('go-keyring-base64:')) {
        return Buffer.from(out.slice('go-keyring-base64:'.length), 'base64').toString('utf8');
      }
      return out;
    } else if (PLATFORM === 'linux') {
      const out = execSync(`secret-tool lookup service ${SERVICE} account ${ACCOUNT} 2>/dev/null`, { encoding: 'utf8' }).trim();
      if (out.startsWith('go-keyring-base64:')) {
        return Buffer.from(out.slice('go-keyring-base64:'.length), 'base64').toString('utf8');
      }
      return out;
    } else if (IS_WIN) {
      const ps = `
        [Windows.Security.Credentials.PasswordVault,Windows.Security.Credentials,ContentType=WindowsRuntime] | Out-Null
        $v = New-Object Windows.Security.Credentials.PasswordVault
        try {
          $c = $v.Retrieve('${SERVICE}', '${ACCOUNT}')
          $c.RetrievePassword()
          Write-Output $c.Password
        } catch {}
      `;
      const out = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf8' });
      const raw = (out.stdout || '').trim();
      if (raw.startsWith('go-keyring-base64:')) {
        return Buffer.from(raw.slice('go-keyring-base64:'.length), 'base64').toString('utf8');
      }
      return raw;
    }
  } catch (_) {}
  return '';
}

function keyringSync(tokenFilePath) {
  if (!fs.existsSync(tokenFilePath)) return;
  try {
    const rawContent = fs.readFileSync(tokenFilePath, 'utf8').trim();
    if (!rawContent) return;
    const b64 = 'go-keyring-base64:' + Buffer.from(rawContent, 'utf8').toString('base64');

    if (PLATFORM === 'darwin') {
      spawnSync('security', ['add-generic-password', '-U', '-s', SERVICE, '-a', ACCOUNT, '-w', b64], { stdio: 'ignore' });
    } else if (PLATFORM === 'linux') {
      spawnSync('secret-tool', ['store', '--label', 'antigravity', 'service', SERVICE, 'account', ACCOUNT], {
        input: b64,
        encoding: 'utf8',
        stdio: ['pipe', 'ignore', 'ignore']
      });
    } else if (IS_WIN) {
      const ps = `
        [Windows.Security.Credentials.PasswordVault,Windows.Security.Credentials,ContentType=WindowsRuntime] | Out-Null
        $v = New-Object Windows.Security.Credentials.PasswordVault
        $c = New-Object Windows.Security.Credentials.PasswordCredential('${SERVICE}', '${ACCOUNT}', '${b64}')
        $v.Add($c)
      `;
      spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { stdio: 'ignore' });
    }
  } catch (_) {}
}

function keyringDelete() {
  try {
    if (PLATFORM === 'darwin') {
      spawnSync('security', ['delete-generic-password', '-s', SERVICE, '-a', ACCOUNT], { stdio: 'ignore' });
    } else if (PLATFORM === 'linux') {
      spawnSync('secret-tool', ['clear', 'service', SERVICE, 'account', ACCOUNT], { stdio: 'ignore' });
    } else if (IS_WIN) {
      const ps = `
        [Windows.Security.Credentials.PasswordVault,Windows.Security.Credentials,ContentType=WindowsRuntime] | Out-Null
        $v = New-Object Windows.Security.Credentials.PasswordVault
        try {
          $c = $v.Retrieve('${SERVICE}', '${ACCOUNT}')
          $v.Remove($c)
        } catch {}
      `;
      spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { stdio: 'ignore' });
    }
  } catch (_) {}
}

module.exports = {
  keyringRead,
  keyringSync,
  keyringDelete
};
