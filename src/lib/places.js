// Place search for stops anywhere in the Philippines (OpenStreetMap Nominatim, free, needs data).
import { distanceKm, lastPosition, coordsFor } from './gps.js';

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const MODE_KMH = { Bus: 20, Jeepney: 15, 'MRT/LRT': 30, 'Provincial bus': 30 };
const MANILA = [14.5995, 120.9842];

// Rough distance and time for a new stop, from where you are now (or from Manila if GPS isn't ready).
function rough(lat, lng, mode) {
  const p = lastPosition();
  const from = p ? [p.lat, p.lng] : MANILA;
  const km = Math.max(1, Math.round(distanceKm(from, [lat, lng]) * 1.3 * 10) / 10);
  const min = Math.max(5, Math.round((km / (MODE_KMH[mode] ?? 20)) * 60));
  return { km, min };
}

export function makeStop({ name, detail = '', lat, lng, mode = 'Bus' }) {
  return {
    id: `place-${lat.toFixed(5)}-${lng.toFixed(5)}`,
    name,
    line: detail || mode,
    mode,
    lat,
    lng,
    pinned: true,
    ...rough(lat, lng, mode)
  };
}

function shortName(r) {
  const a = r.address ?? {};
  return r.name || a.amenity || a.building || a.road || a.suburb || a.village || a.town || a.city || r.display_name.split(',')[0];
}
function area(r) {
  const a = r.address ?? {};
  return [a.suburb || a.village || a.neighbourhood, a.city || a.town || a.municipality, a.state || a.province].filter(Boolean).slice(0, 2).join(', ');
}

let controller;
export async function searchPlaces(q, mode) {
  controller?.abort();
  controller = new AbortController();
  const p = lastPosition();
  const near = p ? `&viewbox=${p.lng - 0.6},${p.lat + 0.6},${p.lng + 0.6},${p.lat - 0.6}` : '';
  const url = `${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=ph&accept-language=en${near}&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { signal: controller.signal });
  const list = await res.json();
  return list.map((r) => makeStop({ name: shortName(r), detail: area(r), lat: +r.lat, lng: +r.lon, mode }));
}

export async function placeName(lat, lng) {
  try {
    const res = await fetch(`${NOMINATIM}/reverse?format=jsonv2&addressdetails=1&zoom=17&accept-language=en&lat=${lat}&lon=${lng}`);
    const r = await res.json();
    if (r?.display_name) return { name: shortName(r), detail: area(r) };
  } catch {
    /* offline */
  }
  return { name: 'Pinned stop', detail: `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
}

export const stopCoords = (s) => coordsFor(s);
