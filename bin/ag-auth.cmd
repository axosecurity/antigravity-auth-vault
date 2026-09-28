@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
where node >nul 2>&1
if %ERRORLEVEL% equ 0 (
    node "%SCRIPT_DIR%ag-auth.js" %*
    exit /b %ERRORLEVEL%
)
echo [ERROR] Node.js is required to run ag-auth. Please install Node.js (https://nodejs.org).
exit /b 1
