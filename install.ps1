# ==============================================================================
# Windows PowerShell Installer for ag-auth (Universal Antigravity Auth Vault)
# Installs to hidden directory $HOME\.antigravity-auth-vault
# ==============================================================================
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

Write-Host "========================================================" -ForegroundColor Magenta
Write-Host "  Installing Universal Antigravity Auth Vault (Windows) " -ForegroundColor Magenta
Write-Host "========================================================" -ForegroundColor Magenta

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BinSource = Join-Path $ScriptDir "bin"
$HiddenDir = Join-Path $HOME ".antigravity-auth-vault"
$HiddenBin = Join-Path $HiddenDir "bin"

# 1. Hidden system install
Write-Host "1. Installing to hidden directory: $HiddenDir..." -ForegroundColor Cyan
if (-not (Test-Path $HiddenBin)) {
    New-Item -ItemType Directory -Path $HiddenBin -Force | Out-Null
}
Copy-Item (Join-Path $BinSource "*") $HiddenBin -Recurse -Force
$uninst = Join-Path $ScriptDir "uninstall.ps1"
if (Test-Path $uninst) {
    Copy-Item $uninst $HiddenDir -Force
}

# 2. Target user directory for binaries
$TargetDir = Join-Path $HOME "bin"
if (-not (Test-Path $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
}

Write-Host "2. Linking executables to $TargetDir..." -ForegroundColor Cyan
Copy-Item (Join-Path $HiddenBin "ag-auth") (Join-Path $TargetDir "ag-auth") -Force
Copy-Item (Join-Path $HiddenBin "ag-auth.cmd") (Join-Path $TargetDir "ag-auth.cmd") -Force
Copy-Item (Join-Path $HiddenBin "ag-auth.ps1") (Join-Path $TargetDir "ag-auth.ps1") -Force
Copy-Item (Join-Path $HiddenBin "@.cmd") (Join-Path $TargetDir "@.cmd") -Force

# Setup PATH in User Environment
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$TargetDir*") {
    Write-Host "3. Adding $TargetDir to User PATH..." -ForegroundColor Cyan
    $NewPath = "$TargetDir;$UserPath"
    [Environment]::SetEnvironmentVariable("Path", $NewPath, "User")
    $env:Path = "$TargetDir;$env:Path"
    Write-Host "✔ PATH successfully updated." -ForegroundColor Green
} else {
    Write-Host "3. Target directory is already in User PATH." -ForegroundColor Green
}

# Setup PowerShell Profile Completion & '@' Shortcut
if (-not (Test-Path $PROFILE)) {
    New-Item -ItemType File -Path $PROFILE -Force | Out-Null
}

$ProfileContent = Get-Content $PROFILE -Raw -ErrorAction SilentlyContinue
$ShortcutBlock = @"

# Universal Antigravity Auth Switcher Shortcuts & Completion
function @ { & "$TargetDir\ag-auth.cmd" @ `$args }
Register-ArgumentCompleter -Native -CommandName 'ag-auth', '@' -ScriptBlock {
    param(`$wordToComplete, `$commandAst, `$cursorPosition)
    `$commands = @('switch', 'quota', 'list', 'current', 'save', 'detach', 'delete', 'db', 'completion', 'uninstall', 'version', 'help')
    `$profiles = @(ag-auth _profiles 2>`$null)
    `$elements = `$commandAst.Elements

    if (`$elements.Count -le 2) {
        `$commands | Where-Object { `$_ -like "`$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new(`$_, `$_, 'ParameterValue', `$_)
        }
    } else {
        `$sub = `$elements[1].Extent.Text
        if (`$sub -in @('switch', 'quota', 'delete', '@')) {
            `$profiles | Where-Object { `$_ -like "`$wordToComplete*" } | ForEach-Object {
                [System.Management.Automation.CompletionResult]::new(`$_, `$_, 'ParameterValue', `$_)
            }
        }
    }
}
"@

if ($ProfileContent -notlike "*Universal Antigravity Auth Switcher*") {
    Write-Host "4. Registering '@' shortcut and Tab Completion in PowerShell `$PROFILE..." -ForegroundColor Cyan
    Add-Content -Path $PROFILE -Value $ShortcutBlock
    Write-Host "✔ Tab autocompletion registered in $PROFILE." -ForegroundColor Green
} else {
    Write-Host "4. PowerShell Profile is already configured." -ForegroundColor Green
}

Write-Host ""
Write-Host "✔ Installation Complete!" -ForegroundColor Green
Write-Host "You can now use '@' or 'ag-auth' from any PowerShell, CMD, or Windows Terminal window."
Write-Host "Restart your terminal or run '. `$PROFILE' to activate tab autocompletion." -ForegroundColor Yellow
