/* QuakeSpots lightweight GIS runtime — canvas rendering, on-demand layers.
   Data: assets/data/*.json  Point: [lat, lon, mag, depth_km, date, stat] */
(function () {
  'use strict';

  var DATA = 'assets/data/';
  var PH = { lat: 12.5, lon: 122.0, zoom: 6 };

  /* key, label, group(haz|kde), dot color, stat label (null = none) */
  var LAYERS = [
    { key: 'cluster', label: 'Clustered Markers', group: 'haz', color: '#eab308', stat: null, on: true,
      desc: 'Full catalog, magnitude-colored, clustered' },
    { key: 'mag_45_46', label: 'Mag 4.5 – 4.6', group: 'haz', color: '#4575b4', stat: null },
    { key: 'mag_46_48', label: 'Mag 4.6 – 4.8', group: 'haz', color: '#74add1', stat: null },
    { key: 'mag_48_50', label: 'Mag 4.8 – 5.0', group: 'haz', color: '#fdae61', stat: null },
    { key: 'mag_gt50', label: 'Mag > 5.0', group: 'haz', color: '#d7191c', stat: null },
    { key: 'gi_hot99', label: "Gi*: Hot Spot 99%", group: 'haz', color: '#d7191c', stat: 'Gi* Z' },
    { key: 'gi_hot95', label: "Gi*: Hot Spot 95%", group: 'haz', color: '#f46d43', stat: 'Gi* Z' },
    { key: 'gi_hot90', label: "Gi*: Hot Spot 90%", group: 'haz', color: '#fdae61', stat: 'Gi* Z' },
    { key: 'gi_ns', label: "Gi*: Not Significant", group: 'haz', color: '#bdbdbd', stat: 'Gi* Z' },
    { key: 'gi_cold90', label: "Gi*: Cold Spot 90%", group: 'haz', color: '#abd9e9', stat: 'Gi* Z' },
    { key: 'gi_cold95', label: "Gi*: Cold Spot 95%", group: 'haz', color: '#74add1', stat: 'Gi* Z' },
    { key: 'gi_cold99', label: "Gi*: Cold Spot 99%", group: 'haz', color: '#2b83ba', stat: 'Gi* Z' },
    { key: 'moran_hh', label: "Moran's I: High-High", group: 'haz', color: '#d7191c', stat: "Moran's I" },
    { key: 'moran_ll', label: "Moran's I: Low-Low", group: 'haz', color: '#2b83ba', stat: "Moran's I" },
    { key: 'moran_hl', label: "Moran's I: High-Low", group: 'haz', color: '#ff8000', stat: "Moran's I" },
    { key: 'moran_lh', label: "Moran's I: Low-High", group: 'haz', color: '#abdda4', stat: "Moran's I" },
    { key: 'moran_ns', label: "Moran's I: N.S.", group: 'haz', color: '#bdbdbd', stat: "Moran's I" },
    { key: 'ehsa_intensifying', label: 'EHSA: Intensifying', group: 'haz', color: '#ff0000', stat: 'EHSA Z' },
    { key: 'ehsa_persistent', label: 'EHSA: Persistent', group: 'haz', color: '#ff8000', stat: 'EHSA Z' },
    { key: 'ehsa_sporadic', label: 'EHSA: Sporadic', group: 'haz', color: '#ffcc00', stat: 'EHSA Z' },
    { key: 'ehsa_cold', label: 'EHSA: Cold Spots', group: 'haz', color: '#0066ff', stat: 'EHSA Z' },
    { key: 'heat_freq', label: 'KDE Frequency', group: 'kde', color: '#22c55e', stat: null, heat: true },
    { key: 'heat_energy', label: 'KDE Energy', group: 'kde', color: '#f97316', stat: null, heat: true }
  ];
  var byKey = {};
  LAYERS.forEach(function (l) { byKey[l.key] = l; l.loaded = false; l.layer = null; });

  var map, cluster, cache = {}, manifest = null, tempMark = null;

  function $(id) { return document.getElementById(id); }
  function post(type, extra) {
    var m = { type: type };
    if (extra) for (var k in extra) m[k] = extra[k];
    try { window.parent.postMessage(m, '*'); } catch (e) {}
  }
  function setProgress(pct, txt) {
    $('loadFill').style.width = pct + '%';
    if (txt) $('loadTxt').textContent = txt;
    post('qs-progress', { pct: pct, txt: txt || '' });
  }
  function fmt(n) { return (n == null ? '–' : Number(n).toLocaleString('en-US')); }

  function magColor(m) {
    if (m == null) return '#ffff66';
    if (m < 5.0) return '#ffff66';
    if (m < 5.6) return '#ffa500';
    return '#ff4d4d';
  }
  function magRadius(m) {
    if (m == null) return 5;
    if (m < 5.0) return 5;
    if (m < 5.6) return 6.5;
    if (m < 6.5) return 8.5;
    return 11;
  }

  function dotPopup(cfg, p) {
    var h = '<b>' + cfg.label + '</b><br>Mag <b>' + p[2] + '</b> · ' + p[3] + ' km<br>' + p[4];
    if (cfg.stat && p[5] != null) h += '<br>' + cfg.stat + ': <b>' + p[5] + '</b>';
    return h;
  }

  /* ---------------- map ---------------- */
  function baseLayers() {
    return {
      dark: L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 18, attribution: 'Esri, HERE, Garmin, OpenStreetMap contributors' }),
      sat: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 18, attribution: 'Esri, Maxar, Earthstar Geographics' }),
      streets: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' })
    };
  }

  function init() {
    map = L.map('map', { center: [PH.lat, PH.lon], zoom: PH.zoom, preferCanvas: true, zoomControl: false });
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.control.scale({ position: 'bottomright' }).addTo(map);
    var bases = baseLayers();
    bases.dark.addTo(map);
    map._qsBases = bases;

    cluster = L.markerClusterGroup({
      chunkedLoading: true, chunkInterval: 60, chunkDelay: 20,
      maxClusterRadius: 55, disableClusteringAtZoom: 11, spiderfyOnMaxZoom: false
    });

    wireSidebar();
    setTimeout(function () { var h = $('hint'); if (h) h.style.opacity = '0'; }, 7000);

    fetch(DATA + 'manifest.json')
      .then(function (r) { if (!r.ok) throw new Error('manifest ' + r.status); return r.json(); })
      .then(function (man) {
        manifest = man;
        paintCounts();
        return loadLayer('cluster', true);
      })
      .then(function () {
        $('loader').style.display = 'none';
        setProgress(100, 'Ready');
        post('qs-ready', { layers: counts() });
      })
      .catch(function (err) {
        var msg = (location.protocol === 'file:')
          ? 'Browser blocks local files. Run via http://localhost/quakespots/ (XAMPP Apache) instead of double-clicking.'
          : 'Failed to load data: ' + err.message;
        console.error('[QuakeSpots]', err);
        $('loadTxt').textContent = msg;
        post('qs-progress', { pct: 100, txt: msg });
      });

    window.addEventListener('message', onParentMsg);
  }

  function counts() {
    var c = {};
    LAYERS.forEach(function (l) {
      var n = manifest && manifest.layers[l.key] ? manifest.layers[l.key].count
        : (manifest && manifest.heat[l.key] ? manifest.heat[l.key].count : null);
      c[l.key] = n;
    });
    return c;
  }

  /* ---------------- layers ---------------- */
  function fileFor(key) {
    var f = manifest.layers[key] ? manifest.layers[key].file
      : (manifest.heat[key] ? manifest.heat[key].file : key + '.json');
    return f.split('/').pop(); /* manifest stores 'data/x.json'; DATA prefix already applied */
  }

  function loadLayer(key, silent) {
    var cfg = byKey[key];
    if (cfg.loaded) { if (cfg.layer && !map.hasLayer(cfg.layer)) showLayer(key); return Promise.resolve(); }
    setChipSpin(key, true);
    return fetch(DATA + fileFor(key))
      .then(function (r) { if (!r.ok) throw new Error(key + ' ' + r.status); return r.json(); })
      .then(function (json) { return buildLayer(cfg, json.pts, key === 'cluster'); })
      .then(function () {
        cfg.loaded = true;
        setChipSpin(key, false);
        markRow(key, true);
        post('qs-layer', { key: key, on: true });
      })
      .catch(function (err) {
        setChipSpin(key, false);
        if (!silent) alert('Could not load layer "' + cfg.label + '": ' + err.message);
        throw err;
      });
  }

  function buildLayer(cfg, pts, isCluster) {
    return new Promise(function (resolve) {
      if (cfg.heat) {
        var data = pts.map(function (p) { return p.length > 2 ? [p[0], p[1], p[2] / 7] : [p[0], p[1]]; });
        cfg.layer = L.heatLayer(data, {
          radius: 15, blur: 12, minOpacity: 0.35, maxZoom: 10,
          gradient: cfg.key === 'heat_freq'
            ? { 0.2: 'blue', 0.55: 'lime', 1: 'red' }
            : { 0.2: 'lightblue', 0.55: 'orange', 1: 'darkred' }
        });
        cache[cfg.key] = cfg.layer.addTo(map);
        resolve();
        return;
      }
      var i = 0, CH = 4000, group = isCluster ? null : L.layerGroup();
      var bulk = [];
      function step() {
        var end = Math.min(i + CH, pts.length);
        for (; i < end; i++) {
          var p = pts[i];
          var mk = L.circleMarker([p[0], p[1]], isCluster
            ? { radius: magRadius(p[2]), color: magColor(p[2]), weight: 0.6, opacity: 1, fillOpacity: 0.75, fillColor: magColor(p[2]) }
            : { radius: 3, color: cfg.color, weight: 0.4, opacity: 1, fillOpacity: 0.8, fillColor: cfg.color });
          mk.bindPopup(dotPopup(cfg, p));
          if (isCluster) bulk.push(mk); else group.addLayer(mk);
        }
        if (cfg.key === 'cluster') setProgress(10 + Math.round(80 * (i / pts.length)), 'Rendering markers ' + fmt(i) + ' / ' + fmt(pts.length));
        if (i < pts.length) { setTimeout(step, 0); }
        else {
          if (isCluster) { cluster.addLayers(bulk); cfg.layer = cluster; }
          else cfg.layer = group;
          cache[cfg.key] = cfg.layer.addTo(map);
          resolve();
        }
      }
      step();
    });
  }

  function showLayer(key) { var c = byKey[key]; if (c.layer && !map.hasLayer(c.layer)) { c.layer.addTo(map); markRow(key, true); } }
  function hideLayer(key) { var c = byKey[key]; if (c.layer && map.hasLayer(c.layer)) { map.removeLayer(c.layer); markRow(key, false); } }
  function toggleLayer(key) {
    var c = byKey[key];
    if (c.layer && map.hasLayer(c.layer)) { hideLayer(key); post('qs-layer', { key: key, on: false }); }
    else if (c.loaded) { showLayer(key); post('qs-layer', { key: key, on: true }); }
    else loadLayer(key, false);
  }

  /* ---------------- sidebar ---------------- */
  function el(tag, cls, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  }
  function paintCounts() {
    LAYERS.forEach(function (l) {
      var s = document.querySelector('[data-cnt="' + l.key + '"]');
      if (s) {
        var n = manifest.layers[l.key] ? manifest.layers[l.key].count : manifest.heat[l.key].count;
        s.textContent = fmt(n);
      }
    });
  }
  function markRow(key, on) {
    var r = document.querySelector('[data-layer="' + key + '"]');
    if (r) r.classList.toggle('on', !!on);
  }
  function setChipSpin(key, spinning) {
    var r = document.querySelector('[data-layer="' + key + '"] .st');
    if (!r) return;
    r.innerHTML = spinning ? '<span class="spin"></span>' : '';
  }

  function wireSidebar() {
    var hz = $('acc-haz'), kd = $('acc-kde');
    LAYERS.forEach(function (l) {
      if (l.key === 'cluster') {
        var top = el('div', 'row on', '<span class="swatch" style="background:' + l.color + '"></span> <span class="grow">' + l.label + '</span> <span class="cnt" data-cnt="' + l.key + '">…</span> <span class="st"></span>');
        top.setAttribute('data-layer', l.key);
        top.title = l.desc;
        top.onclick = function () { toggleLayer(l.key); };
        hz.parentNode.insertBefore(top, hz);
        return;
      }
      var row = el('div', 'row' + (l.on ? ' on' : ''), '<span class="swatch' + (l.heat ? ' sq' : '') + '" style="background:' + l.color + '"></span> <span class="grow">' + l.label + '</span> <span class="cnt" data-cnt="' + l.key + '">…</span> <span class="st"></span>');
      row.setAttribute('data-layer', l.key);
      row.title = 'Click to toggle (loads on first use)';
      row.onclick = function () { toggleLayer(l.key); };
      (l.group === 'kde' ? kd : hz).appendChild(row);
    });

    document.querySelectorAll('[data-acc]').forEach(function (h) {
      h.onclick = function () { $('acc-' + h.getAttribute('data-acc')).classList.toggle('open'); };
    });
    document.querySelectorAll('[data-base]').forEach(function (r) {
      r.onclick = function () {
        var b = r.getAttribute('data-base');
        Object.keys(map._qsBases).forEach(function (k) { if (map.hasLayer(map._qsBases[k])) map.removeLayer(map._qsBases[k]); });
        map._qsBases[b].addTo(map);
        document.querySelectorAll('[data-base] .radio').forEach(function (x) { x.checked = false; });
        r.querySelector('.radio').checked = true;
      };
    });
    $('uncheck').onclick = function () {
      LAYERS.forEach(function (l) { if (l.layer && map.hasLayer(l.layer)) { map.removeLayer(l.layer); markRow(l.key, false); } });
      post('qs-cleared', {});
    };
    $('btnLocate').onclick = function () {
      if (!navigator.geolocation) return alert('Geolocation not supported on this device.');
      map.locate({ setView: true, maxZoom: 10 });
    };
    $('btnReset').onclick = function () { map.flyTo([PH.lat, PH.lon], PH.zoom, { duration: 1.2 }); };
    $('linkMethod').onclick = function (e) {
      e.preventDefault();
      if (window.parent !== window) post('qs-methodology', {});
      else window.location.href = 'index.html#methodology';
    };
    var side = $('side'), menu = $('menuBtn');
    function syncMenu() {
      var hidden = side.classList.contains('hidden');
      menu.classList.toggle('show', hidden);
      $('legend').classList.toggle('full', hidden);
    }
    menu.onclick = function () { side.classList.remove('hidden'); syncMenu(); };
    if (window.innerWidth < 768) { side.classList.add('hidden'); }
    syncMenu();
    // hamburger inside map for collapsing
    map.on('click', function () { if (window.innerWidth < 768) { side.classList.add('hidden'); syncMenu(); } });
  }

  /* ---------------- parent bridge ---------------- */
  function onParentMsg(ev) {
    var d = ev.data || {};
    if (d.type === 'qs-flyTo') flyTo(d.lat, d.lon, d.zoom || 9, d.label || '');
    if (d.type === 'qs-locate') $('btnLocate').click();
    if (d.type === 'qs-reset') $('btnReset').click();
  }
  function flyTo(lat, lon, zoom, label) {
    if (typeof lat !== 'number' || typeof lon !== 'number') return;
    map.flyTo([lat, lon], zoom, { duration: 1.6 });
    if (tempMark) { map.removeLayer(tempMark); tempMark = null; }
    tempMark = L.circleMarker([lat, lon], { radius: 10, color: '#CFAC6E', weight: 3, fillOpacity: 0 }).addTo(map);
    if (label) tempMark.bindPopup('<b>' + label + '</b>').openPopup();
    setTimeout(function () { if (tempMark) { map.removeLayer(tempMark); tempMark = null; } }, 9000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
