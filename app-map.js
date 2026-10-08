'use strict';
/* Munch Express — Leaflet map picker for delivery location. */

var _map = null;
var _marker = null;
var _mapResolve = null;

function openMapPicker(currentLat, currentLng) {
  return new Promise(function (resolve) {
    _mapResolve = resolve;

    var ov = document.getElementById('map-overlay');
    if (!ov) { resolve(null); return; }
    ov.classList.add('open');
    document.body.style.overflow = 'hidden';

    /* Default center: Ijebu Ode */
    var lat = Number(currentLat) || 6.8203;
    var lng = Number(currentLng) || 3.9567;

    setTimeout(function () {
      initLeafletMap(lat, lng);
    }, 60);
  });
}

function initLeafletMap(lat, lng) {
  if (typeof L === 'undefined') {
    console.error('[Munch] Leaflet not loaded');
    toast('Map not available. Please check your connection.');
    cancelMapPicker();
    return;
  }

  var canvas = document.getElementById('map-picker-canvas');
  if (!canvas) return;

  /* Clean up any previous instance */
  try { if (_map) { _map.remove(); _map = null; _marker = null; } } catch (e) {}

  _map = L.map(canvas, {
    center: [lat, lng],
    zoom: 16,
    zoomControl: true
  });

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(_map);

  _marker = L.marker([lat, lng], { draggable: true }).addTo(_map);

  /* Leaflet sometimes needs a nudge after the container becomes visible */
  setTimeout(function () {
    if (_map) _map.invalidateSize();
  }, 250);
}

function useMyCurrentLocation() {
  if (!navigator.geolocation) {
    toast('Your device does not support GPS.');
    return;
  }
  toast('Finding your location...');
  navigator.geolocation.getCurrentPosition(
    function (pos) {
      var lat = pos.coords.latitude;
      var lng = pos.coords.longitude;
      if (_map) _map.setView([lat, lng], 17);
      if (_marker) _marker.setLatLng([lat, lng]);
      toast('Location found');
    },
    function (err) {
      console.warn('[Munch] GPS error:', err);
      toast('Could not get your location. Drag the pin manually.');
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

function cancelMapPicker() {
  cleanupMap();
  var ov = document.getElementById('map-overlay');
  if (ov) ov.classList.remove('open');
  document.body.style.overflow = '';
  if (_mapResolve) { _mapResolve(null); _mapResolve = null; }
}

function confirmMapPicker() {
  if (!_marker) { cancelMapPicker(); return; }
  var pos = _marker.getLatLng();
  var result = { lat: pos.lat, lng: pos.lng };
  cleanupMap();
  var ov = document.getElementById('map-overlay');
  if (ov) ov.classList.remove('open');
  document.body.style.overflow = '';
  if (_mapResolve) { _mapResolve(result); _mapResolve = null; }
}

function cleanupMap() {
  try {
    if (_map) { _map.remove(); _map = null; _marker = null; }
  } catch (e) {}
}