# Universal Antigravity Auth Vault & Multi-Account Switcher (`ag-auth`)

A fast, cross-platform, zero-dependency session vault, multi-account switcher, **cloud team database synchronizer**, and **real-time AI quota monitor** for **Google Antigravity CLI (`agy`)**, **Antigravity IDE**, and **Antigravity 2.0 Desktop**.

Seamlessly switch between multiple Google accounts on **macOS**, **Linux**, and **Windows**, monitor AI token limits (Gemini and Claude models) across all accounts, share pooled quota across team members via a **friction-free encrypted remote database**, and enjoy **tab autocompletion** across your favorite shells.

---

## ⚡ Key Features

- 🌐 **Universal Cross-Platform Core**: 100% compatible with **macOS**, all **Linux** distributions (Ubuntu, Debian, Fedora, Arch, Alpine, etc.), and **Windows** (PowerShell, Command Prompt, Git Bash, and WSL).
- ☁️ **Friction-Free Team Database & Cloud Sync**: Connect **Supabase** in 30 seconds, connect a **Shared Cloud Drive** (Dropbox, Google Drive, iCloud, NFS), or connect any **REST API** to pool and share accounts across your team.
- 🔐 **Zero-Knowledge Client-Side Encryption (E2EE)**: Sensitive Google OAuth tokens and runtime state are encrypted locally via **military-grade AES-256-CBC (PBKDF2 with 100,000 iterations)** before leaving your laptop. The remote database stores only ciphertext.
- 🧩 **Multi-Surface Synchronization**: Simultaneously switches and manages authentication for:
  - **Antigravity CLI (`agy`)** (`~/.gemini/antigravity-cli/`)
  - **Antigravity IDE** (`~/Library/Application Support/Antigravity IDE/` or `~/.config/Antigravity IDE/` or `%APPDATA%\Antigravity IDE\`)
  - **Antigravity 2.0 Desktop** (`~/Library/Application Support/Antigravity/` or `~/.config/Antigravity/` or `%APPDATA%\Antigravity\`)
- ⌨️ **Tab Autocompletion (Lazy Programmer Mode)**: Press `<TAB>` to auto-complete commands, flags, and dynamically discover vaulted account names/emails (`ag-auth switch <TAB>`, `@ <TAB>`). Supports **Bash**, **Zsh**, **Fish**, and **PowerShell**.
- ⚡ **Instant Arrow-Key Switcher with Live Quota (`@` Shortcut)**: Type `@` and hit Enter. Use your `↑` / `↓` arrow keys to highlight any account and view real-time model quota percentages before pressing Enter.
- 📊 **Real-Time AI Quota Monitoring**: Queries Google Cloud Code's administrative quota API to report exact weekly and 5-hour rolling limit percentages for:
  - **Gemini Models** (Flash, Pro)
  - **Claude & GPT Models** (Sonnet, Opus, GPT-OSS)
- ⏳ **Intelligent Reset Timers**: Displays human-readable reset countdowns (e.g. `resets in 3d 8h` or `resets in 4h 46m`) so you know exactly when limits replenish.
- 🔄 **Autonomous Token Refresh**: Automatically uses OAuth refresh tokens to keep expired sessions refreshed in the background for quota checks and immediate login readiness.
- 🚀 **Sub-Millisecond Smart Caching**: Caches quota responses locally with a 3-minute TTL so navigation and switching remain blazing fast (<1ms).
- 🛡️ **Universal OS Keyring Adapter**: Automatically syncs sessions with macOS Apple Keychain (`security`), Linux Secret Service (`secret-tool`), and Windows Credential Manager.
- 💾 **Auto-Preservation**: Automatically preserves the active session into the vault before switching, preventing accidental session loss.
- 🧹 **Clean Detach Flow**: Stashes active credentials, stops background daemon processes (`agy remote-control stop`), and clears active tokens across all surfaces so you can authenticate a new account cleanly.
- 🖥️ **Interactive Menu**: Run `ag-auth` with no arguments for a guided terminal UI.

---

## 🏗️ Architecture Blueprint

```text
+-----------------------------------------------------------------------------------+
|                            Active Antigravity Runtimes                            |
|                                                                                   |
|  • CLI:      ~/.gemini/antigravity-cli/antigravity-oauth-token & OS Keyring        |
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
|   │   ├── ide_state.json                (IDE session snapshot)                   |
|   │   ├── app_state.json                (2.0 Desktop session snapshot)            |
|   │   ├── oauth_creds.json              (Supporting OAuth credentials)            |
|   │   ├── profile.json                  (Metadata & saved timestamp)              |
|   │   └── quota_cache.json              (Cached AI model quota response)          |
|   └── db_config.json                    (Remote database credentials & settings)  |
+------------------------------------------+----------------------------------------+
                                           |
                       [ ag-auth db push / pull / sync ]
                       (Zero-Knowledge AES-256 Encrypted)
                                           |
                                           v
+-----------------------------------------------------------------------------------+
|                          Remote Team Vault / Cloud DB                             |
|              (Supabase PostgreSQL / Shared Cloud Drive / REST API)                |
|                                                                                   |
|   Row: { email, enc_payload (AES-256), updated_by, last_synced_at }               |
+-----------------------------------------------------------------------------------+
```

---

## 🚀 Installation

### 1. Instant 1-Line Installation via NPX (Recommended — Universal for macOS, Linux, Windows)

The easiest way to install. Simply run this in your terminal or Command Prompt:

```bash
npx antigravity-auth-vault
```

The universal NPX installer automatically:
1. Installs the program into a dedicated, hidden directory: `~/.antigravity-auth-vault` (Windows: `%USERPROFILE%\.antigravity-auth-vault`) following industry open-source standards.
2. Links `ag-auth` and the instant `@` shortcut to your user binary path (`~/.local/bin` or `~/bin`).
3. Verifies and configures `PATH` in your shell startup files (`~/.zshrc`, `~/.bashrc`, or Windows User Environment).
4. Automatically installs **tab autocompletion** for your active shell (Bash, Zsh, Fish, or PowerShell).
5. Tests and displays your current active Antigravity session and AI quota.

---

### 2. Native Shell Scripts

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

## 🗑️ Clean Deletion & Uninstallation

You can cleanly remove this program from your computer at any time.

### From the CLI
```bash
ag-auth uninstall
```

### Or via NPX
```bash
npx antigravity-auth-vault uninstall
```

### Optional: Wipe Vaulted Tokens as Well
By default, the uninstaller preserves your vaulted account profiles in `~/.gemini/auth_vault` so you never accidentally lose your tokens. If you wish to perform a complete wipe of all saved credentials and database keys:
```bash
ag-auth uninstall --purge
# Or
npx antigravity-auth-vault uninstall --purge
```

The uninstaller cleanly deletes:
- The hidden installation directory (`~/.antigravity-auth-vault`)
- All binary links (`ag-auth` and `@`)
- Shell tab completion scripts (`_ag-auth`, `.ag-auth-completion.bash`, fish completions)
- Shell startup aliases from `~/.zshrc`, `~/.bashrc`, and PowerShell `$PROFILE`

---

## 🛡️ Database Key & Local Credential Security

Security and confidentiality are core to the architecture of Antigravity Auth Vault:
1. **Isolated Storage**: Database connection keys and configuration are stored in `~/.gemini/auth_vault/db_config.json` with strict `0600` permissions, completely outside any git repository.
2. **Zero-Knowledge Encryption**: Tokens are encrypted locally using **AES-256-CBC (PBKDF2 with 100,000 iterations)** before transmission to your database.
3. **Hardened `.gitignore`**: Remote database configurations, local tokens, account maps, `.env`, and secret files are permanently excluded from Git.
4. **Git Pre-Commit Security Guard**: Built-in `.githooks/pre-commit` scans staged files and diffs, automatically blocking any commit containing connection strings with passwords or credential files.
5. **Password Masking**: Terminal outputs (e.g. `ag-auth db status`) automatically mask connection passwords to prevent disclosure in terminal history or screen sharing.

---

## ☁️ Friction-Free Remote Database & Team Vault Sharing

Why stay limited by individual Google account quota when your entire team can pool 10+ accounts together?

If 10 developers pool their accounts into a shared vault, the team gets access to **10 independent quotas**. When developer A runs out of quota on a heavy task, they simply press `@` and switch to an account with 100% available limits contributed by developer B!

### 🔐 Zero-Knowledge Client-Side Encryption
- Your Google tokens are **never sent in plaintext**.
- Everything is encrypted on your machine using **AES-256-CBC (PBKDF2 with 100,000 iterations)** with a shared **Team Passphrase**.
- Even if your database is publicly readable, without the passphrase the ciphertext cannot be decrypted.

---

### Provider 1: PostgreSQL / Neon (Recommended — Instant 1-Line Setup)

Connect any PostgreSQL database directly, including serverless Postgres providers like [Neon](https://neon.tech), Supabase Postgres, AWS RDS, DigitalOcean, or self-hosted PostgreSQL:

#### Quick 1-Line Connection
```bash
ag-auth db setup "postgresql://user:password@ep-xyz.neon.tech/neondb?sslmode=require"
```
*(Optionally provide your team encryption passphrase as the second argument, default: `antigravity-team-vault`)*

`ag-auth` will automatically:
1. Test your database connection.
2. Auto-create the encrypted `antigravity_vault` table if it doesn't already exist.
3. Securely store the configuration in `~/.gemini/auth_vault/db_config.json` (`chmod 600`).
4. Mask connection passwords in status outputs to prevent accidental disclosure.

---

### Provider 2: Supabase (Free Hosted Postgres REST)

Supabase provides a free hosted PostgreSQL database with a built-in REST API that `ag-auth` speaks natively over HTTP:

#### Step 1: Create a Free Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a free project.
2. In the Supabase Dashboard, go to **Project Settings ➔ API**. Copy your:
   - **Project URL** (e.g., `https://xyzcompany.supabase.co`)
   - **anon public API Key** (or service_role key)

#### Step 2: Create the Table in Supabase
In your Supabase Dashboard, go to **SQL Editor**, paste and run this snippet:
```sql
CREATE TABLE IF NOT EXISTS antigravity_vault (
    email TEXT PRIMARY KEY,
    enc_payload TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Allow anonymous team sync (ciphertext is already client-side AES-256 encrypted):
ALTER TABLE antigravity_vault ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow team sync" ON antigravity_vault FOR ALL USING (true) WITH CHECK (true);
```

#### Step 3: Run Guided Setup in Terminal
```bash
ag-auth db setup
```
Select **2 (Supabase)**, paste your URL, Key, and enter your team's encryption passphrase.

---

### Provider 3: Shared Cloud Drive / Folder (Dropbox, Google Drive, iCloud, NFS)

If your team already shares a folder in Google Drive, Dropbox, iCloud, or a local server share:
1. Run:
   ```bash
   ag-auth db setup
   ```
2. Select **3 (Shared Folder)**.
3. Enter the folder path (e.g. `~/Dropbox/TeamVault` or `/Volumes/TeamShare/Vault`).
4. Enter your Team Encryption Passphrase.

`ag-auth` stores each profile as an encrypted `.vault.enc` file in the folder. No cloud account or database required!

---

### Provider 4: Custom HTTP REST API (Cloudflare Worker, Next.js, FastAPI)

Point `ag-auth` to any internal team microservice or Cloudflare Worker that accepts JSON payloads with optional Bearer Token authentication.

---

### 🔄 Continuous Automatic Synchronization

Once connected to a database, you never have to manually push or pull accounts:
- **Instant Initial Sync**: Connecting immediately syncs local and remote vaults.
- **Auto-Push on Save**: Running `ag-auth save` automatically encrypts and pushes the saved account directly to the team cloud database.
- **Auto-Pull on Switch / List**: Opening `@`, switching accounts, or listing profiles automatically checks the cloud vault and pulls down new accounts contributed by teammates.
- **Background Daemon**: Run `ag-auth db daemon` for continuous timed polling in tmux or background tasks.

---

### Team Sync Commands

| Command | Action |
| :--- | :--- |
| `ag-auth db setup [url] [key]` | Connects Neon/Postgres, Supabase, or shared folder (interactive wizard if no URL passed) |
| `ag-auth db auto-sync [on\|off]` | Check or toggle continuous automatic synchronization |
| `ag-auth db daemon [seconds]` | Run continuous background polling auto-sync daemon (default interval: 300s) |
| `ag-auth db sync` | **Two-way sync**: Pushes your local accounts and pulls new team accounts in one command |
| `ag-auth db push` | Encrypts and uploads all local profiles to the remote database |
| `ag-auth db pull` | Downloads and decrypts all team profiles into your local vault |
| `ag-auth db status` | Tests database connection, masks secrets, and displays total remote team accounts |
| `ag-auth db disconnect` | Safely unlinks the database (local profiles are never deleted) |

---

## ⌨️ Tab Autocompletion (Lazy Programmer Mode)

Never type repetitive commands or account emails again.

### Automatic Setup
Run this once from your terminal:
```bash
ag-auth completion install
```

### Manual Shell Setup

#### Zsh (`~/.zshrc`)
```zsh
eval "$(ag-auth completion zsh)"
```

#### Bash (`~/.bashrc`)
```bash
eval "$(ag-auth completion bash)"
```

#### Fish (`~/.config/fish/config.fish`)
```fish
ag-auth completion fish | source
```

#### PowerShell (`$PROFILE`)
```powershell
Invoke-Expression (ag-auth completion powershell | Out-String)
```

### What You Can Auto-Complete:
- `ag-auth <TAB>` ➔ Auto-completes subcommands: `switch`, `quota`, `list`, `current`, `save`, `detach`, `delete`, `db`, `completion`
- `ag-auth switch <TAB>` ➔ **Auto-completes all saved account emails!**
- `@ <TAB>` ➔ **Auto-completes all saved account emails!**
- `ag-auth db <TAB>` ➔ Auto-completes database actions: `setup`, `status`, `push`, `pull`, `sync`, `disconnect`
- `ag-auth quota <TAB>` ➔ Auto-completes account names and `--refresh`

---

## 📖 Usage Guide

### 1. Instant Arrow-Key Switcher (`@` Shortcut)
Simply type `@` and hit Enter in your terminal:
```bash
@
```
Use the **`↑` and `↓` arrow keys** to highlight your desired account and press **`Enter`** (or press the corresponding number `1`, `2`...):

```text
Select Universal Antigravity Account (↑/↓ arrow keys, Enter to switch, q to cancel):
  ▶ [1] sishihidul@gmail.com      [Gem: 100% | Cld: 100%] [CURRENT ACTIVE]
    [2] kaziaremon@gmail.com      [Gem:  87% | Cld: 100%]
    [3] kulsumaakter722@gmail.com [Gem:  99% | Cld: 100%]
```

Or switch directly:
```bash
@ kaziaremon@gmail.com
```

---

### 2. Multi-Surface Switching (`-s` / `--surface`)
By default, switching updates **all surfaces** (CLI, IDE, and 2.0 Desktop App). You can also selectively target a specific surface:

```bash
# Switch all surfaces (CLI, IDE, 2.0 App)
ag-auth switch kaziaremon@gmail.com

# Switch only Antigravity IDE
ag-auth switch kaziaremon@gmail.com -s ide

# Switch only Antigravity 2.0 Desktop
ag-auth switch kaziaremon@gmail.com -s app

# Switch only Antigravity CLI
ag-auth switch kaziaremon@gmail.com -s cli
```

> **Note on Running IDE / Desktop Apps**: If Antigravity IDE or 2.0 Desktop is open when you switch, `ag-auth` updates the SQLite database immediately and alerts you to reload your IDE window (`Cmd/Ctrl+Shift+P` ➔ *Reload Window*) or restart the app.

---

### 3. AI Quota Dashboard (`ag-auth quota`)
Inspect model quotas and reset countdowns across all stored accounts:
```bash
ag-auth quota
```

Output:
```text
========================================
  Universal Antigravity Quota Dashboard 
========================================

Account: kaziaremon@gmail.com [CURRENT ACTIVE]
  • Gemini Models (Flash, Pro):
      Weekly Limit:  [███████████░]  87.4% (resets in 3d 21h)
      5-Hour Window: [██████████░░]  83.7% (resets in 3h 19m)
  • Claude & GPT Models (Sonnet, Opus, GPT-OSS):
      Weekly Limit:  [████████████] 100.0%
      5-Hour Window: [████████████] 100.0%

Account: kulsumaakter722@gmail.com
  • Gemini Models (Flash, Pro):
      Weekly Limit:  [████████████]  99.1% (resets in 6d 0h)
      5-Hour Window: [████████████] 100.0%
  • Claude & GPT Models (Sonnet, Opus, GPT-OSS):
      Weekly Limit:  [████████████] 100.0%
      5-Hour Window: [████████████] 100.0%
```

To bypass the cache and fetch fresh live numbers:
```bash
ag-auth quota --refresh
```

---

### 4. Account Overview (`ag-auth list`)
List all vaulted profiles with inline quota bars and runtime surface indicators:
```bash
ag-auth list
```

Output:
```text
=== Vaulted Antigravity Profiles & Quotas ===

▶ kaziaremon@gmail.com [CURRENT ACTIVE] (CLI, IDE, App)
      Gemini:  [█████████░]  87.4% weekly (resets: 3d 21h) |  83.7% 5h
      Claude:  [██████████] 100.0% weekly | 100.0% 5h
      Token Expiry: 2026-09-28 14:35:04 UTC

    kulsumaakter722@gmail.com (CLI, IDE, App)
      Gemini:  [██████████]  99.1% weekly (resets: 6d 0h) | 100.0% 5h
      Claude:  [██████████] 100.0% weekly | 100.0% 5h
      Token Expiry: 2026-09-28 16:16:18 UTC
```

---

### 5. Quick Command Reference

| Action | Command | Description |
| :--- | :--- | :--- |
| **Instant Switch** | `@` | Opens interactive arrow-key selector (`↑`/`↓` + Enter) |
| **Direct Switch** | `@ <email>` | Swaps active session to the specified email across all surfaces |
| **Surface Switch** | `ag-auth switch <email> -s <surface>` | Target specific runtime (`all`, `cli`, `ide`, `app`) |
| **Two-Way DB Sync** | `ag-auth db sync` | Sync local vault with team cloud database |
| **Push Accounts** | `ag-auth db push` | Encrypt & upload local accounts to team vault |
| **Pull Accounts** | `ag-auth db pull` | Download & decrypt team accounts from team vault |
| **Database Status**| `ag-auth db status` | Check connection health & count of team accounts |
| **Database Setup** | `ag-auth db setup` | Interactive wizard to connect Supabase or Drive |
| **AI Quotas** | `ag-auth quota [--refresh]` | Full quota dashboard with progress bars and reset countdowns |
| **Check Active** | `ag-auth current` | Shows active account, runtime surface connections, and limits |
| **Save Session** | `ag-auth save [name]` | Vaults current session (auto-captures CLI + IDE + 2.0) |
| **Detach Session** | `ag-auth detach [-s surface]` | Clears active tokens so you can authenticate a new account |
| **List Accounts** | `ag-auth list [--refresh]` | Lists vaulted profiles with live quota summary & surfaces |
| **Install Tabs** | `ag-auth completion install` | One-step tab autocompletion setup for your active shell |
| **Master Menu** | `ag-auth` | Opens interactive numbered terminal menu |

---

## 🔒 Security & Privacy

- **Zero-Knowledge Encryption**: When syncing with remote databases or shared drives, tokens are encrypted with client-side **AES-256-CBC (PBKDF2 with 100,000 iterations)** using your team passphrase.
- **Local Storage Isolation**: Local files in `~/.gemini/auth_vault/` are stored strictly with POSIX `0700` directory and `0600` file permissions.
- **Git Protection**: The repository `.gitignore` automatically blocks tokens, credentials, cache files, and private keys from ever being staged or committed.

---

## 📄 License
MIT License.
