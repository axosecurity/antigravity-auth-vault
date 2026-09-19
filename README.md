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

### 1. Instant Arrow-Key Switcher (`@` Shortcut)
Simply type `@` and hit Enter in your terminal:
```bash
@
```
Use the **`↑` and `↓` arrow keys** to highlight your desired account and press **`Enter`** (or press the corresponding number `1`, `2`...).
Zero typing, zero copy-pasting!

```text
Select Antigravity Account (↑/↓ arrow keys, Enter to switch, q to cancel):
  ▶ [1] kaziaremon@gmail.com (exp: 04:54 UTC) [CURRENT ACTIVE]
    [2] kulsumaakter722@gmail.com (exp: 05:02 UTC)
```

*(You can also run `ag-auth switch` without parameters to open this same picker).*

### 2. Check Active Session
Displays the currently active account, token location, and expiration time:
```bash
ag-auth current
```

### 3. Save Active Session to Vault
Archives the current account session into the local vault (auto-extracts the email address):
```bash
ag-auth save
```

### 4. Direct Account Switch
Switch directly to an account by name or email:
```bash
ag-auth switch kaziaremon@gmail.com
ag-auth switch kulsumaakter722@gmail.com
```

### 5. Log In to a New Account (Detach Flow)
Safely saves your current session and clears the active token so Antigravity CLI prompts for a fresh login:
```bash
ag-auth detach
```
Then:
1. Run Antigravity CLI: `agy`
2. Complete Google sign-in with your new account.
3. Run `ag-auth save`.

### 6. List Saved Profiles
View all accounts stored in the vault, with indicators for the currently active session:
```bash
ag-auth list
```

### 7. Full Interactive Menu
Run without arguments for the numbered master menu:
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
