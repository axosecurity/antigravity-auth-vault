@echo off
setlocal enabledelayedexpansion

REM ============================================================================
REM ag-auth: Universal Antigravity Multi-Account Session Vault (Windows Launcher)
REM ============================================================================

where bash >nul 2>&1
if %ERRORLEVEL% equ 0 (
    bash "%~dp0ag-auth" %*
    exit /b %ERRORLEVEL%
)

where powershell >nul 2>&1
if %ERRORLEVEL% equ 0 (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0ag-auth.ps1" %*
    exit /b %ERRORLEVEL%
)

echo [ERROR] Neither Git Bash nor PowerShell was found to execute ag-auth.
echo Please install Git for Windows (which includes Git Bash) or ensure PowerShell is enabled.
exit /b 1
