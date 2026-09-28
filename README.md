# Universal Antigravity Auth Vault & Multi-Account Switcher (`ag-auth`)

A fast, cross-platform, zero-dependency session vault, multi-account switcher, and **real-time AI quota monitor** for **Google Antigravity CLI (`agy`)**, **Antigravity IDE**, and **Antigravity 2.0 Desktop**.

Seamlessly switch between multiple Google accounts on **macOS**, **Linux**, and **Windows**, monitor AI token limits (Gemini and Claude models) across all accounts at a glance, and enjoy **tab autocompletion** across your favorite shells.

---

## ⚡ Key Features

- 🌐 **Universal Cross-Platform Core**: 100% compatible with **macOS**, all **Linux** distributions (Ubuntu, Debian, Fedora, Arch, Alpine, etc.), and **Windows** (PowerShell, Command Prompt, Git Bash, and WSL).
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
|                              Protected Profile Vault                              |
|                               (~/.gemini/auth_vault/)                             |
|                                                                                   |
|   ├── profiles/first_account@gmail.com/                                           |
|   │   ├── antigravity-oauth-token       (CLI session token)                       |
|   │   ├── ide_state.json                (IDE session snapshot)                   |
|   │   ├── app_state.json                (2.0 Desktop session snapshot)            |
|   │   ├── oauth_creds.json              (Supporting OAuth credentials)            |
|   │   ├── profile.json                  (Metadata & saved timestamp)              |
|   │   └── quota_cache.json              (Cached AI model quota response)          |
|   └── profiles/second_account@gmail.com/                                          |
|       ├── ...                                                                     |
+-----------------------------------------------------------------------------------+
```

---

## 🚀 Installation

### macOS & Linux

#### One-line Installation
From this repository directory:
```bash
chmod +x install.sh
./install.sh
```

The installer automatically:
1. Copies `ag-auth` to `~/.local/bin/ag-auth`
2. Creates the instant `@` shortcut symlink
3. Configures `PATH` in `~/.zshrc` / `~/.bashrc`
4. Automatically installs **tab autocompletion** for your active shell

---

### Windows (PowerShell & Command Prompt)

#### One-line Installation
Run in PowerShell (as your standard user):
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\install.ps1
```

The Windows installer automatically:
1. Copies `ag-auth`, `ag-auth.cmd`, `ag-auth.ps1`, and `@.cmd` to `~/bin/`
2. Configures your User `PATH` environment variable
3. Registers `@` shortcut and tab autocompletion in your PowerShell `$PROFILE`

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
- `ag-auth <TAB>` ➔ Auto-completes subcommands: `switch`, `quota`, `list`, `current`, `save`, `detach`, `delete`, `completion`
- `ag-auth switch <TAB>` ➔ Auto-completes all saved account emails!
- `@ <TAB>` ➔ Auto-completes all saved account emails!
- `ag-auth quota <TAB>` ➔ Auto-completes accounts and flags (`--refresh`)

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
    [2] kaziaremon@gmail.com      [Gem:  89% | Cld: 100%]
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
      Weekly Limit:  [███████████░]  89.0% (resets in 3d 21h)
      5-Hour Window: [███████████░]  93.3% (resets in 3h 19m)
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
      Gemini:  [█████████░]  89.0% weekly (resets: 3d 21h) |  93.3% 5h
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
| **AI Quotas** | `ag-auth quota [--refresh]` | Full quota dashboard with progress bars and reset countdowns |
| **Check Active** | `ag-auth current` | Shows active account, runtime surface connections, and limits |
| **Save Session** | `ag-auth save [name]` | Vaults current session (auto-captures CLI + IDE + 2.0) |
| **Detach Session** | `ag-auth detach [-s surface]` | Clears active tokens so you can authenticate a new account |
| **List Accounts** | `ag-auth list [--refresh]` | Lists vaulted profiles with live quota summary & surfaces |
| **Install Tabs** | `ag-auth completion install` | One-step tab autocompletion setup for your active shell |
| **Master Menu** | `ag-auth` | Opens interactive numbered terminal menu |

---

## 🔒 Security & Privacy

- **100% Local Storage**: All tokens, credentials, and metadata remain strictly on your local machine in `~/.gemini/auth_vault/`.
- **Restricted Permissions**: Directories are created with `0700` permissions and token files with `0600` permissions on POSIX systems.
- **Git Protection**: The repository `.gitignore` automatically blocks tokens, credentials, cache files, and private keys from ever being staged or committed.

---

## 📄 License
MIT License.
