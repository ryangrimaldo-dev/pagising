// Phone GPS for real trips: distance and time left to the stop.
// GPS works without internet; only maps need data.

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

// Typical speeds when GPS speed is unknown or the vehicle is stuck (km/h).
const MODE_KMH = { Bus: 15, Jeepney: 12, 'MRT/LRT': 30, 'Provincial bus': 40 };
const ROAD_FACTOR = 1.3; // roads are longer than a straight line

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
let speeds = [];            // recent speeds in km/h, for a smooth average

export const lastPosition = () => last;

export function startWatch(onUpdate, onError) {
  if (!navigator.geolocation) {
    onError?.(new Error('No GPS on this device'));
    return;
  }
  stopWatch();
  speeds = [];
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, at: pos.timestamp };
      let kmh = pos.coords.speed != null && pos.coords.speed >= 0 ? pos.coords.speed * 3.6 : null;
      if (kmh == null && last) {
        const hours = (p.at - last.at) / 3600000;
        if (hours > 0) kmh = distanceKm([last.lat, last.lng], [p.lat, p.lng]) / hours;
      }
      if (kmh != null && kmh < 150) speeds = [...speeds, kmh].slice(-30);
      last = p;
      onUpdate?.(p);
    },
    (err) => onError?.(err),
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
  );
}

export function stopWatch() {
  if (watchId != null) navigator.geolocation?.clearWatch(watchId);
  watchId = null;
}

// Time left in seconds, from the road distance and a speed that never drops below
// half the usual speed for that mode (so a traffic jam doesn't make the ETA infinite).
export function estimate(stopCoords, mode) {
  if (!last || !stopCoords) return null;
  const km = distanceKm([last.lat, last.lng], stopCoords) * ROAD_FACTOR;
  const avg = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
  const usual = MODE_KMH[mode] ?? 15;
  const kmh = Math.max(avg, usual / 2);
  return { km, remainingSec: Math.round((km / kmh) * 3600) };
}
