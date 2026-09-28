# Universal Antigravity Auth Vault & Multi-Account Switcher (`ag-auth`)

<p align="center">
  <a href="https://github.com/axosecurity/antigravity-auth-vault/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/Platform-macOS%20%7C%20Linux%20%7C%20Windows-brightgreen.svg?style=for-the-badge" alt="Platforms">
  <img src="https://img.shields.io/badge/Node.js-%3E%3D14.0.0-339933.svg?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Security-AES--256--CBC%20E2EE-blueviolet.svg?style=for-the-badge" alt="Security">
  <img src="https://img.shields.io/badge/Team%20Sync-Neon%20%7C%20PostgreSQL%20%7C%20Supabase-00e699.svg?style=for-the-badge" alt="Databases">
</p>

<p align="center">
  <strong>A high-performance, cross-platform session vault, instant account switcher, encrypted team database synchronizer, and real-time AI quota monitor for Google Antigravity.</strong><br>
  Works seamlessly across <strong>Antigravity CLI (<code>agy</code>)</strong>, <strong>Antigravity IDE</strong>, and <strong>Antigravity 2.0 Desktop</strong>.
</p>

---

## ⚡ Instant 1-Line Setup

Run this in any terminal or command prompt (macOS, Linux, Windows). No NPM registry publishing required — installs directly from GitHub:

```bash
npx github:axosecurity/antigravity-auth-vault
```

> **What this does:**
> 1. Installs the tool into a dedicated hidden directory: `~/.antigravity-auth-vault` (Windows: `%USERPROFILE%\.antigravity-auth-vault`).
> 2. Links the `ag-auth` executable and the instant 1-character `@` switcher to your user binary PATH.
> 3. Configures tab autocompletion in your shell (`zsh`, `bash`, `fish`, or `PowerShell`).
> 4. Captures your current active Antigravity session and displays live AI model quotas.

---

## 🎯 Why Antigravity Auth Vault?

Google Antigravity provides powerful AI assistance, but developers frequently encounter two major friction points:

1. **Quota Exhaustion**: Heavy coding sessions quickly deplete weekly and 5-hour rolling limits on Gemini Pro and Claude Sonnet models.
2. **Multi-Account Juggling**: Switching accounts between personal, work, and client accounts requires logging out, clearing browser cookies, re-authenticating, and re-linking IDE databases manually.

### The Solution: Pooled Team Quotas & 1-Key Switching

With **Antigravity Auth Vault**, you can save unlimited Google accounts into an encrypted local vault or synchronize them with your team via **Neon / PostgreSQL** or **Supabase**. When your primary account reaches its limit, simply hit `@` and switch to a refreshed account in **under 200 milliseconds**!

```text
$ @
Select Universal Antigravity Account (↑/↓ arrow keys, Enter to switch, 1-9 direct, q to cancel):
  ▶ [1] kaziaremon@gmail.com   [Gem:  82.3% | Cld: 100.0%] [CURRENT ACTIVE] (CLI, IDE, App)
    [2] work-lead@company.com  [Gem:  99.1% | Cld: 100.0%]  (CLI, IDE, App)
    [3] team-ai-pool@gmail.com [Gem:  84.2% | Cld: 100.0%]  (CLI)
    [4] sandbox-dev@gmail.com  [Gem:  92.5% | Cld:  63.1%]  (CLI)
```

---

## ✨ Features at a Glance

| Feature | Description |
| :--- | :--- |
| **🚀 Pure Node.js Core** | 100% written in modern Node.js (`>= 14`). Zero external Python or OpenSSL CLI dependencies. |
| **⚡ Instant `@` Switcher** | Type `@` to launch an interactive terminal UI with arrow-key navigation and live quota bars. |
| **📊 Real-Time AI Quota Monitor** | Directly queries Google Cloud Code quota APIs for weekly and 5-hour limits on Gemini & Claude. |
| **⏳ Smart Reset Timers** | Displays exact countdowns until model capacity refills (e.g. `resets: 3d 20h` or `resets: 2h 7m`). |
| **☁️ Team Database Sync** | 1-line connection to serverless PostgreSQL (**Neon**, **Supabase**, or shared network folders). |
| **🔐 Zero-Knowledge E2EE** | Tokens are encrypted on your device using **AES-256-CBC (PBKDF2 with 100,000 iterations)**. |
| **🧩 Multi-Surface Atomic Sync** | Automatically updates **CLI (`agy`)**, **Antigravity IDE**, and **2.0 Desktop** SQLite state. |
| **⌨️ Tab Autocompletion** | Full `<TAB>` completion for commands, flags, and account emails in Bash, Zsh, Fish, & PowerShell. |
| **🛡️ Universal OS Keyring** | Integrates with **Apple Keychain**, **Linux Secret Service**, and **Windows Credential Manager**. |
| **🗑️ Clean Uninstallation** | Remove the tool and shell links anytime with a single command (`ag-auth uninstall`). |

---

## 🏗️ System Architecture

```text
+-----------------------------------------------------------------------------------+
|                            Active Antigravity Runtimes                            |
|                                                                                   |
|  • CLI:      ~/.gemini/antigravity-cli/antigravity-oauth-token & OS Keyring       |
|  • IDE:      Antigravity IDE/User/globalStorage/state.vscdb (SQLite ItemTable)    |
|  • 2.0 App:  Antigravity/User/globalStorage/state.vscdb (SQLite ItemTable)        |
+------------------------------------------+----------------------------------------+
                                           |
                    [ ag-auth switch / detach / save / quota ]
                                           |
                                           v
+-----------------------------------------------------------------------------------+
|                              Protected Local Vault                                |
|                             (~/.gemini/auth_vault/)                               |
|                                                                                   |
|   ├── profiles/first_account@gmail.com/                                           |
|   │   ├── antigravity-oauth-token       (CLI session token)                       |
|   │   ├── ide_state.json                (IDE session snapshot)                    |
|   │   ├── app_state.json                (2.0 Desktop session snapshot)            |
|   │   ├── oauth_creds.json              (Supporting OAuth credentials)            |
|   │   ├── profile.json                  (Metadata & saved timestamp)              |
|   │   └── quota_cache.json              (Cached AI model quota response)          |
|   └── db_config.json                    (Remote database credentials & settings)  |
+------------------------------------------+----------------------------------------+
                                           |
                        [ ag-auth db push / pull / sync ]
                       (Client-Side AES-256-CBC Encrypted)
                                           |
                                           v
+-----------------------------------------------------------------------------------+
|                          Remote Team Vault / Cloud DB                             |
|                    (Neon PostgreSQL / Supabase / Shared Folder)                   |
|                                                                                   |
|   Row: { email, enc_payload (AES-256), updated_by, last_synced_at }               |
+-----------------------------------------------------------------------------------+
```

---

## 📦 Installation & Setup Methods

### Method 1: NPX (Recommended — Universal)

Installs directly from GitHub without cloning or publishing to the npm registry:

```bash
npx github:axosecurity/antigravity-auth-vault
```

### Method 2: Global NPM Installation

If you prefer global npm binary management:

```bash
npm install -g github:axosecurity/antigravity-auth-vault
```

### Method 3: Git Clone & Local Script

#### macOS & Linux
```bash
git clone https://github.com/axosecurity/antigravity-auth-vault.git
cd antigravity-auth-vault && ./install.sh
```

#### Windows (PowerShell)
```powershell
git clone https://github.com/axosecurity/antigravity-auth-vault.git
cd antigravity-auth-vault
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\install.ps1
```

---

## 💡 Daily Workflow Guide

### 1. Save Your First Account
Log in to Antigravity as usual, then archive the session:
```bash
ag-auth save
# Or specify a custom tag:
ag-auth save work-account@gmail.com
```

### 2. Log in to a Second Account
Detach the active session to prepare for a clean Google OAuth login:
```bash
ag-auth detach
```
Open Antigravity CLI or IDE, sign in to your second Google account in the browser, then save it:
```bash
ag-auth save second-account@gmail.com
```

### 3. Switch Instantly with `@`
Type `@` in your terminal to open the interactive arrow-key selector:
```bash
@
```
Or switch directly by email with tab-completion:
```bash
@ second-account@gmail.com
# Or
ag-auth switch second-account@gmail.com
```

### 4. Check Your AI Quota Limits
View weekly and 5-hour rolling limits for Gemini and Claude models:
```bash
ag-auth quota
```

Output:
```text
=== Antigravity AI Quota Dashboard: kaziaremon@gmail.com ===

  • Gemini Models (Flash, Pro):
      Weekly Limit:  [████████░░░░]  82.3% (3d 20h)
      5-Hour Window: [██████░░░░░░]  52.9% (2h 7m)

  • Claude & GPT Models (Sonnet, Opus, GPT-OSS):
      Weekly Limit:  [████████████] 100.0% (6d 23h)
      5-Hour Window: [████████████] 100.0% (4h 59m)
```

---

## ☁️ Team Database & Cloud Synchronization

Why remain bottlenecked by a single developer's quota? Connect a serverless database and pool multiple accounts across your engineering team.

### 🔐 Zero-Knowledge Security Guarantee
- Your Google tokens are **never sent in plaintext**.
- Everything is encrypted client-side using **AES-256-CBC (PBKDF2 with 100,000 iterations)** using your shared team passphrase.
- The remote database stores only unreadable ciphertext.

---

### Provider 1: Neon Serverless PostgreSQL (Recommended)

[Neon](https://neon.tech) offers a free serverless PostgreSQL database with zero maintenance:

#### 1-Line Setup:
```bash
ag-auth db setup "postgresql://<connection_string>"
```
*(Optionally pass your team encryption passphrase as the second argument, default: `antigravity-team-vault`)*

`ag-auth` will automatically:
1. Connect via native Node.js PostgreSQL client with SSL encryption.
2. Create the `antigravity_vault` table automatically if missing.
3. Securely store connection credentials in `~/.gemini/auth_vault/db_config.json` (`0600` permissions).
4. Run an initial synchronization.

---

### Provider 2: Supabase (Free Hosted Postgres REST)

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** and create the vault table:
   ```sql
   CREATE TABLE IF NOT EXISTS antigravity_vault (
       email TEXT PRIMARY KEY,
       enc_payload TEXT NOT NULL,
       updated_by TEXT NOT NULL,
       last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ALTER TABLE antigravity_vault ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Allow team sync" ON antigravity_vault FOR ALL USING (true) WITH CHECK (true);
   ```
3. Run guided setup:
   ```bash
   ag-auth db setup
   ```
   Select **2 (Supabase)**, paste your project URL, anon key, and passphrase.

---

### Provider 3: Shared Cloud Drive (Dropbox, Google Drive, iCloud, NFS)

If your team uses a shared cloud drive, no database setup is required:
```bash
ag-auth db setup
```
Select **3 (Shared Folder)** and enter the folder path (e.g. `~/Dropbox/TeamVault`). Each profile is stored as an encrypted `.vault.enc` file.

---

### 🔄 Continuous Auto-Sync
Once connected to a database:
- **Auto-Push**: Running `ag-auth save` automatically encrypts and pushes the profile to the team cloud.
- **Auto-Pull**: Running `@`, `ag-auth switch`, or `ag-auth list` checks for new team accounts automatically.
- **Background Daemon**: Run `ag-auth db daemon` in a tmux window for continuous 5-minute polling sync.

---

## ⌨️ Tab Autocompletion (Lazy Programmer Mode)

Set up tab completion in 5 seconds:
```bash
ag-auth completion install
```

Supports **Zsh**, **Bash**, **Fish**, and **PowerShell**:
- `ag-auth switch <TAB>` ➔ Auto-completes all saved account emails!
- `@ <TAB>` ➔ Auto-completes all saved account emails!
- `ag-auth db <TAB>` ➔ Auto-completes database actions (`status`, `sync`, `push`, `pull`, `daemon`).
- `ag-auth quota <TAB>` ➔ Auto-completes account names and `--refresh`.

---

## 🗑️ Clean Deletion & Uninstallation

You can cleanly remove Antigravity Auth Vault from your computer anytime:

### From CLI:
```bash
ag-auth uninstall
```

### Or via GitHub NPX:
```bash
npx github:axosecurity/antigravity-auth-vault uninstall
```

### Complete Purge (Wipes Stored Tokens as Well):
```bash
ag-auth uninstall --purge
# Or
npx github:axosecurity/antigravity-auth-vault uninstall --purge
```

The uninstaller removes:
- The hidden directory `~/.antigravity-auth-vault`
- Binary shortcuts (`ag-auth` and `@`)
- Shell completions (`_ag-auth`, `.ag-auth-completion.bash`, fish completions)
- Shell startup aliases from `~/.zshrc`, `~/.bashrc`, and PowerShell `$PROFILE`

---

## 🛡️ Security & Credential Isolation

Antigravity Auth Vault is designed from the ground up to prevent secret leaks:

1. **Isolated Storage**: Database keys and connection strings reside exclusively in `~/.gemini/auth_vault/db_config.json` with strict `0600` permissions.
2. **Zero-Knowledge E2EE**: Tokens are encrypted client-side using OpenSSL-compatible AES-256-CBC PBKDF2 (100,000 rounds).
3. **Hardened `.gitignore`**: All credential files, token dumps, and database configs are permanently excluded.
4. **Git Pre-Commit Guard**: A built-in Git hook (`.githooks/pre-commit`) scans every staged diff and blocks commits containing connection strings or tokens.
5. **Password Masking**: Terminal outputs (e.g. `ag-auth db status`) automatically redact database passwords (`••••••••`).

---

## 📖 Command Reference Cheat Sheet

| Command | Action |
| :--- | :--- |
| `@` | Launch instant interactive arrow-key account selector |
| `@ <email>` | Directly switch active account across all surfaces |
| `ag-auth switch [email]` | Switch account (CLI, IDE, and 2.0 Desktop) |
| `ag-auth switch <email> -s ide` | Switch only Antigravity IDE |
| `ag-auth switch <email> -s app` | Switch only Antigravity 2.0 Desktop |
| `ag-auth switch <email> -s cli` | Switch only Antigravity CLI |
| `ag-auth quota [--refresh]` | Display detailed AI quota dashboard (Gemini & Claude limits) |
| `ag-auth list [--refresh]` | List all vaulted profiles with inline quota progress bars |
| `ag-auth current` | Show active account, token expiry, and runtime surfaces |
| `ag-auth save [name]` | Save current session to vault (auto-captures CLI + IDE + App) |
| `ag-auth detach` | Stash active session and clear tokens for fresh login |
| `ag-auth delete <email>` | Remove an account profile from local vault |
| `ag-auth db setup "<url>"` | Connect team database (Neon / Postgres, Supabase, Folder) |
| `ag-auth db status` | Check database connection health & remote profile count |
| `ag-auth db sync` | Two-way sync: push local accounts & pull team accounts |
| `ag-auth db push` | Encrypt & upload local accounts to team database |
| `ag-auth db pull` | Download & decrypt team accounts to local vault |
| `ag-auth db auto-sync [on\|off]` | Check or toggle continuous automatic sync |
| `ag-auth db daemon [seconds]` | Run continuous background polling auto-sync daemon |
| `ag-auth db disconnect` | Unlink team database (keeps local profiles intact) |
| `ag-auth completion install` | Install tab autocompletion for current shell |
| `ag-auth uninstall [--purge]` | Cleanly remove the tool from your system |
| `ag-auth version` | Display engine version and platform info |
| `ag-auth help` | View complete help guide |

---

## 🤝 Contributing

Contributions, bug reports, and suggestions are welcome! Please feel free to open an issue or submit a pull request on [GitHub](https://github.com/axosecurity/antigravity-auth-vault).

---

## 📄 License

This project is open-source software licensed under the **[MIT License](LICENSE)**.
