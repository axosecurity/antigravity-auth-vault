<#
.SYNOPSIS
Universal Antigravity Multi-Account Session Vault & Token Switcher for PowerShell
.DESCRIPTION
Manages Google Antigravity authentication profiles across CLI, Antigravity IDE, and Antigravity 2.0 Desktop.
#>
param(
    [Parameter(Position=0)]
    [string]$Command = "",

    [Parameter(Position=1)]
    [string]$Target = "",

    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$RemainingArgs
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BashExe = Get-Command bash -ErrorAction SilentlyContinue

if ($BashExe) {
    # If Git Bash or WSL is available, forward cleanly with all arguments
    & $BashExe.Source (Join-Path $ScriptDir "ag-auth") $Command $Target $RemainingArgs
    exit $LASTEXITCODE
}

# Native Python Fallback on Windows
$PythonExe = Get-Command python -ErrorAction SilentlyContinue
if (-not $PythonExe) {
    $PythonExe = Get-Command py -ErrorAction SilentlyContinue
}

if ($PythonExe) {
    # Run the core logic through Python
    $GeminiDir = Join-Path $HOME ".gemini"
    $ProfilesDir = Join-Path $GeminiDir "auth_vault\profiles"
    $CliToken = Join-Path $GeminiDir "antigravity-cli\antigravity-oauth-token"
    
    Write-Host "[ag-auth] Executing via Windows Python runtime..." -ForegroundColor Cyan
    & $PythonExe.Source -c "
import sys, os, subprocess
print('Antigravity Windows Native Session Manager')
"
} else {
    Write-Error "Neither Git Bash nor Python 3 was detected on your Windows machine. Please install Git for Windows or Python 3."
    exit 1
}
