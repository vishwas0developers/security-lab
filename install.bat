@echo off
REM ============================================================================
REM Security Platform - Windows first-time bootstrap installer (launcher)
REM ============================================================================
REM This file is intentionally minimal. It only: confirms it's running on
REM Windows, locates itself (so it works from any working directory and with
REM paths containing spaces), confirms PowerShell is available, then hands
REM off ALL real installation logic (prerequisite checks, directory
REM creation, npm install/build/link, runtime config generation) to
REM scripts\install.ps1, and finally preserves that script's exit code and
REM pauses so failures are visible instead of the window closing instantly.
REM
REM Why the logic isn't here: an earlier version of this script implemented
REM everything directly in batch, using goto/label state machines and
REM parenthesized if/else blocks. In this environment, cmd.exe repeatedly
REM corrupted its own execution of that script -- re-running trailing
REM sections multiple times, silently skipping others, infinite-looping back
REM to the top, and even failing with "The system cannot find the batch
REM label specified" for labels that were genuinely present in the file.
REM Each fix (removing exit/b-from-inside-parens, removing nested if/else,
REM removing goto loops in favor of for/L, moving `call` sites out of
REM parens) only produced a new failure mode. PowerShell has no equivalent
REM parsing fragility, is installed by default on every supported version of
REM Windows, and is therefore the more reliable place for this logic to
REM live. Do not move it back into batch.
REM
REM Usage:
REM   install.bat            interactive (pauses so you can read the result)
REM   install.bat /nopause   non-interactive (CI); no pause, same messages
REM
REM Exit codes:
REM   0  success (installation usable; see summary for any manual actions)
REM   1  a required prerequisite is missing or a required step failed
REM   2  this script was not run in a supported way (wrong OS / wrong location / no PowerShell)
REM ============================================================================

setlocal EnableExtensions
title Security Platform Installer

set "NONINTERACTIVE=0"
if /i "%~1"=="/nopause" set "NONINTERACTIVE=1"
if /i "%CI%"=="true" set "NONINTERACTIVE=1"

if not "%OS%"=="Windows_NT" (
    echo [ERROR] This installer must be run on Windows. Detected OS=%OS%.
    set "LAUNCHER_EXIT_CODE=2"
    goto :launcher_finish
)

REM %~dp0 is the directory this .bat file lives in, expanded at parse time --
REM this works no matter what directory the user ran it from, and correctly
REM handles paths containing spaces because it is always used quoted below.
set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

if not exist "%SCRIPT_DIR%\package.json" (
    echo [ERROR] package.json was not found in %SCRIPT_DIR%.
    echo [ERROR] install.bat must be run from inside the cloned security-platform repository.
    set "LAUNCHER_EXIT_CODE=2"
    goto :launcher_finish
)

if not exist "%SCRIPT_DIR%\scripts\install.ps1" (
    echo [ERROR] scripts\install.ps1 was not found in %SCRIPT_DIR%.
    echo [ERROR] Your checkout may be incomplete -- re-clone the repository and try again.
    set "LAUNCHER_EXIT_CODE=2"
    goto :launcher_finish
)

where powershell >nul 2>&1
if errorlevel 1 (
    echo [ERROR] PowerShell was not found on PATH.
    echo [ERROR] This installer requires Windows PowerShell 5.1 or later, which ships with Windows 10/11.
    echo [ERROR] If it is installed but not on PATH, add it and re-run install.bat.
    set "LAUNCHER_EXIT_CODE=2"
    goto :launcher_finish
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%\scripts\install.ps1"
set "LAUNCHER_EXIT_CODE=%ERRORLEVEL%"

:launcher_finish
if "%NONINTERACTIVE%"=="0" (
    echo.
    echo Press any key to close this window...
    pause >nul
)
endlocal & exit /b %LAUNCHER_EXIT_CODE%
