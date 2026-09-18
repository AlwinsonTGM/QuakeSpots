/**
 * QuakeSpots GIS Spatial Analysis Portal - Core Application Engine
 * Architected for: Philippine Seismic Intelligence & Academic Defense
 * Author: Alwinson Bustamante
 */

document.addEventListener('DOMContentLoaded', () => {
  initViewSwitcher();
  initMapLoader();
  initShareAction();
  handleInitialHash();
});

// View Switching Engine
function initViewSwitcher() {
  const tabButtons = document.querySelectorAll('.nav-pill-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.getAttribute('data-view');
      switchView(targetView);
    });
  });
}

function switchView(viewName) {
  // Update Tab buttons
  document.querySelectorAll('.nav-pill-btn').forEach(btn => {
    const isTarget = btn.getAttribute('data-view') === viewName;
    btn.classList.toggle('active', isTarget);
  });

  // Update Sections
  document.querySelectorAll('.view-section').forEach(section => {
    section.classList.remove('active');
  });

  const targetSection = document.getElementById(`view-${viewName}`);
  if (targetSection) {
    targetSection.classList.add('active');
  }

  // Update URL Hash without page jump
  if (history.replaceState) {
    history.replaceState(null, null, `#${viewName}`);
  }

  // If entering GIS view, ensure map is loaded
  if (viewName === 'gis') {
    lazyLoadGISMap();
  }
}

// Lazy Load Map Iframe
let mapLoaded = false;
function initMapLoader() {
  // Check if starting on GIS view (default)
  const hash = window.location.hash.replace('#', '');
  if (!hash || hash === 'gis') {
    lazyLoadGISMap();
  }
}

function lazyLoadGISMap() {
  if (mapLoaded) return;
  const iframe = document.getElementById('gisMapIframe');
  const loader = document.getElementById('gisLoader');
  
  if (iframe) {
    iframe.src = 'quakespots3.html';
    iframe.onload = () => {
      if (loader) loader.style.display = 'none';
      iframe.style.opacity = '1';
      mapLoaded = true;
    };
  }
}

// Fullscreen Controller
function toggleMapFullscreen() {
  const container = document.getElementById('gisMapContainer');
  if (!container) return;

  if (!document.fullscreenElement) {
    if (container.requestFullscreen) {
      container.requestFullscreen();
    } else if (container.webkitRequestFullscreen) {
      container.webkitRequestFullscreen();
    } else if (container.msRequestFullscreen) {
      container.msRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
}

// Share Link Notification
function initShareAction() {
  const shareBtn = document.getElementById('btnShareLink');
  if (!shareBtn) return;

  shareBtn.addEventListener('click', () => {
    const currentUrl = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl).then(() => {
        showToast('QuakeSpots GIS Portal link copied to clipboard!');
      }).catch(() => {
        showToast('Link ready: ' + currentUrl);
      });
    } else {
      showToast('Link ready: ' + currentUrl);
    }
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
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

// Initial Hash Router
function handleInitialHash() {
  const hash = window.location.hash.replace('#', '');
  if (hash === 'methodology') {
    switchView('methodology');
  } else {
    switchView('gis');
  }
}

// Window Exports
window.switchView = switchView;
window.toggleMapFullscreen = toggleMapFullscreen;
window.showToast = showToast;
