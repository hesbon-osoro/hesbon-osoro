@echo off
echo ========================================
echo Portfolio Repository Manager
echo ========================================
echo.
echo Options:
echo 1. Clone missing repos only
echo 2. Clone missing + Update existing repos
echo 3. Dry run (preview only)
echo 4. Exit
echo.

set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" goto clone_only
if "%choice%"=="2" goto clone_and_update
if "%choice%"=="3" goto dry_run
if "%choice%"=="4" goto end
echo Invalid choice!
pause
exit /b 1

:clone_only
echo.
echo ========================================
echo Cloning missing repositories...
echo ========================================
echo.
node "%~dp0manage-portfolio-repos.js"
goto finish

:clone_and_update
echo.
echo ========================================
echo Cloning missing and updating existing...
echo ========================================
echo.
node -e "const Manager = require('%~dp0manage-portfolio-repos.js'); const cfg = {readmePath: require('path').join(__dirname, 'README.md'), projectsBaseDir: 'd:\\Projects', dryRun: false, updateExisting: true, skipErrors: true, username: 'hesbon-osoro'}; new Manager(cfg).run()"
goto finish

:dry_run
echo.
echo ========================================
echo DRY RUN MODE - Preview only
echo ========================================
echo.
node -e "const Manager = require('%~dp0manage-portfolio-repos.js'); const cfg = {readmePath: require('path').join(__dirname, 'README.md'), projectsBaseDir: 'd:\\Projects', dryRun: true, updateExisting: false, skipErrors: true, username: 'hesbon-osoro'}; new Manager(cfg).run()"
goto finish

:finish
echo.
echo ========================================
echo Process completed!
echo ========================================
echo.
pause
goto end

:end
exit /b 0
