<script>
  // Real map for a live trip: OpenStreetMap streets, your GPS position, the road route and your stop.
  import { onMount } from 'svelte';
  import L from 'leaflet';
  import 'leaflet/dist/leaflet.css';
  import { position, route, gpsError } from '../lib/gps.js';

  let { stop, stopName = 'Stop', mode = 'Bus', height = 260 } = $props();

  let el = $state();
  let failed = $state(false);
  let following = $state(true);
  let map, me, accuracy, stopMarker, line;
  let routeFitted = false;

  const dotIcon = L.divIcon({ className: 'me-dot', iconSize: [20, 20], iconAnchor: [10, 10] });
  const pinIcon = L.divIcon({
    className: 'stop-pin',
    html: '<svg width="30" height="40" viewBox="0 0 30 40"><path d="M15 39C6 27 1 20 1 14a14 14 0 0 1 28 0c0 6-5 13-14 25z" fill="#e5484d" stroke="#fff" stroke-width="2"/><circle cx="15" cy="14" r="5" fill="#fff"/></svg>',
    iconSize: [30, 40],
    iconAnchor: [15, 39]
  });

  function fit() {
    if (!map) return;
    const pts = [stop];
    const p = $position;
    if (p) pts.push([p.lat, p.lng]);
    if ($route?.line?.length) pts.push(...$route.line);
    if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { paddingTopLeft: [30, 40], paddingBottomRight: [50, 40], maxZoom: 16 });
    else map.setView(stop, 14);
    following = true;
  }

  onMount(() => {
    map = L.map(el, { zoomControl: false, attributionControl: true }).setView(stop, 13);
    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);
    let errors = 0;
    tiles.on('tileerror', () => { if (++errors > 8) failed = true; });
    tiles.on('tileload', () => { errors = 0; failed = false; });
    L.control.zoom({ position: 'topright' }).addTo(map);
    stopMarker = L.marker(stop, { icon: pinIcon, title: stopName }).addTo(map).bindPopup(stopName);
    map.on('dragstart', () => (following = false));
    // the map box gets its final size after the screen lays out; refit then
    const ro = new ResizeObserver(() => { map.invalidateSize(); if (following) fit(); });
    ro.observe(el);
    fit();
    return () => { ro.disconnect(); map.remove(); };
  });

  // Your position (blue dot with an accuracy circle)
  $effect(() => {
    const p = $position;
    if (!map || !p) return;
    const ll = [p.lat, p.lng];
    if (!me) {
      accuracy = L.circle(ll, { radius: p.acc ?? 30, color: '#2457c5', weight: 0, fillOpacity: 0.15 }).addTo(map);
      me = L.marker(ll, { icon: dotIcon, zIndexOffset: 1000 }).addTo(map);
      fit();
    } else {
      me.setLatLng(ll);
      accuracy.setLatLng(ll).setRadius(p.acc ?? 30);
      if (following) map.panTo(ll, { animate: true });
    }
  });

  // Road route (solid) or a straight dashed line while the route loads
  $effect(() => {
    const p = $position;
    const r = $route;
    if (!map) return;
    line?.remove();
    if (r?.line?.length) {
      line = L.polyline(r.line, { color: '#2457c5', weight: 6, opacity: 0.85 }).addTo(map);
      if (!routeFitted) { routeFitted = true; if (following) fit(); }
    } else if (p) {
      line = L.polyline([[p.lat, p.lng], stop], { color: '#2457c5', weight: 4, dashArray: '8 10' }).addTo(map);
    }
  });

  const gmaps = $derived(
    $position
      ? `https://www.google.com/maps/dir/?api=1&origin=${$position.lat},${$position.lng}&destination=${stop[0]},${stop[1]}&travelmode=transit`
      : `https://www.google.com/maps/search/?api=1&query=${stop[0]},${stop[1]}`
  );
</script>

<div class="wrap" style="height:{height}px">
  <div class="map" bind:this={el} role="application" aria-label="Map of your position, your route and {stopName}"></div>
  {#if !$position}
    <span class="chip">{$gpsError || 'Finding your location…'}</span>
  {:else if failed}
    <span class="chip">Map needs mobile data. Your trip and alerts still work.</span>
  {/if}
  {#if !following}
    <button class="recenter" onclick={fit} aria-label="Show my position and my stop">Recenter</button>
  {/if}
</div>
<a class="gmaps" href={gmaps} target="_blank" rel="noopener">Open in Google Maps</a>

<style>
  .wrap { position: relative; border-radius: var(--radius); overflow: hidden; border: 1.5px solid var(--border-strong); flex-shrink: 0; }
  .map { position: absolute; inset: 0; background: var(--map); }
  .chip {
    position: absolute; left: 10px; bottom: 26px; z-index: 500; background: var(--surface); color: var(--text);
    padding: 5px 10px; border-radius: 8px; font-size: 0.8125rem; box-shadow: 0 1px 4px rgb(0 0 0 / 0.25);
  }
  .recenter {
    position: absolute; left: 10px; top: 10px; z-index: 500; background: var(--surface); color: var(--text);
    border: 1px solid var(--border-strong); border-radius: 999px; padding: 8px 14px; font-size: 0.875rem; font-weight: 600;
  }
  .gmaps { align-self: flex-end; margin-top: -4px; font-size: 0.9375rem; font-weight: 600; color: var(--primary); }
  :global(.me-dot) {
    background: #2457c5; border: 3px solid #fff; border-radius: 50%; box-shadow: 0 0 0 2px rgb(36 87 197 / 0.35);
  }
  :global(.stop-pin) { background: none; border: none; }
  :global(.leaflet-control-attribution) { font-size: 10px; }
</style>
