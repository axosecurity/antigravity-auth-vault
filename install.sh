#!/usr/bin/env bash
# ==============================================================================
# Universal Installer for ag-auth (macOS & Linux)
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_SRC="${SCRIPT_DIR}/bin/ag-auth"
TARGET_DIR="${HOME}/.local/bin"
TARGET_BIN="${TARGET_DIR}/ag-auth"

echo "========================================================"
echo "  Installing Universal Antigravity Auth Vault           "
echo "  macOS • Linux • Multi-Surface (CLI, IDE, 2.0 Desktop) "
echo "========================================================"

mkdir -p "${TARGET_DIR}"
chmod +x "${BIN_SRC}"
cp -f "${BIN_SRC}" "${TARGET_BIN}"
chmod +x "${TARGET_BIN}"

# Setup '@' symlink for instant 1-character switcher
ln -sf "${TARGET_BIN}" "${TARGET_DIR}/@"

echo "✔ Successfully installed ag-auth and '@' shortcut to ${TARGET_DIR}"

# Add alias to ~/.zshrc if zsh present
if [[ -f "${HOME}/.zshrc" ]] && ! grep -q 'alias @=' "${HOME}/.zshrc"; then
    echo 'alias @="ag-auth @"' >> "${HOME}/.zshrc"
    echo "✔ Added '@' alias to ~/.zshrc"
fi

# Add alias to ~/.bashrc if bash present
if [[ -f "${HOME}/.bashrc" ]] && ! grep -q 'alias @=' "${HOME}/.bashrc"; then
    echo 'alias @="ag-auth @"' >> "${HOME}/.bashrc"
    echo "✔ Added '@' alias to ~/.bashrc"
fi

# Verify and configure PATH
PATH_LINE='export PATH="$HOME/.local/bin:$PATH"'
if [[ ":$PATH:" != *":${TARGET_DIR}:"* ]]; then
    echo "Configuring PATH in shell rc files..."
    [[ -f "${HOME}/.zshrc" ]] && ! grep -q 'PATH=.*\.local/bin' "${HOME}/.zshrc" && echo "${PATH_LINE}" >> "${HOME}/.zshrc"
    [[ -f "${HOME}/.bashrc" ]] && ! grep -q 'PATH=.*\.local/bin' "${HOME}/.bashrc" && echo "${PATH_LINE}" >> "${HOME}/.bashrc"
    echo "✔ Added ~/.local/bin to PATH."
else
    echo "✔ ${TARGET_DIR} is already in your PATH."
fi

# Automatically install tab completion for active shell
echo ""
"${TARGET_BIN}" completion install

echo ""
"${TARGET_BIN}" current
