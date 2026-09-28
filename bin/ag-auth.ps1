# Universal Antigravity Multi-Account Session Vault (PowerShell Launcher)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (Get-Command node -ErrorAction SilentlyContinue) {
    & node "$ScriptDir\ag-auth.js" @args
    exit $LASTEXITCODE
} else {
    Write-Error "Node.js is required to run ag-auth. Please install Node.js (https://nodejs.org)."
    exit 1
}
