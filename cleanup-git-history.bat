@echo off
REM Git History Cleanup Script for Exposed Firebase API Key (Windows)
REM This script removes firebase-config.js from all git history

echo.
echo ================================================================
echo Git History Cleanup - Exposed API Key Removal (Windows)
echo ================================================================
echo.
echo WARNING: This will rewrite git history!
echo WARNING: All team members will need to re-clone the repository.
echo.
echo Before proceeding, ensure:
echo   1. You have regenerated the API key in Google Cloud Console
echo   2. You have a backup of this repository
echo   3. All team members are aware of this cleanup
echo.
set /p confirm="Have you completed the above steps? (yes/no): "
if /i not "%confirm%"=="yes" (
    echo Aborting. Please complete the prerequisites first.
    exit /b 1
)

echo.
echo ================================================================
echo STEP 1: Check current git status
echo ================================================================
git status --short

echo.
echo ================================================================
echo STEP 2: Create a backup
echo ================================================================
set backup_dir=..\stadlandrivier-backup-%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%%time:~6,2%
set backup_dir=%backup_dir: =0%
echo Creating backup at: %backup_dir%
xcopy /E /I /H /Y . "%backup_dir%"
echo Backup created successfully!

echo.
echo ================================================================
echo STEP 3: Install git-filter-repo (if needed)
echo ================================================================
where git-filter-repo >nul 2>nul
if errorlevel 1 (
    echo git-filter-repo not found. Installing via pip...
    pip install git-filter-repo
    if errorlevel 1 (
        echo.
        echo ERROR: Failed to install git-filter-repo
        echo Please install it manually:
        echo   pip install git-filter-repo
        echo Or download from: https://github.com/newren/git-filter-repo
        exit /b 1
    )
) else (
    echo git-filter-repo is already installed
)

echo.
echo ================================================================
echo STEP 4: Remove firebase-config.js from git history
echo ================================================================
echo Running git-filter-repo...
echo This may take a few minutes...
git-filter-repo --path firebase-config.js --invert-paths --force

if errorlevel 1 (
    echo.
    echo ERROR: git-filter-repo failed
    echo Please check the error message above
    exit /b 1
)

echo File removed from git history successfully!

echo.
echo ================================================================
echo STEP 5: Verify removal
echo ================================================================
git log --all --oneline -- firebase-config.js >nul 2>nul
if not errorlevel 1 (
    echo WARNING: firebase-config.js still found in history!
    echo Manual cleanup may be required.
    exit /b 1
) else (
    echo Verified: firebase-config.js removed from all history
)

echo.
echo ================================================================
echo STEP 6: Recreate your local firebase-config.js
echo ================================================================
if not exist firebase-config.js (
    if exist firebase-config.template.js (
        copy firebase-config.template.js firebase-config.js
        echo Created firebase-config.js from template
        echo.
        echo IMPORTANT: Edit firebase-config.js and add your NEW API key!
        echo.
    ) else (
        echo WARNING: firebase-config.template.js not found
        echo Please create firebase-config.js manually
    )
) else (
    echo firebase-config.js already exists
)

echo.
echo ================================================================
echo STEP 7: Re-add remote and prepare to push
echo ================================================================
echo Re-adding remote origin...
git remote add origin https://github.com/jwbeekhuis/stadlandrivier.git 2>nul

echo.
echo ================================================================
echo READY TO PUSH
echo ================================================================
echo.
echo CRITICAL: The next step will FORCE PUSH to all branches!
echo CRITICAL: All team members will need to re-clone the repository.
echo.
set /p push_confirm="Proceed with force push to GitHub? (yes/no): "
if /i not "%push_confirm%"=="yes" (
    echo.
    echo Skipping push. You can push manually later with:
    echo   git push origin --force --all
    echo   git push origin --force --tags
    echo.
    goto :complete
)

echo.
echo Pushing to remote...
git push origin --force --all
if errorlevel 1 (
    echo.
    echo WARNING: Failed to push branches
    echo You may need to authenticate or check your remote URL
)

git push origin --force --tags 2>nul

:complete
echo.
echo ================================================================
echo CLEANUP COMPLETE!
echo ================================================================
echo.
echo Next steps:
echo   1. Verify on GitHub that firebase-config.js is removed from history
echo   2. Check: https://github.com/jwbeekhuis/stadlandrivier/commits/main
echo   3. Search for the old key to ensure it's gone
echo   4. Inform all team members to re-clone the repository
echo   5. Monitor Google Cloud billing for any unusual activity
echo.
echo Backup location: %backup_dir%
echo.
echo Team member instructions:
echo   1. Delete their local StadLandRivier folder
echo   2. git clone https://github.com/jwbeekhuis/stadlandrivier.git
echo   3. cd stadlandrivier
echo   4. copy firebase-config.template.js firebase-config.js
echo   5. Edit firebase-config.js with the new API key
echo.
pause
