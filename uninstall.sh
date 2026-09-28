#!/usr/bin/env bash
# ==============================================================================
# Clean Uninstaller for Universal Antigravity Auth Vault (macOS & Linux)
# ==============================================================================
set -euo pipefail

PURGE=false
for arg in "$@"; do
    if [[ "$arg" == "--purge" || "$arg" == "-p" ]]; then
        PURGE=true
    fi
done

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BOLD}${YELLOW}========================================================${NC}"
echo -e "${BOLD}${YELLOW}  Universal Antigravity Auth Vault — Uninstaller        ${NC}"
echo -e "${BOLD}${YELLOW}========================================================${NC}\n"

HIDDEN_DIR="${HOME}/.antigravity-auth-vault"
BIN_DIR="${HOME}/.local/bin"
DATA_VAULT="${HOME}/.gemini/auth_vault"

echo "1. Removing hidden installation directory: ${HIDDEN_DIR}..."
if [[ -d "${HIDDEN_DIR}" ]]; then
    rm -rf "${HIDDEN_DIR}"
    echo -e "  ${GREEN}✔ Removed ${HIDDEN_DIR}${NC}"
fi

echo "2. Removing binary executables & shortcuts..."
for bin_file in "${BIN_DIR}/ag-auth" "${BIN_DIR}/@"; do
    if [[ -f "${bin_file}" || -L "${bin_file}" ]]; then
        rm -f "${bin_file}"
        echo -e "  ${GREEN}✔ Removed ${bin_file}${NC}"
    fi
done

echo "3. Removing shell completions..."
for comp in "${HOME}/.zfunc/_ag-auth" "${HOME}/.ag-auth-completion.bash" "${HOME}/.config/fish/completions/ag-auth.fish" "${HOME}/.config/fish/completions/@.fish"; do
    if [[ -f "${comp}" || -L "${comp}" ]]; then
        rm -f "${comp}"
        echo -e "  ${GREEN}✔ Removed ${comp}${NC}"
    fi
done

echo "4. Cleaning up shell startup configurations..."
for rc in "${HOME}/.zshrc" "${HOME}/.bashrc" "${HOME}/.bash_profile"; do
    if [[ -f "${rc}" ]]; then
        if grep -qE "ag-auth|alias @=\"ag-auth @\"|\.zfunc|_ag-auth|\.ag-auth-completion" "${rc}" 2>/dev/null; then
            tmp_rc="${rc}.tmp.$$"
            grep -vE "ag-auth|alias @=\"ag-auth @\"|\.zfunc.*_ag-auth|\.ag-auth-completion" "${rc}" > "${tmp_rc}" || true
            mv "${tmp_rc}" "${rc}"
            echo -e "  ${GREEN}✔ Cleaned ${rc}${NC}"
        fi
    fi
done

# Data purge decision
if [[ "${PURGE}" == "true" ]]; then
    if [[ -d "${DATA_VAULT}" ]]; then
        rm -rf "${DATA_VAULT}"
        echo -e "\n${GREEN}✔ Purged all local token profiles and database configs (${DATA_VAULT}).${NC}"
    fi
else
    echo -e "\n${CYAN}Notice:${NC} Your vaulted account tokens & database keys in ${BOLD}${DATA_VAULT}${NC} were kept safe."
    echo -e "If you wish to completely wipe all saved credentials, run:"
    echo -e "  ${BOLD}rm -rf ${DATA_VAULT}${NC} (or run with ${BOLD}--purge${NC})\n"
fi

echo -e "${GREEN}✔ Antigravity Auth Vault has been cleanly uninstalled from your computer!${NC}\n"
