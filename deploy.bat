@echo off
echo ================================================================
echo  DEPLOY QUAKESPOTS GIS SPATIAL ANALYSIS PORTAL TO GITHUB PAGES
echo ================================================================
echo.

cd /d "%~dp0"

echo [1/4] Checking Git repository status...
if not exist ".git" (
    echo Initializing Git repository...
    git init
    git branch -M main
    git remote add origin https://github.com/AlwinsonTGM/QuakeSpots.git
)

echo [2/4] Staging project files (homepage + fast map + chunked data)...
git add index.html map.html assets README.md deploy.bat DEPLOY_GITHUB_PAGES.md .gitignore
git rm --cached -q quakespots3.html 2>nul
git rm --cached -q quakespots3.legacy.html 2>nul

echo [3/4] Creating deployment commit...
git commit -m "Deploy: QuakeSpots GIS Spatial Analysis Portal"

echo [4/4] Pushing to GitHub (origin main)...
git push -u origin main

echo.
echo ================================================================
echo  DEPLOYMENT COMPLETE!
echo  Next Steps:
echo  1. Go to: https://github.com/AlwinsonTGM/QuakeSpots/settings/pages
echo  2. Under 'Source', select 'Deploy from a branch'
echo  3. Choose branch 'main' / folder '/ (root)' and click Save.
echo  Your site will be live at:
echo  https://alwinsontgm.github.io/QuakeSpots/
echo ================================================================
pause
