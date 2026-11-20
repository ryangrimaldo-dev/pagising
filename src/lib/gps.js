// Phone GPS for real trips: distance and time left to the stop, plus the road route for the map.
// GPS itself works without internet; the map tiles and the road route need data.
import { writable, get } from 'svelte/store';

// Approximate stop locations (lat, lng). CHECK EACH ONE before field testing:
// in Google Maps, right-click the exact stop -> click the coordinates to copy them.
// Stops without coordinates fall back to a real-time countdown from the trip's expected minutes.
export const STOP_COORDS = {
  'ayala-bw': [14.5492, 121.028],
  'ayala-mrt': [14.5492, 121.028],
  'guadalupe-mrt': [14.5669, 121.0455],
  'buendia-bw': [14.5544, 121.0345],
  'ortigas-mrt': [14.5878, 121.0567],
  'cubao-mrt': [14.6195, 121.0512],
  'quiapo-jeep': [14.5988, 120.984],
  'up-diliman': [14.6537, 121.0687],
  'monumento-bw': [14.6573, 120.984],
  pitx: [14.5097, 120.9921]
};

// Typical door-to-door speeds in Metro Manila traffic (km/h), used when the
// phone isn't moving yet or the road route can't be loaded.
const MODE_KMH = { Bus: 20, Jeepney: 15, 'MRT/LRT': 30, 'Provincial bus': 30 };
const RAIL = new Set(['MRT/LRT']);
const ROAD_FACTOR = 1.3;   // roads are longer than a straight line
const TRAFFIC = 1.8;       // the route service assumes empty roads; real commutes are slower
const ROUTE_REFRESH_MS = 3 * 60 * 1000;

export function coordsFor(stop) {
  if (stop?.lat != null && stop?.lng != null) return [stop.lat, stop.lng];
  return STOP_COORDS[stop?.id] ?? null;
}

export function distanceKm([lat1, lng1], [lat2, lng2]) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

let watchId = null;
let last = null;            // { lat, lng, at }
let speeds = [];            // recent speeds: { kmh, at }

export const lastPosition = () => last;
export const position = writable(null);   // live position for the map
export const gpsError = writable('');     // why there's no position (shown on the map)
export const isWatching = () => watchId != null;
export const route = writable(null);      // { line: [[lat,lng]...], km, sec, straightKm, at, to }

export function startWatch(onUpdate, onError) {
  if (!navigator.geolocation) {
    gpsError.set('This browser has no location access.');
    onError?.(new Error('No GPS on this device'));
    return;
  }
  gpsError.set('');
  stopWatch();
  speeds = [];
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, at: pos.timestamp, acc: pos.coords.accuracy };
      let kmh = pos.coords.speed != null && pos.coords.speed >= 0 ? pos.coords.speed * 3.6 : null;
      if (kmh == null && last) {
        const hours = (p.at - last.at) / 3600000;
        if (hours > 0) kmh = distanceKm([last.lat, last.lng], [p.lat, p.lng]) / hours;
      }
      if (kmh != null && kmh < 150) speeds = [...speeds, { kmh, at: p.at }].filter((s) => p.at - s.at < 120000);
      last = p;
      position.set(p);
      gpsError.set('');
      onUpdate?.(p);
    },
    (err) => {
      gpsError.set(
        err.code === 1
          ? 'Location is blocked. Allow location for this site in your browser settings, then reload.'
          : err.code === 3
            ? 'Still looking for GPS. Go near a window or outside.'
            : 'Location is unavailable. Turn on Location Services on your device.'
      );
      onError?.(err);
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
  );
}

export function stopWatch() {
  if (watchId != null) navigator.geolocation?.clearWatch(watchId);
  watchId = null;
  route.set(null);
}

// Road route from the current position to the stop (free OSRM demo server, OpenStreetMap data).
let routeBusy = false;
export async function refreshRoute(stopCoords) {
  if (!last || !stopCoords || routeBusy) return;
  const r = get(route);
  const sameStop = r && r.to[0] === stopCoords[0] && r.to[1] === stopCoords[1];
  if (sameStop && Date.now() - r.at < ROUTE_REFRESH_MS) return;
  routeBusy = true;
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${last.lng},${last.lat};${stopCoords[1]},${stopCoords[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    const best = data?.routes?.[0];
    if (best) {
      route.set({
        line: best.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
        km: best.distance / 1000,
        sec: best.duration,
        straightKm: distanceKm([last.lat, last.lng], stopCoords),
        at: Date.now(),
        to: stopCoords
      });
    }
  } catch {
    /* offline or service busy: the estimate falls back to straight-line distance */
  } finally {
    routeBusy = false;
  }
}

// Time left in seconds and road kilometers left.
// Base speed: the road route's free-flow time slowed down for traffic (or a typical speed for the mode).
// When the phone is clearly moving, the recent GPS speed is blended in.
export function estimate(stopCoords, mode) {
  if (!last || !stopCoords) return null;
  const straight = distanceKm([last.lat, last.lng], stopCoords);
  const r = get(route);
  const useRoute = r && !RAIL.has(mode) && r.to[0] === stopCoords[0] && r.to[1] === stopCoords[1];
  const km = useRoute ? r.km * (straight / Math.max(0.1, r.straightKm)) : straight * ROAD_FACTOR;
  const usual = MODE_KMH[mode] ?? 20;
  let base = useRoute ? r.km / ((r.sec * TRAFFIC) / 3600) : usual;
  base = Math.min(60, Math.max(8, base));
  const recent = speeds.filter((s) => last.at - s.at < 120000);
  const avg = recent.length >= 3 ? recent.reduce((a, s) => a + s.kmh, 0) / recent.length : 0;
  const kmh = avg >= 12 ? 0.5 * Math.min(avg, base * 1.8) + 0.5 * base : base;
  return { km, remainingSec: Math.round((km / kmh) * 3600) };
}
