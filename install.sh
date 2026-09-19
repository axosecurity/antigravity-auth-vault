#!/usr/bin/env bash
# ==============================================================================
# Installer for ag-auth (Antigravity CLI Session Vault)
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_SRC="${SCRIPT_DIR}/bin/ag-auth"
TARGET_DIR="${HOME}/.local/bin"
TARGET_BIN="${TARGET_DIR}/ag-auth"

echo "Installing ag-auth to ${TARGET_DIR}..."

mkdir -p "${TARGET_DIR}"
chmod +x "${BIN_SRC}"
cp -f "${BIN_SRC}" "${TARGET_BIN}"
chmod +x "${TARGET_BIN}"

echo "✔ Successfully installed ag-auth to ${TARGET_BIN}"

# Verify PATH
if [[ ":$PATH:" != *":${TARGET_DIR}:"* ]]; then
    echo "Notice: ${TARGET_DIR} is not in your current PATH."
    echo "Add this line to your ~/.zshrc or ~/.bashrc:"
    echo '  export PATH="$HOME/.local/bin:$PATH"'
else
    echo "✔ ${TARGET_DIR} is in your PATH. You can run 'ag-auth' from anywhere!"
fi

echo ""
"${TARGET_BIN}" current
