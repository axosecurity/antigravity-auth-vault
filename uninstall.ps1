# ==============================================================================
# Clean Uninstaller for Universal Antigravity Auth Vault (Windows PowerShell)
# ==============================================================================
param(
    [switch]$Purge
)

Write-Host "========================================================" -ForegroundColor Yellow
Write-Host "  Universal Antigravity Auth Vault — Windows Uninstaller" -ForegroundColor Yellow
Write-Host "========================================================`n" -ForegroundColor Yellow

$HiddenDir = Join-Path $env:USERPROFILE ".antigravity-auth-vault"
$BinDir = Join-Path $env:USERPROFILE "bin"
$DataVault = Join-Path $env:USERPROFILE ".gemini\auth_vault"

Write-Host "1. Removing hidden installation directory: $HiddenDir..."
if (Test-Path $HiddenDir) {
    Remove-Item -Path $HiddenDir -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  ✔ Removed $HiddenDir" -ForegroundColor Green
}

Write-Host "2. Removing Windows executables & shortcuts..."
$binFiles = @("ag-auth.cmd", "ag-auth.ps1", "@.cmd")
foreach ($bf in $binFiles) {
    $targetPath = Join-Path $BinDir $bf
    if (Test-Path $targetPath) {
        Remove-Item -Path $targetPath -Force -ErrorAction SilentlyContinue
        Write-Host "  ✔ Removed $targetPath" -ForegroundColor Green
    }
}

Write-Host "3. Cleaning PowerShell Profile..."
if (Test-Path $PROFILE) {
    $profileLines = Get-Content $PROFILE -ErrorAction SilentlyContinue
    $cleanLines = $profileLines | Where-Object { 
        $_ -notmatch "ag-auth" -and 
        $_ -notmatch "Register-ArgumentCompleter.*ag-auth" -and 
        $_ -notmatch 'function @' 
    }
    Set-Content -Path $PROFILE -Value $cleanLines
    Write-Host "  ✔ Cleaned $PROFILE" -ForegroundColor Green
}

if ($Purge) {
    if (Test-Path $DataVault) {
        Remove-Item -Path $DataVault -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "`n✔ Purged all local token profiles and database configs ($DataVault)." -ForegroundColor Green
    }
} else {
    Write-Host "`nNotice: Your vaulted account tokens & database keys in $DataVault were kept safe." -ForegroundColor Cyan
    Write-Host "To completely wipe all saved credentials, re-run with -Purge`n"
}

Write-Host "✔ Antigravity Auth Vault has been cleanly uninstalled from your Windows PC!`n" -ForegroundColor Green
