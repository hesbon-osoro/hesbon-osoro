@echo off
echo ========================================
echo Portfolio Repository Cloner
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if Git is installed
where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Git is not installed or not in PATH
    echo Please install Git from https://git-scm.com/
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.
echo Git version:
git --version
echo.
echo ========================================
echo Starting repository cloning...
echo ========================================
echo.

REM Run the clone script
node "%~dp0clone-portfolio-repos.js"

echo.
echo ========================================
echo Process completed!
echo ========================================
echo.
pause
