# QuakeSpots GIS Spatial Analysis Portal

**Academic Field:** Geospatial Information Systems (GIS) & Spatial Econometrics  
**Repository:** [https://github.com/AlwinsonTGM/QuakeSpots.git](https://github.com/AlwinsonTGM/QuakeSpots.git)  

---

## 📌 Executive Summary

**QuakeSpots GIS Portal** is a high-performance big-data geospatial intelligence platform mapping and analyzing **68,545 historical earthquake events** across the Philippine archipelago.

It provides an interactive cartographic interface paired with academic spatial econometric modeling:
1. **Interactive Spatial Map:** Leaflet/Folium map with Esri Dark Gray Canvas basemaps, custom layer controllers, cluster markers, and dual KDE heatmaps.
2. **Telemetry Intelligence Ribbon:** Real-time summary displaying 68,545 total events, 7.8 max magnitude (Richter), 4.83 average magnitude, and 63.9 km mean focal depth.
3. **Spatial Statistics & Defense White Paper ("Paano Ginawa"):**
   - **Getis-Ord $G_i^*$ Spatial Statistics:** Hot spot ($z > +2.58$, 99% confidence) and cold spot ($z < -2.58$) detection.
   - **Anselin Local Moran's I (LISA):** High-High (HH), Low-Low (LL), High-Low (HL), and Low-High (LH) spatial autocorrelation analysis.
   - **Emerging Hot Spot Analysis (EHSA):** Space-time cube evaluating temporal persistence (intensifying, persistent, sporadic).
   - **Dual Kernel Density Estimation (KDE):** Spatial occurrence frequency vs moment magnitude ($M_w$) energy release.
   - **Python Scientific Pipeline:** SciPy KD-Tree spatial neighbor indexing and algorithmic formulation.

---

## 🗂️ Project Structure

```
quakespots/
├── index.html                  # Portal shell (Home entry, GIS view, Methodology)
├── map.html                    # Lightweight canvas GIS map (lazy layers, sidebar)
├── quakespots3.legacy.html     # Original 80MB Folium export (local reference only)
├── assets/
│   ├── css/
│   │   └── executive-theme.css # Stately executive editorial design system
│   ├── js/
│   │   ├── app.js              # Router, homepage search, map bridge, fullscreen
│   │   └── map.js              # Canvas map runtime (cluster, basemaps, postMessage)
│   └── data/
│       ├── manifest.json       # Layer counts + file index
│       └── *.json              # 23 chunked layers (3.2MB total, loaded on demand)
├── deploy.bat                  # 1-Click GitHub Pages deployment script
├── DEPLOY_GITHUB_PAGES.md      # Step-by-step GitHub deployment guide
├── .gitignore                  # Git ignore rules
└── README.md                   # Academic project documentation
```

---

## 🚀 Running Locally & Publishing

### Local Preview via XAMPP Apache
Ensure Apache is running in the XAMPP Control Panel, then open:
```text
http://localhost/quakespots/
```
> The map loads its data via `fetch`, so it must run over HTTP (XAMPP Apache).
> Double-clicking `index.html` directly will show a data-loading error.

### GitHub Pages Deployment
Run `deploy.bat` or push manually:
```bash
git add index.html quakespots3.html assets README.md deploy.bat DEPLOY_GITHUB_PAGES.md .gitignore
git commit -m "Deploy: QuakeSpots GIS Spatial Analysis Portal"
git push -u origin main
```
The application will be live at:
```text
https://alwinsontgm.github.io/QuakeSpots/
```

---

## 🎓 Academic Defense Notes

- **Philippine Seismic Setting:** The archipelago is bounded by active subduction zones (Philippine Trench to the east; Manila, Negros, and Cotabato Trenches to the west) and bisected by the 1,200 km left-lateral Philippine Fault Zone (PFZ).
- **Mathematical Integrity:** All spatial formulas and z-score thresholds are documented in the **Defense Methodology** tab of the portal.
