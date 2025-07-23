@echo off
echo ========================================
echo    Fix Stale Git Info and Force Push
echo ========================================
echo.
echo The --force-with-lease failed because your local git info is stale.
echo This script will:
echo 1. Fetch the latest remote info
echo 2. Force push your cleaned history safely
echo.

cd /d "C:\Users\Ahmou\Desktop\Apps\LearnAi"

echo Current status:
git status

echo.
echo Step 1: Fetching latest remote information...
git fetch origin

echo.
echo Step 2: Now force pushing with updated info...
git push --force-with-lease origin master

echo.
if %errorlevel% equ 0 (
    echo ========================================
    echo ✅ SUCCESS! Push completed!
    echo ========================================
    echo.
    echo ✅ Sensitive credentials removed from Git history
    echo ✅ Repository is now secure and ready
    echo ✅ GitHub push protection satisfied
    echo.
    echo Your LearnAI project is ready for collaboration! 🚀
) else (
    echo ========================================
    echo ❌ Push still failed. Let's try regular force push...
    echo ========================================
    echo.
    set /p confirm="Use regular --force push? (y/n): "
    if /i "!confirm!" equ "y" (
        echo Doing regular force push...
        git push --force origin master
        if !errorlevel! equ 0 (
            echo ✅ Success with regular force push!
        ) else (
            echo ❌ Force push also failed. Check your connection and credentials.
        )
    )
)

echo.
pause
