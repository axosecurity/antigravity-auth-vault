# Antigravity CLI Auth Vault & Session Switcher (`ag-auth`)

A fast, lightweight, zero-dependency session manager and multi-account switcher for **Google Antigravity CLI (`agy`)**.

Seamlessly switch between multiple Google accounts on your Mac without going through cumbersome logouts, losing token validity, or re-authenticating repeatedly.

---

## ⚡ Key Features

- ⚡ **Instant Arrow-Key Switcher (`@` Shortcut)**: Simply type `@` and hit Enter. Use your `↑` / `↓` arrow keys to highlight any account and press Enter. Zero typing, zero copy-pasting.
- 🔄 **Dual-Layer Synchronization**: Atomically updates both the filesystem (`~/.gemini/antigravity-cli/antigravity-oauth-token`) and the **macOS Keychain** (`service: "gemini"`, `account: "antigravity"`), guaranteeing `agy` immediately picks up the switched session.
- 🔍 **Automatic Identity Detection**: Decodes Google identity JWT claims (`id_token`) to auto-detect emails (e.g., `kaziaremon@gmail.com`).
- 🛡️ **Secure POSIX Permissions**: Enforces user-only access (`chmod 600` on token and credential files, `chmod 700` on directories).
- 💾 **Auto-Preservation**: Automatically preserves the active session into the vault before switching, preventing accidental session loss.
- 🧹 **Clean Detach Flow**: Stashes active credentials, stops background daemon processes (`agy remote-control serve`), and clears the active token and Keychain so you can authenticate a second account cleanly.
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
                   [ ag-auth switch / detach / save ]
                               |
                               v
+-------------------------------------------------------------+
|                  Protected Profile Vault                    |
|                   (~/.gemini/auth_vault/)                   |
|                                                             |
|   ├── profiles/kaziaremon@gmail.com/                        |
|   │   ├── antigravity-oauth-token                           |
|   │   ├── oauth_creds.json                                  |
|   │   └── profile.json                                      |
|   └── profiles/second_account@gmail.com/                    |
|       ├── antigravity-oauth-token                           |
|       ├── oauth_creds.json                                  |
|       └── profile.json                                      |
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
Use the **`↑` and `↓` arrow keys** to highlight your desired account and press **`Enter`** (or press the corresponding number `1`, `2`...).

```text
Select Antigravity Account (↑/↓ arrow keys, Enter to switch, q to cancel):
  ▶ [1] kaziaremon@gmail.com (exp: 04:54 UTC) [CURRENT ACTIVE]
    [2] kulsumaakter722@gmail.com (exp: 05:02 UTC)
```

*(You can also run `ag-auth switch` without parameters to open this same picker).*

---

### 2. Quick Command Reference

| Action | Command | Description |
| :--- | :--- | :--- |
| **Instant Switch** | `@` | Opens interactive arrow-key selector (`↑`/`↓` + Enter) |
| **Switch (Interactive)**| `ag-auth switch` | Opens interactive arrow-key selector |
| **Switch (Direct)** | `ag-auth switch <email>` | Swaps active session to the specified email |
| **Check Active** | `ag-auth current` | Shows currently active email, storage source, and expiry |
| **Save Session** | `ag-auth save [name]` | Vaults current session (auto-detects email) |
| **Detach Session** | `ag-auth detach` | Clears active token so `agy` prompts for a new account |
| **List Accounts** | `ag-auth list` | Lists all vaulted profiles with active indicator |
| **Delete Account** | `ag-auth delete [name]` | Removes a profile from the vault |
| **Master Menu** | `ag-auth` | Opens interactive numbered terminal menu |

---

### 3. Step-by-Step Multi-Account Setup

#### Step A: Save your first account
When currently logged into Antigravity CLI with your first account:
```bash
ag-auth save
```

#### Step B: Detach to log into your second account
```bash
ag-auth detach
```
This safely archives your current session and clears the active token and Keychain.

#### Step C: Authenticate your second account
Run Antigravity CLI:
```bash
agy
```
Because no token is active, `agy` will prompt you with a Google OAuth login in your browser. Sign in with your second account.

#### Step D: Save your second account
Once logged into `agy`, run in another terminal:
```bash
ag-auth save
```

#### Step E: Switch anytime
Whenever you want to switch between accounts:
```bash
@
```
Use `↑` / `↓` and press `Enter` to select whichever account you want to work with!

---

## 🔒 Security & Privacy

- **100% Local Storage**: All tokens, credentials, and metadata remain strictly on your local machine in `~/.gemini/auth_vault/`.
- **Restricted Permissions**: Directories are created with `0700` permissions and token files with `0600` permissions, ensuring no other user on the system can read them.
- **Git Protection**: The repository `.gitignore` automatically blocks tokens, credentials, cache files, and private keys from ever being staged or committed.

---

## 📄 License
MIT License.
