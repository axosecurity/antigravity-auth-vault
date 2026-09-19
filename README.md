# Antigravity CLI Auth Vault & Session Switcher (`ag-auth`)

A fast, lightweight, zero-dependency session manager, multi-account switcher, and **real-time AI quota monitor** for **Google Antigravity CLI (`agy`)**.

Seamlessly switch between multiple Google accounts on your Mac, monitor token limits (Gemini and Claude models) across all accounts at a glance, and never run blind into unexpected rate limits again.

---

## ⚡ Key Features

- ⚡ **Instant Arrow-Key Switcher with Live Quota (`@` Shortcut)**: Simply type `@` and hit Enter. Use your `↑` / `↓` arrow keys to highlight any account and view real-time model quota percentages before pressing Enter.
- 📊 **Real-Time AI Quota Monitoring**: Queries Google Cloud Code's administrative quota API to report exact weekly and 5-hour rolling limit percentages for:
  - **Gemini Models** (Flash, Pro)
  - **Claude & GPT Models** (Sonnet, Opus, GPT-OSS)
- ⏳ **Intelligent Reset Timers**: Displays human-readable reset countdowns (e.g. `resets in 3d 8h` or `resets in 4h 46m`) so you know exactly when limits replenish.
- 🔄 **Autonomous Token Refresh**: Automatically uses OAuth refresh tokens to keep expired sessions refreshed in the background for quota checks and immediate login readiness.
- 🚀 **Sub-Millisecond Smart Caching**: Caches quota responses locally with a 3-minute TTL so navigation and switching remain blazing fast (<1ms).
- 🔄 **Dual-Layer Synchronization**: Atomically updates both the filesystem (`~/.gemini/antigravity-cli/antigravity-oauth-token`) and the **macOS Keychain** (`service: "gemini"`, `account: "antigravity"`), guaranteeing `agy` immediately picks up the switched session.
- 🔍 **Automatic Identity Detection**: Decodes Google identity JWT claims (`id_token`) to auto-detect emails.
- 🛡️ **Secure POSIX Permissions**: Enforces user-only access (`chmod 600` on token and credential files, `chmod 700` on directories).
- 💾 **Auto-Preservation**: Automatically preserves the active session into the vault before switching, preventing accidental session loss.
- 🧹 **Clean Detach Flow**: Stashes active credentials, stops background daemon processes (`agy remote-control stop`), and clears the active token and Keychain so you can authenticate a new account cleanly.
- 🖥️ **Interactive Menu**: Run `ag-auth` with no arguments for a guided terminal UI.

---

## 🏗️ Architecture Blueprint

```text
+-------------------------------------------------------------+
|                   Active Antigravity Runtime                |
|  • Filesystem: ~/.gemini/antigravity-cli/antigravity-oauth-token
|  • macOS Keychain: service="gemini", account="antigravity"  |
|  • Supporting: ~/.gemini/oauth_creds.json                   |
+------------------------------+------------------------------+
                               |
              [ ag-auth switch / detach / save / quota ]
                               |
                               v
+-------------------------------------------------------------+
|                  Protected Profile Vault                    |
|                   (~/.gemini/auth_vault/)                   |
|                                                             |
|   ├── profiles/first_account@gmail.com/                     |
|   │   ├── antigravity-oauth-token                           |
|   │   ├── oauth_creds.json                                  |
|   │   ├── profile.json                                      |
|   │   └── quota_cache.json                                  |
|   └── profiles/second_account@gmail.com/                    |
|       ├── antigravity-oauth-token                           |
|       ├── oauth_creds.json                                  |
|       ├── profile.json                                      |
|       └── quota_cache.json                                  |
+-------------------------------------------------------------+
```

---

## 🚀 Installation

### One-line Installation
From this repository directory:
```bash
chmod +x install.sh
./install.sh
```

### Manual Installation
```bash
# 1. Copy binary to your user bin path
mkdir -p ~/.local/bin
cp bin/ag-auth ~/.local/bin/ag-auth
chmod +x ~/.local/bin/ag-auth

# 2. Setup '@' shortcut symlink
ln -sf ~/.local/bin/ag-auth ~/.local/bin/@

# 3. Add alias to ~/.zshrc (if not already present)
echo 'alias @="ag-auth @"' >> ~/.zshrc
export PATH="$HOME/.local/bin:$PATH"
```

---

## 📖 Usage Guide

### 1. Instant Arrow-Key Switcher (`@` Shortcut)
Simply type `@` and hit Enter in your terminal:
```bash
@
```
Use the **`↑` and `↓` arrow keys** to highlight your desired account and press **`Enter`** (or press the corresponding number `1`, `2`...):

```text
Select Antigravity Account (↑/↓ arrow keys, Enter to switch, q to cancel):
  ▶ [1] sishihidul@gmail.com      [Gem: 100% | Cld: 100%] [CURRENT ACTIVE]
    [2] kaziaremon@gmail.com      [Gem:  23% | Cld:  96%]
    [3] kulsumaakter722@gmail.com [Gem:  80% | Cld: 100%]
```

*(You can also run `ag-auth switch` without parameters to open this same picker).*

---

### 2. AI Quota Dashboard (`ag-auth quota`)
Inspect your model quotas and reset countdowns across all stored accounts:
```bash
ag-auth quota
```

Output:
```text
========================================
  Antigravity AI Quota Dashboard        
========================================

Account: kaziaremon@gmail.com
  • Gemini Models (Flash, Pro):
      Weekly Limit:  [███░░░░░░░░░]  22.9% (resets in 3d 8h)
      5-Hour Window: [████████████]  99.1% (resets in 4h 45m)
  • Claude & GPT Models (Sonnet, Opus, GPT-OSS):
      Weekly Limit:  [████████████]  96.5% (resets in 2d 12h)
      5-Hour Window: [████████████] 100.0%

Account: kulsumaakter722@gmail.com
  • Gemini Models (Flash, Pro):
      Weekly Limit:  [██████████░░]  79.9% (resets in 3d 14h)
      5-Hour Window: [████████████]  99.1% (resets in 4h 46m)
  • Claude & GPT Models (Sonnet, Opus, GPT-OSS):
      Weekly Limit:  [████████████] 100.0%
      5-Hour Window: [████████████] 100.0%

Account: sishihidul@gmail.com [CURRENT ACTIVE]
  • Gemini Models (Flash, Pro):
      Weekly Limit:  [████████████]  99.5% (resets in 6d 23h)
      5-Hour Window: [████████████]  97.0% (resets in 4h 52m)
  • Claude & GPT Models (Sonnet, Opus, GPT-OSS):
      Weekly Limit:  [████████████] 100.0%
      5-Hour Window: [████████████] 100.0%
```

To bypass the 3-minute cache and fetch live figures immediately from Google:
```bash
ag-auth quota --refresh
```

To inspect a single specific account:
```bash
ag-auth quota kaziaremon@gmail.com
```

---

### 3. Profile Overview (`ag-auth list`)
List all vaulted profiles alongside their remaining quotas and token expirations:
```bash
ag-auth list
```

Output:
```text
=== Vaulted Antigravity Profiles & Quotas ===

    kaziaremon@gmail.com
      Gemini:  [██░░░░░░░░]  22.9% weekly (resets: 3d 8h) |  99.1% 5h
      Claude:  [██████████]  96.5% weekly (resets: 2d 12h) | 100.0% 5h
      Token Expiry: 2026-09-20 00:56:26 UTC

    kulsumaakter722@gmail.com
      Gemini:  [████████░░]  79.9% weekly (resets: 3d 14h) |  99.1% 5h
      Claude:  [██████████] 100.0% weekly | 100.0% 5h
      Token Expiry: 2026-09-20 00:56:26 UTC

▶ sishihidul@gmail.com [CURRENT ACTIVE]
      Gemini:  [██████████]  99.5% weekly (resets: 6d 23h) |  97.0% 5h
      Claude:  [██████████] 100.0% weekly | 100.0% 5h
      Token Expiry: 2026-09-20 00:44:21 UTC
```

---

### 4. Quick Command Reference

| Action | Command | Description |
| :--- | :--- | :--- |
| **Instant Switch** | `@` | Opens interactive arrow-key selector with live quotas (`↑`/`↓` + Enter) |
| **Switch (Interactive)**| `ag-auth switch` | Opens interactive arrow-key selector with live quotas |
| **Switch (Direct)** | `ag-auth switch <email>` | Swaps active session to the specified email |
| **AI Quota Dashboard** | `ag-auth quota` | Full quota dashboard with weekly/5h limits and reset timers |
| **Force Refresh Quota**| `ag-auth quota -r` | Bypasses local cache to fetch live quotas from Google |
| **Single Account Quota**| `ag-auth quota <email>`| Shows detailed quota cards for a specific profile |
| **Check Active** | `ag-auth current` | Shows active account, token details, and active AI quota |
| **Save Session** | `ag-auth save [name]` | Vaults current session (auto-detects email) |
| **Detach Session** | `ag-auth detach` | Clears active token so `agy` prompts for a new account |
| **List Accounts** | `ag-auth list` | Lists all vaulted profiles with inline progress bars |
| **Delete Account** | `ag-auth delete [name]` | Removes a profile from the vault |
| **Master Menu** | `ag-auth` | Opens interactive numbered terminal menu |

---

### 5. Multi-Account Setup Workflow

1. **Log in with Account A**: Run `agy` and complete login in browser.
2. **Save Account A**: Run `ag-auth save`.
3. **Detach Session**: Run `ag-auth detach`.
4. **Log in with Account B**: Run `agy` (a new OAuth browser prompt opens).
5. **Save Account B**: Run `ag-auth save`.
6. **Switch anytime**: Type `@` and hit Enter!

---

## 🔒 Security & Safe Operation

- **Zero Disruption to Active Sessions**: Uses the official, read-only administrative telemetry endpoint (`retrieveUserQuotaSummary`). It consumes **0 model tokens** and does not interrupt running agent interactions or command execution.
- **100% Local Storage**: All tokens, credentials, and metadata remain strictly on your local machine in `~/.gemini/auth_vault/`.
- **Restricted Permissions**: Directories are created with `0700` permissions and token files with `0600` permissions, ensuring no other user on the system can read them.
- **Git Protection**: The repository `.gitignore` automatically blocks tokens, credentials, cache files, and private keys from ever being staged or committed.

---

## 📄 License
MIT License.
