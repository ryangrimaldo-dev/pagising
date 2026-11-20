// Hardware layer. Two modes, chosen in Settings (settings.hw):
//  - Demo mode (default): simulated wristband, tag scans, buzzes, trip countdown and alerts.
//  - Wristband mode: the real Pagising wristband over Bluetooth (band.js) + the phone's GPS (gps.js).
// Screens call the same functions in both modes.
import { get, writable } from 'svelte/store';
import { settings, tags, trip, alert, addLog, toast } from './stores.js';
import { PATTERNS } from './mock.js';
import { navigate } from './router.js';
import { fmtList, fmtTime } from './format.js';
import * as band from './band.js';
import * as gps from './gps.js';

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export const hwAvailable = band.bluetoothAvailable;
export const hwOn = () => !!get(settings).hw && band.bluetoothAvailable;
const hwReady = () => hwOn() && band.isConnected();

const setBand = (patch) => settings.update((s) => ({ ...s, band: { ...s.band, ...patch } }));

// App pattern id -> firmware pattern name (VIB:<name>)
const FW_PATTERN = { stop10: 'STAGE1', stop5: 'STAGE2', stop1: 'STAGE3', theft: 'THEFT', left: 'LEFT', battery: 'LOWBAT', lost: 'LOSTCON' };

export const buzzing = writable(null);
let buzzTimer;

// send: also play it on the real wristband (skip when the wristband is already buzzing by itself).
export function buzz(patternOrId, label, { send = true } = {}) {
  const p = typeof patternOrId === 'string' ? PATTERNS.find((x) => x.id === patternOrId) : patternOrId;
  const k = 0.5 + get(settings).strength / 100;
  const vib = p.vib.map((d, i) => (i % 2 === 0 ? Math.round(d * k) : d));
  if (hwOn()) {
    if (send && hwReady() && FW_PATTERN[p.id]) band.send(`VIB:${FW_PATTERN[p.id]}`);
  } else {
    try {
      navigator.vibrate?.(vib);
    } catch {
      /* not supported */
    }
  }
  const total = vib.reduce((a, b) => a + b, 0);
  buzzing.set({ id: p.id, label: label ?? `Wristband: ${p.desc.toLowerCase()}` });
  clearTimeout(buzzTimer);
  buzzTimer = setTimeout(() => buzzing.set(null), Math.max(total, 1000));
}

export function stopBuzz({ send = true } = {}) {
  clearTimeout(buzzTimer);
  buzzing.set(null);
  if (hwOn()) {
    if (send && hwReady()) band.send('VIB:STOP');
    return;
  }
  try {
    navigator.vibrate?.(0);
  } catch {
    /* ignore */
  }
}

// Tells the wristband the vibration strength from Settings (firmware accepts 50-100 %).
export function sendStrength() {
  if (hwReady()) band.send(`STRENGTH:${Math.round(50 + get(settings).strength / 2)}`);
}

// ---------- Tag scanning and pairing ----------

let seq = 0;
let scanCollect = null;

export async function scanTags() {
  if (hwOn()) {
    if (!band.isConnected()) throw new Error('Connect the wristband first');
    const found = [];
    const done = new Promise((resolve) => {
      scanCollect = { found, resolve };
      setTimeout(resolve, 9000);
    });
    band.send('TAGSCAN');
    await done;
    scanCollect = null;
    return found;
  }
  await wait(1400);
  const n = ++seq;
  return [
    { id: `d${n}a`, name: 'PAGISING-TAG', signal: 4 },
    { id: `d${n}b`, name: 'Unnamed device', signal: 2 },
    { id: `d${n}c`, name: 'Unnamed device', signal: 1 }
  ];
}

const DIST_FW = { close: 'CLOSE', normal: 'NORMAL', far: 'FAR' };

// Called after a tag is added in AddTags. The wristband identifies tags by bleId and
// reports them back by the app's tag id (used as the label).
export function registerTag(tag) {
  if (!hwReady() || !tag.bleId) return;
  band.send(`TAGADD:${tag.bleId}|${tag.id}`);
  band.send(`TAGDIST:${tag.bleId}|${DIST_FW[tag.distance] ?? 'NORMAL'}`);
}

// ---------- Wristband connection ----------

export async function connectBand() {
  if (hwOn()) {
    if (!band.isConnected()) await band.connect();
    setBand({ connected: true });
    sendStrength();
    get(tags).forEach(registerTag); // the wristband also keeps them in its own memory
    return { battery: get(settings).band.battery };
  }
  await wait(1800);
  if (get(settings).failNextPairing) {
    settings.update((s) => ({ ...s, failNextPairing: false }));
    throw new Error('Wristband not found');
  }
  settings.update((s) => ({ ...s, band: { ...s.band, connected: true, battery: 82 } }));
  return { battery: 82 };
}

export function disconnectBand() {
  if (hwOn()) {
    manualDisconnect = true;
    band.disconnect();
  }
  setBand({ connected: false });
}

// ---------- Trips ----------

export function startTrip({ stop, mode, alertMins, minutes }) {
  const hw = hwOn();
  const coords = hw ? gps.coordsFor(stop) : null;
  let totalSec = (minutes ?? stop.min) * 60;
  if (hw && coords) {
    const est = gps.estimate(coords, mode);
    if (est) totalSec = Math.max(60, est.remainingSec);
  }
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
    theftChecked: false,
    hw,
    coords
  });
  if (hw) {
    band.send('TRIP:START');
    gps.startWatch(null, () => toast('GPS is off. Using the expected trip time instead.'));
  }
  addLog({ type: 'trip', title: `Trip started to ${stop.name}`, detail: `${mode} · alerts at ${fmtList(mins)} min` });
  navigate('/trip');
}

function fireStop(t) {
  const stage = t.fired;
  const total = t.alertMins.length;
  const final = stage === total;
  const pattern = final ? 'stop1' : stage === 1 ? 'stop10' : 'stop5';
  const minutes = t.alertMins[stage - 1];
  if (t.hw) {
    // The wristband plays the pattern itself and keeps escalating even if no one looks at the phone.
    band.send(`STAGE:${final ? 3 : stage === 1 ? 1 : 2}`);
    if (t.awake) {
      addLog({ type: 'alert', title: `Stop alert, stage ${stage} of ${total} (already awake)`, detail: `${t.stopName} in ${minutes} min` });
      return;
    }
  }
  alert.set({ type: 'stop', stage, total, minutes, pattern, at: Date.now(), stopName: t.stopName });
  buzz(pattern, undefined, { send: !t.hw });
  addLog({ type: 'alert', title: `Stop alert, stage ${stage} of ${total}`, detail: `${t.stopName} in ${minutes} min` });
  navigate('/alert/stop');
}

export function acknowledgeStop() {
  const a = get(alert);
  const t = get(trip);
  if (t?.hw) band.send('AWAKE');
  trip.update((x) => x && { ...x, awake: true });
  if (a) addLog({ type: 'alert', title: 'You tapped I’m awake', detail: `Stage ${a.stage} of ${a.total} · ${fmtTime(Date.now())}` });
  alert.set(null);
  stopBuzz({ send: false });
  navigate(get(trip) ? '/trip' : '/', { replace: true });
}

function arrive(t, how) {
  if (t.hw) {
    gps.stopWatch();
    band.send('TRIP:END');
  }
  if (get(alert)?.type === 'stop') alert.set(null);
  trip.set(null);
  addLog({
    type: 'trip',
    title: `Arrived at ${t.stopName}`,
    detail: `${t.line} · ${how ?? (t.awake ? 'you were awake' : 'no tap on the last alert')}`
  });
  toast(`You’ve reached ${t.stopName}`, 'ok');
  navigate('/', { replace: true });
}

export function endTrip() {
  const t = get(trip);
  if (!t) return;
  if (t.hw) {
    gps.stopWatch();
    band.send('TRIP:END');
  }
  trip.set(null);
  addLog({ type: 'trip', title: `Trip to ${t.stopName} ended early`, detail: `${Math.ceil(t.remainingSec / 60)} min before the stop` });
  toast('Trip ended. Alerts are off.');
  navigate('/', { replace: true });
}

// ---------- Tag alerts ----------

function lastPlace() {
  const p = hwOn() ? gps.lastPosition() : null;
  if (p) return { lastPlace: `at ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`, lastLat: p.lat, lastLng: p.lng };
  return { lastPlace: hwOn() ? 'where the alert happened' : 'near Guadalupe' };
}

// type: 'theft' (user sitting or standing) or 'left' (user walking away)
export function triggerTagAlert(tagId, type = 'theft', { fromBand = false } = {}) {
  const tag = get(tags).find((x) => x.id === tagId);
  if (!tag) return;
  const place = lastPlace();
  tags.update((l) => l.map((x) => (x.id === tagId ? { ...x, lost: true, signal: 0, lostAt: Date.now(), ...place } : x)));
  alert.set({ type, tagId, at: Date.now() });
  buzz(type, undefined, { send: !fromBand });
  addLog({
    type: 'alert',
    title: type === 'left' ? `${tag.name} left behind` : `Possible theft: ${tag.name}`,
    detail: `${type === 'left' ? 'Stayed behind while you walked away' : 'Moved away while you were seated'} · ${place.lastPlace}`
  });
  navigate(`/alert/theft/${tagId}`);
}

export const triggerTheft = (tagId) => triggerTagAlert(tagId, 'theft');

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

// ---------- Timers ----------

function tick() {
  const t = get(trip);
  if (t?.hw) return hwTick(t);
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

// Real trip: time left from GPS (or the clock), stages sent to the wristband.
// The trip ends when the wristband's activity model detects walking (TRIP_END event).
function hwTick(t) {
  const est = t.coords ? gps.estimate(t.coords, t.mode) : null;
  const elapsed = (Date.now() - t.startedAt) / 1000;
  const remaining = est ? est.remainingSec : Math.max(0, Math.round(t.totalSec - elapsed));
  const next = { ...t, remainingSec: Math.min(remaining, t.totalSec), kmLeft: est ? est.km : null };
  const m = t.alertMins[t.fired];
  if (m !== undefined && next.remainingSec <= m * 60) {
    next.fired = t.fired + 1;
    trip.set(next);
    fireStop(next);
    return;
  }
  trip.set(next);
}

function drift() {
  if (hwOn()) return; // real signal comes from the wristband
  tags.update((l) =>
    l.map((x) => (x.lost ? x : { ...x, signal: Math.max(1, Math.min(4, x.base - (Math.random() < 0.3 ? 1 : 0))) }))
  );
}

// ---------- Messages from the wristband ----------

let manualDisconnect = false;
let reconnectTimer = null;
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const findTag = (id) => get(tags).find((x) => x.id === id);

function onBandEvent(msg) {
  const i = msg.indexOf(':');
  const name = i < 0 ? msg : msg.slice(0, i);
  const parts = i < 0 ? [] : msg.slice(i + 1).split('|');

  switch (name) {
    case 'FOUND': {
      if (!scanCollect) return;
      const [addr, devName, rssi] = parts;
      const named = devName && devName !== '-';
      // Named devices (like a phone advertising PAGISING-TAG) are matched by name,
      // because phones change their Bluetooth address every few minutes.
      const bleId = named ? devName : addr;
      if (!scanCollect.found.some((d) => d.bleId === bleId))
        scanCollect.found.push({ id: bleId, bleId, name: named ? devName : 'Unnamed device', signal: band.bars(rssi) });
      return;
    }
    case 'SCANDONE':
      scanCollect?.resolve();
      return;
    case 'AWAKE':
      if (get(alert)?.type === 'stop') acknowledgeStop();
      else trip.update((x) => x && { ...x, awake: true });
      return;
    case 'TRIP_END': {
      const t = get(trip);
      if (t) arrive(t, 'ended when you walked off');
      return;
    }
    case 'THEFT':
    case 'LEFT': {
      const tag = findTag(parts[0]);
      if (tag && !tag.lost) triggerTagAlert(tag.id, name === 'LEFT' ? 'left' : 'theft', { fromBand: true });
      return;
    }
    case 'TAGBACK': {
      const tag = findTag(parts[0]);
      if (!tag) return;
      tags.update((l) => l.map((x) => (x.id === tag.id ? { ...x, lost: false, signal: Math.max(2, x.base ?? 3), lostAt: null } : x)));
      toast(`${tag.name} is back in range`, 'ok');
      return;
    }
    case 'TAG': {
      const [, label, rssi] = parts;
      tags.update((l) => l.map((x) => (x.id === label && !x.lost ? { ...x, signal: Math.max(1, band.bars(rssi)) } : x)));
      return;
    }
    case 'LOWBAT': {
      const pct = band.batteryPercent(parts[0]);
      if (pct != null) setBand({ battery: pct });
      buzz('battery', undefined, { send: false });
      addLog({ type: 'alert', title: 'Wristband battery low', detail: `${parts[0]} V · charge it soon` });
      toast('Wristband battery is low', 'danger');
      return;
    }
    default:
      return; // HELLO, OK:..., ERR:... need no action
  }
}

let lastStatus = '';
function onBandStatus(s) {
  const key = `${s.act}|${s.bat}`;
  if (key === lastStatus) return;
  lastStatus = key;
  const patch = {};
  if (s.act && s.act !== 'unknown') patch.posture = cap(s.act);
  const pct = band.batteryPercent(s.bat);
  if (pct != null) patch.battery = pct;
  setBand(patch);
}

function onBandDisconnect() {
  setBand({ connected: false });
  if (manualDisconnect) {
    manualDisconnect = false;
    return;
  }
  addLog({ type: 'alert', title: 'Wristband disconnected', detail: 'Protection paused until it reconnects' });
  toast('Wristband disconnected. Trying to reconnect…', 'danger');
  if (get(trip)) buzz('lost', 'Wristband disconnected', { send: false });
  clearInterval(reconnectTimer);
  reconnectTimer = setInterval(async () => {
    if (!hwOn() || band.isConnected()) return clearInterval(reconnectTimer);
    try {
      await band.reconnect();
      clearInterval(reconnectTimer);
      setBand({ connected: true });
      sendStrength();
      toast('Wristband reconnected', 'ok');
    } catch {
      /* keep trying */
    }
  }, 5000);
}

// Keep the wristband's tag list in step with the app: removed tags and alert distance changes.
let prevTags = null;
function syncTags(list) {
  if (prevTags && hwReady()) {
    for (const old of prevTags) {
      const now = list.find((x) => x.id === old.id);
      if (!now && old.bleId) band.send(`TAGDEL:${old.bleId}`);
      else if (now && now.bleId && now.distance !== old.distance) band.send(`TAGDIST:${now.bleId}|${DIST_FW[now.distance] ?? 'NORMAL'}`);
    }
  }
  prevTags = list;
}

let started = false;
export function startSim() {
  if (started) return;
  started = true;
  if (hwOn()) setBand({ connected: false }); // a page reload drops the Bluetooth link
  band.on('event', onBandEvent);
  band.on('status', onBandStatus);
  band.on('disconnect', onBandDisconnect);
  tags.subscribe(syncTags);
  let prevStrength = get(settings).strength;
  settings.subscribe((s) => {
    if (s.strength !== prevStrength) {
      prevStrength = s.strength;
      sendStrength();
    }
  });
  setInterval(tick, 1000);
  setInterval(drift, 5000);
  setInterval(() => {
    if (hwReady() && get(tags).length) band.send('TAGLIST'); // live signal bars
  }, 5000);
}
