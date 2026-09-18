# QuakeSpots GIS Portal - Deployment Guide

This guide provides instructions for **Alwinson Bustamante** to publish the standalone **QuakeSpots GIS Portal** to GitHub Pages.

**Repository:** [https://github.com/AlwinsonTGM/QuakeSpots.git](https://github.com/AlwinsonTGM/QuakeSpots.git)

---

## ⚡ Option 1: 1-Click Deployment (Recommended)

Simply double-click the **`deploy.bat`** file located inside `c:\xampp\htdocs\quakespots\`.

It will automatically:
1. Initialize the local Git repository and attach the origin remote.
2. Stage all files (including the 83.5MB `quakespots3.html` interactive Leaflet map).
3. Commit and push directly to `main`.

---

## 💻 Option 2: Command Line (PowerShell / Git Bash)

Open terminal inside `c:\xampp\htdocs\quakespots\` and execute:

```bash
# 1. Initialize Git & rename branch
git init
git branch -M main

# 2. Add remote repository
git remote add origin https://github.com/AlwinsonTGM/QuakeSpots.git

# 3. Stage and commit files
git add index.html quakespots3.html assets README.md deploy.bat DEPLOY_GITHUB_PAGES.md .gitignore
git commit -m "Deploy: QuakeSpots GIS Spatial Analysis Portal"

# 4. Push to GitHub
git push -u origin main
```

*(Note: `quakespots3.html` is ~83.5MB, safely within GitHub's 100MB per-file upload limit).*

---

## 🌐 Enabling GitHub Pages

1. Navigate to: [https://github.com/AlwinsonTGM/QuakeSpots/settings/pages](https://github.com/AlwinsonTGM/QuakeSpots/settings/pages)
2. Under **Build and deployment**:
   - **Source**: Select `Deploy from a branch`
   - **Branch**: Select `main` and folder `/(root)`
   - Click **Save**
3. In approximately 1 to 2 minutes, your portal will be live at:
   ```text
   https://alwinsontgm.github.io/QuakeSpots/
   ```
