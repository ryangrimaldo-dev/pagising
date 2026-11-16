// Simulated hardware: wristband pairing, tag scans, buzzes, trip countdown and alerts.
import { get, writable } from 'svelte/store';
import { settings, tags, trip, alert, addLog, toast } from './stores.js';
import { PATTERNS } from './mock.js';
import { navigate } from './router.js';
import { fmtList, fmtTime } from './format.js';

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export const buzzing = writable(null);
let buzzTimer;

export function buzz(patternOrId, label) {
  const p = typeof patternOrId === 'string' ? PATTERNS.find((x) => x.id === patternOrId) : patternOrId;
  const k = 0.5 + get(settings).strength / 100;
  const vib = p.vib.map((d, i) => (i % 2 === 0 ? Math.round(d * k) : d));
  try {
    navigator.vibrate?.(vib);
  } catch {
    /* not supported */
  }
  const total = vib.reduce((a, b) => a + b, 0);
  buzzing.set({ id: p.id, label: label ?? `Wristband: ${p.desc.toLowerCase()}` });
  clearTimeout(buzzTimer);
  buzzTimer = setTimeout(() => buzzing.set(null), Math.max(total, 1000));
}

export function stopBuzz() {
  clearTimeout(buzzTimer);
  buzzing.set(null);
  try {
    navigator.vibrate?.(0);
  } catch {
    /* ignore */
  }
}

let seq = 0;
export async function scanTags() {
  await wait(1400);
  const n = ++seq;
  return [
    { id: `d${n}a`, name: 'PAGISING-TAG', signal: 4 },
    { id: `d${n}b`, name: 'Unnamed device', signal: 2 },
    { id: `d${n}c`, name: 'Unnamed device', signal: 1 }
  ];
}

export async function connectBand() {
  await wait(1800);
  if (get(settings).failNextPairing) {
    settings.update((s) => ({ ...s, failNextPairing: false }));
    throw new Error('Wristband not found');
  }
  settings.update((s) => ({ ...s, band: { ...s.band, connected: true, battery: 82 } }));
  return { battery: 82 };
}

export function startTrip({ stop, mode, alertMins, minutes }) {
  const totalSec = (minutes ?? stop.min) * 60;
  const mins = [...alertMins].sort((a, b) => b - a);
  trip.set({
    stopId: stop.id,
    stopName: stop.name,
    line: stop.line,
    mode,
    km: stop.km,
    totalSec,
    remainingSec: totalSec,
    alertMins: mins,
    fired: mins.filter((m) => m * 60 >= totalSec).length,
    awake: false,
    startedAt: Date.now(),
    theftChecked: false
  });
  addLog({ type: 'trip', title: `Trip started to ${stop.name}`, detail: `${mode} · alerts at ${fmtList(mins)} min` });
  navigate('/trip');
}

function fireStop(t) {
  const stage = t.fired;
  const total = t.alertMins.length;
  const final = stage === total;
  const pattern = final ? 'stop1' : stage === 1 ? 'stop10' : 'stop5';
  const minutes = t.alertMins[stage - 1];
  alert.set({ type: 'stop', stage, total, minutes, pattern, at: Date.now(), stopName: t.stopName });
  buzz(pattern);
  addLog({ type: 'alert', title: `Stop alert, stage ${stage} of ${total}`, detail: `${t.stopName} in ${minutes} min` });
  navigate('/alert/stop');
}

export function acknowledgeStop() {
  const a = get(alert);
  trip.update((t) => t && { ...t, awake: true });
  if (a) addLog({ type: 'alert', title: 'You tapped I’m awake', detail: `Stage ${a.stage} of ${a.total} · ${fmtTime(Date.now())}` });
  alert.set(null);
  stopBuzz();
  navigate(get(trip) ? '/trip' : '/', { replace: true });
}

function arrive(t) {
  trip.set(null);
  addLog({ type: 'trip', title: `Arrived at ${t.stopName}`, detail: `${t.line} · ${t.awake ? 'you were awake' : 'no tap on the last alert'}` });
  toast(`You’ve reached ${t.stopName}`, 'ok');
  navigate('/', { replace: true });
}

export function endTrip() {
  const t = get(trip);
  if (!t) return;
  trip.set(null);
  addLog({ type: 'trip', title: `Trip to ${t.stopName} ended early`, detail: `${Math.ceil(t.remainingSec / 60)} min before the stop` });
  toast('Trip ended. Alerts are off.');
  navigate('/', { replace: true });
}

export function triggerTheft(tagId) {
  const tag = get(tags).find((x) => x.id === tagId);
  if (!tag) return;
  tags.update((l) => l.map((x) => (x.id === tagId ? { ...x, lost: true, signal: 0, lostAt: Date.now(), lastPlace: 'near Guadalupe' } : x)));
  alert.set({ type: 'theft', tagId, at: Date.now() });
  buzz('theft');
  addLog({ type: 'alert', title: `Possible theft: ${tag.name}`, detail: 'Moved away while you were seated · near Guadalupe' });
  navigate(`/alert/theft/${tagId}`);
}

export function recoverTag(tagId) {
  const tag = get(tags).find((x) => x.id === tagId);
  tags.update((l) => l.map((x) => (x.id === tagId ? { ...x, lost: false, signal: x.base, lostAt: null } : x)));
  if (get(alert)?.tagId === tagId) alert.set(null);
  stopBuzz();
  if (tag) {
    addLog({ type: 'alert', title: `${tag.name} is back with you`, detail: 'You confirmed you have it' });
    toast(`Good. ${tag.name} is marked as with you.`, 'ok');
  }
}

function tick() {
  const t = get(trip);
  if (!t || get(alert)) return;
  const step = Math.max(20, t.totalSec / 45); // whole trip plays out in ~45 s
  const remaining = Math.max(0, t.remainingSec - step);
  const next = { ...t, remainingSec: remaining };
  const m = t.alertMins[t.fired];
  if (m !== undefined && remaining <= m * 60) {
    next.fired = t.fired + 1;
    trip.set(next);
    fireStop(next);
    return;
  }
  if (!t.theftChecked && remaining <= t.totalSec * 0.6) {
    next.theftChecked = true;
    trip.set(next);
    const candidates = get(tags).filter((x) => !x.lost);
    if (candidates.length && Math.random() < 0.3) {
      const pick = candidates.find((x) => x.kind === 'Bag') ?? candidates[0];
      triggerTheft(pick.id);
    }
    return;
  }
  if (remaining === 0) return arrive(next);
  trip.set(next);
}

function drift() {
  tags.update((l) =>
    l.map((x) => (x.lost ? x : { ...x, signal: Math.max(1, Math.min(4, x.base - (Math.random() < 0.3 ? 1 : 0))) }))
  );
}

let started = false;
export function startSim() {
  if (started) return;
  started = true;
  setInterval(tick, 1000);
  setInterval(drift, 5000);
}
