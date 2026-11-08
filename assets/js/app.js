/**
 * QuakeSpots GIS Spatial Analysis Portal - Core Application Engine
 * Views: home (HazardHunter-style entry) -> gis (lazy canvas map) -> methodology
 */

document.addEventListener('DOMContentLoaded', () => {
  initViewSwitcher();
  initHome();
  initShareAction();
  initMapBridge();
  handleInitialHash();
  initMathRendering();
});

window.addEventListener('load', () => {
  initMathRendering();
});

/* ================= View Switching Engine ================= */
function initViewSwitcher() {
  document.querySelectorAll('.nav-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.getAttribute('data-view')));
  });
  const homeMethod = document.getElementById('linkHomeMethod');
  if (homeMethod) {
    homeMethod.addEventListener('click', (e) => { e.preventDefault(); switchView('methodology'); });
  }
}

function switchView(viewName) {
  if (viewName !== 'home' && viewName !== 'gis' && viewName !== 'methodology') viewName = 'home';
  document.querySelectorAll('.nav-pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
  });
  document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`view-${viewName}`);
  if (target) target.classList.add('active');
  if (history.replaceState) history.replaceState(null, null, `#${viewName}`);
  if (viewName === 'gis') lazyLoadGISMap();
  if (viewName === 'methodology') initMathRendering();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ================= Lazy Map Iframe ================= */
let mapLoaded = false;
let mapReady = false;
let pendingFlyTo = null;

function lazyLoadGISMap() {
  const iframe = document.getElementById('gisMapIframe');
  if (!iframe || iframe.src) return;
  iframe.src = 'map.html';
  iframe.onload = () => { mapLoaded = true; };
  // Safety: never trap the user behind a loader — reveal after 25s regardless
  setTimeout(() => {
    const loader = document.getElementById('gisLoader');
    if (loader && loader.style.display !== 'none' && !mapReady) {
      loader.style.display = 'none';
      iframe.style.opacity = '1';
    }
  }, 25000);
}

function sendToMap(msg) {
  const iframe = document.getElementById('gisMapIframe');
  if (iframe && iframe.contentWindow) iframe.contentWindow.postMessage(msg, '*');
}

function flyToOnMap(lat, lon, zoom, label) {
  pendingFlyTo = { type: 'qs-flyTo', lat, lon, zoom: zoom || 9, label: label || '' };
  if (mapReady) { sendToMap(pendingFlyTo); pendingFlyTo = null; }
}

function initMapBridge() {
  window.addEventListener('message', (ev) => {
    const d = ev.data || {};
    if (d.type === 'qs-ready') {
      mapReady = true;
      const loader = document.getElementById('gisLoader');
      const iframe = document.getElementById('gisMapIframe');
      if (loader) loader.style.display = 'none';
      if (iframe) iframe.style.opacity = '1';
      if (pendingFlyTo) { sendToMap(pendingFlyTo); pendingFlyTo = null; }
      showToast('Map ready — toggle science layers in the left panel.');
    }
    if (d.type === 'qs-progress') {
      const detail = document.getElementById('gisLoadDetail');
      if (detail && d.txt) detail.textContent = d.txt;
    }
    if (d.type === 'qs-methodology') switchView('methodology');
  });
}

/* ================= Homepage: search / locate / coords ================= */
function initHome() {
  const go = document.getElementById('btnGoMap');
  if (go) go.addEventListener('click', () => switchView('gis'));

  const loc = document.getElementById('btnHomeLocate');
  if (loc) loc.addEventListener('click', () => {
    if (!navigator.geolocation) { showToast('Geolocation not supported on this device.'); return; }
    showToast('Locating… allow GPS access when asked.');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        switchView('gis');
        lazyLoadGISMap();
        flyToOnMap(pos.coords.latitude, pos.coords.longitude, 10, 'Your location');
      },
      () => showToast('Could not get your location. Check browser permission.'),
      { timeout: 12000 }
    );
  });

  const coordsBtn = document.getElementById('btnHomeCoords');
  const panel = document.getElementById('homeCoordsPanel');
  if (coordsBtn && panel) {
    coordsBtn.addEventListener('click', () => {
      panel.hidden = !panel.hidden;
      if (!panel.hidden) document.getElementById('coordLat').focus();
    });
  }
  const dmsBtn = document.getElementById('btnDmsToggle');
  if (dmsBtn) {
    dmsBtn.addEventListener('click', () => {
      const lat = document.getElementById('coordLat');
      showToast('DMS accepted too — e.g. 14 35 58 N, 120 59 03 E');
      lat.focus();
    });
  }
  const coordGo = document.getElementById('btnCoordGo');
  if (coordGo) {
    coordGo.addEventListener('click', () => {
      const err = document.getElementById('coordErr');
      const lat = parseCoord(document.getElementById('coordLat').value.trim(), 'lat');
      const lon = parseCoord(document.getElementById('coordLon').value.trim(), 'lon');
      if (lat == null || lon == null) {
        err.hidden = false;
        err.textContent = 'Invalid coordinates. Use decimals (14.5995, 120.9842) or DMS (14 35 58 N). Range: 4–22°N, 116–128°E.';
        return;
      }
      err.hidden = true;
      switchView('gis');
      lazyLoadGISMap();
      flyToOnMap(lat, lon, 10, `${lat.toFixed(4)}, ${lon.toFixed(4)}`);
    });
  }

  const input = document.getElementById('homeSearchInput');
  const btn = document.getElementById('homeSearchBtn');
  const results = document.getElementById('homeSearchResults');
  if (!input || !btn) return;
  let timer = null;
  btn.addEventListener('click', () => runSearch(input.value.trim(), true));
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 3) { results.innerHTML = ''; results.classList.remove('open'); return; }
    timer = setTimeout(() => runSearch(q, false), 450);
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') runSearch(input.value.trim(), true); });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.home-search-wrap')) { results.classList.remove('open'); }
  });

  function runSearch(q, flyFirst) {
    if (!q) return;
    results.innerHTML = '<div class="home-search-item muted">Searching…</div>';
    results.classList.add('open');
    // Bounded to the Philippines; 1 req per keystroke burst (debounced)
    fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=ph&viewbox=116,22,128,4&bounded=0&q=${encodeURIComponent(q)}`, {
      headers: { 'Accept': 'application/json' }
    })
      .then(r => { if (!r.ok) throw new Error('search ' + r.status); return r.json(); })
      .then(list => {
        if (!list.length) {
          results.innerHTML = '<div class="home-search-item muted">No results in the Philippines — try coordinates instead.</div>';
          return;
        }
        results.innerHTML = '';
        list.forEach((p, i) => {
          const item = document.createElement('div');
          item.className = 'home-search-item';
          item.textContent = p.display_name.split(',').slice(0, 3).join(',');
          item.addEventListener('click', () => {
            results.classList.remove('open');
            switchView('gis');
            lazyLoadGISMap();
            flyToOnMap(parseFloat(p.lat), parseFloat(p.lon), 10, p.display_name.split(',')[0]);
          });
          results.appendChild(item);
          if (flyFirst && i === 0) item.click();
        });
      })
      .catch(() => {
        results.innerHTML = '<div class="home-search-item muted">Search unavailable — use coordinates or go to the map.</div>';
      });
  }
}

/* Accept "14.5995" or "14 35 58 N" / "14°35'58\"N" */
function parseCoord(raw, kind) {
  if (!raw) return null;
  const dec = Number(raw);
  if (Number.isFinite(dec)) return inRange(dec, kind) ? dec : null;
  const m = raw.toUpperCase().replace(/[°'"]/g, ' ').replace(/,/g, ' ').trim().split(/\s+/);
  if (m.length < 3) return null;
  const d = Number(m[0]), mi = Number(m[1]), s = Number(m[2]);
  if (![d, mi, s].every(Number.isFinite)) return null;
  let v = Math.abs(d) + mi / 60 + s / 3600;
  const hemi = m[3] || '';
  if (d < 0 || hemi === 'S' || hemi === 'W') v = -v;
  return inRange(v, kind) ? v : null;
}
function inRange(v, kind) {
  return kind === 'lat' ? (v >= -90 && v <= 90) : (v >= -180 && v <= 180);
}

/* ================= Fullscreen / Share / Hash ================= */
function toggleMapFullscreen() {
  const container = document.getElementById('gisMapContainer');
  if (!container) return;
  if (!document.fullscreenElement) {
    if (container.requestFullscreen) container.requestFullscreen();
    else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (container.webkitExitFullscreen) document.webkitExitFullscreen();
  }
}

function initShareAction() {
  const shareBtn = document.getElementById('btnShareLink');
  if (!shareBtn) return;
  shareBtn.addEventListener('click', () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url)
        .then(() => showToast('QuakeSpots GIS Portal link copied to clipboard!'))
        .catch(() => showToast('Link ready: ' + url));
    } else showToast('Link ready: ' + url);
  });
}

function showToast(msg) {
  let toast = document.getElementById('toastMsg');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastMsg';
    toast.className = 'toast-notification';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 3500);
}

function handleInitialHash() {
  const hash = window.location.hash.replace('#', '');
  if (hash === 'gis' || hash === 'methodology') switchView(hash);
  else switchView('home');
}

/* ================= KaTeX Academic Formula Renderer ================= */
function initMathRendering() {
  if (typeof renderMathInElement === 'function') {
    try {
      renderMathInElement(document.body, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false }
        ],
        ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
        throwOnError: false
      });
    } catch (err) {
      console.warn('KaTeX math rendering notice:', err);
    }
  }
}

window.switchView = switchView;
window.toggleMapFullscreen = toggleMapFullscreen;
window.showToast = showToast;
window.initMathRendering = initMathRendering;
