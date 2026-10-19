@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
where node >nul 2>&1
if %ERRORLEVEL% equ 0 (
    node "%SCRIPT_DIR%ag-auth.js" -t codex %*
    exit /b %ERRORLEVEL%
)
echo [ERROR] Node.js is required to run codex-auth. Please install Node.js.
exit /b 1
