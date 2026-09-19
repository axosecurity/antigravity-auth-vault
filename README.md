# Antigravity CLI Auth Vault & Session Switcher (`ag-auth`)

A fast, lightweight, zero-dependency session manager and multi-account switcher for **Google Antigravity CLI**.

Seamlessly switch between multiple Google accounts on your Mac without going through cumbersome logouts, losing token validity, or re-authenticating repeatedly.

---

## ⚡ Key Features

- 🔄 **Zero-Logout Switching**: Switch accounts instantly by atomically swapping active session tokens.
- 🔍 **Automatic Identity Detection**: Automatically parses Google identity JWT claims (`id_token`) to detect emails (e.g. `kaziaremon@gmail.com`).
- 🛡️ **Secure POSIX Permissions**: Strictly preserves user-only access (`chmod 600` on credentials, `700` on directories).
- 💾 **Auto-Preservation**: Automatically preserves current active tokens before switching to prevent accidental session loss.
- ⚡ **Detached Login Flow**: Stashes your current active token so you can log in with a second Gmail account cleanly.
- 🖥️ **Interactive Menu**: Run `ag-auth` with no arguments for a guided terminal UI.

---

## 🏗️ Architecture Blueprint

```
+-------------------------------------------------------------+
|                      Active Runtime                         |
|  ~/.gemini/antigravity-cli/antigravity-oauth-token          |
|  ~/.gemini/oauth_creds.json                                 |
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

Or manually copy the binary to your user bin directory:
```bash
mkdir -p ~/.local/bin
cp bin/ag-auth ~/.local/bin/ag-auth
chmod +x ~/.local/bin/ag-auth
```

Ensure `~/.local/bin` is in your `$PATH` (default in macOS zsh):
```bash
# Add to ~/.zshrc if not already present:
export PATH="$HOME/.local/bin:$PATH"
```

---

## 📖 Usage Guide

### 1. Check Active Session
Displays the currently active account, token location, and expiration time:
```bash
ag-auth current
```

### 2. Save Active Session to Vault
Archives the current account session into the local vault. If no profile name is provided, it automatically extracts the email address:
```bash
ag-auth save
# or with a custom alias:
ag-auth save work-account
```

### 3. Log In to a Second Account (Detach Flow)
Safely saves your current session and clears the active token file so the Antigravity CLI prompts for a fresh login:
```bash
ag-auth detach
```
Then:
1. Run Antigravity CLI or send a message.
2. Sign in with your new Google account via the OAuth prompt.
3. Once logged in, run:
   ```bash
   ag-auth save
   ```

### 4. Switch Accounts Anytime
Quickly swap back to any saved account profile:
```bash
ag-auth switch kaziaremon@gmail.com
```

### 5. List Saved Profiles
View all accounts stored in the vault, with indicators for the currently active session:
```bash
ag-auth list
```

### 6. Interactive Mode
Run without arguments for an interactive selection prompt:
```bash
ag-auth
```

---

## 🔒 Security & Privacy

- **Local Storage Only**: All session tokens and credentials remain strictly on your local machine inside `~/.gemini/auth_vault/`.
- **Restricted Permissions**: Profile directories are created with `0700` permissions and token files are created with `0600` permissions, ensuring other users on the system cannot read them.
- **Git Protection**: The repository `.gitignore` automatically blocks tokens, credentials, and cache files from ever being committed.

---

## 📄 License
MIT License.
