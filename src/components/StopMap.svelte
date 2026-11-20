<script>
  // Real map for choosing a stop. Tap anywhere to drop a pin, or tap a saved stop.
  // With pickable={false} it is a small preview of the chosen stop.
  import { onMount } from 'svelte';
  import L from 'leaflet';
  import 'leaflet/dist/leaflet.css';
  import { STOPS } from '../lib/mock.js';
  import { coordsFor, lastPosition } from '../lib/gps.js';

  let { selected = null, pickable = true, height = 320, onpick = () => {}, onstop = () => {} } = $props();

  let el = $state();
  let map, pin, me;
  const MANILA = [14.5995, 120.9842];

  const pinIcon = L.divIcon({
    className: 'stop-pin',
    html: '<svg width="30" height="40" viewBox="0 0 30 40"><path d="M15 39C6 27 1 20 1 14a14 14 0 0 1 28 0c0 6-5 13-14 25z" fill="#e5484d" stroke="#fff" stroke-width="2"/><circle cx="15" cy="14" r="5" fill="#fff"/></svg>',
    iconSize: [30, 40],
    iconAnchor: [15, 39]
  });
  const savedIcon = L.divIcon({ className: 'saved-stop', iconSize: [14, 14], iconAnchor: [7, 7] });
  const dotIcon = L.divIcon({ className: 'me-dot', iconSize: [18, 18], iconAnchor: [9, 9] });

  function show(c) {
    if (!map) return;
    if (!c) { pin?.remove(); pin = null; return; }
    if (!pin) pin = L.marker(c, { icon: pinIcon, zIndexOffset: 1000 }).addTo(map);
    else pin.setLatLng(c);
    map.setView(c, Math.max(map.getZoom(), pickable ? 14 : 15), { animate: true });
  }

  onMount(() => {
    const p = lastPosition();
    const start = coordsFor(selected) ?? (p ? [p.lat, p.lng] : MANILA);
    map = L.map(el, {
      zoomControl: pickable,
      dragging: pickable,
      scrollWheelZoom: pickable,
      doubleClickZoom: pickable,
      touchZoom: pickable,
      attributionControl: true
    }).setView(start, pickable ? 12 : 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    if (p) me = L.marker([p.lat, p.lng], { icon: dotIcon }).addTo(map);
    if (pickable) {
      for (const s of STOPS) {
        const c = coordsFor(s);
        if (c) L.marker(c, { icon: savedIcon, title: `${s.name} (${s.line})` }).addTo(map).on('click', (e) => { L.DomEvent.stopPropagation(e); onstop(s); });
      }
      map.on('click', (e) => onpick(e.latlng.lat, e.latlng.lng));
    }
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    show(coordsFor(selected));
    return () => { ro.disconnect(); map.remove(); };
  });

  $effect(() => { show(coordsFor(selected)); });
</script>

<div class="stopmap" style="height:{height}px">
  <div class="map" bind:this={el} role="application" aria-label={pickable ? 'Map. Tap where you get off to drop a pin' : 'Map of your stop'}></div>
</div>

<style>
  .stopmap { position: relative; border-radius: var(--radius); overflow: hidden; border: 1.5px solid var(--border-strong); flex-shrink: 0; }
  .map { position: absolute; inset: 0; background: var(--map); }
  :global(.saved-stop) { background: #2457c5; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 0 0 1px rgb(0 0 0 / 0.25); }
  :global(.stop-pin) { background: none; border: none; }
  :global(.me-dot) { background: #2457c5; border: 3px solid #fff; border-radius: 50%; box-shadow: 0 0 0 2px rgb(36 87 197 / 0.35); }
</style>
