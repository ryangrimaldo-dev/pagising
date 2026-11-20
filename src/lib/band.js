// Real wristband link over Web Bluetooth (Chrome on Android/desktop, Bluefy on iPhone).
// Talks to the Pagising ESP32-C3 firmware (Pagising_Wristband.ino) with short text messages.
// This file only moves messages; sim.js decides what they mean for the app.

const SERVICE = '7a1e0001-5c3b-4f5e-9d2a-3b6f0c1a2b00';
const CMD = '7a1e0002-5c3b-4f5e-9d2a-3b6f0c1a2b00';    // phone -> wristband (write)
const STATUS = '7a1e0003-5c3b-4f5e-9d2a-3b6f0c1a2b00'; // wristband -> phone, JSON every 2.5 s
const EVENT = '7a1e0004-5c3b-4f5e-9d2a-3b6f0c1a2b00';  // wristband -> phone, one event per message

export const bluetoothAvailable = typeof navigator !== 'undefined' && !!navigator.bluetooth;

let device = null;
let cmdChar = null;
let queue = Promise.resolve();
const enc = new TextEncoder();
const dec = new TextDecoder();
const handlers = { event: [], status: [], disconnect: [] };

export const on = (kind, fn) => handlers[kind].push(fn);
const emit = (kind, arg) => handlers[kind].forEach((fn) => { try { fn(arg); } catch (e) { console.error(e); } });

export const isConnected = () => !!device?.gatt?.connected && !!cmdChar;

async function setup() {
  const server = await device.gatt.connect();
  const svc = await server.getPrimaryService(SERVICE);
  cmdChar = await svc.getCharacteristic(CMD);
  const st = await svc.getCharacteristic(STATUS);
  const ev = await svc.getCharacteristic(EVENT);
  st.addEventListener('characteristicvaluechanged', (e) => {
    try { emit('status', JSON.parse(dec.decode(e.target.value))); } catch { /* ignore a broken packet */ }
  });
  ev.addEventListener('characteristicvaluechanged', (e) => emit('event', dec.decode(e.target.value).trim()));
  await st.startNotifications();
  await ev.startNotifications();
}

// First connection must come from a tap (browsers require a user gesture for the device picker).
export async function connect() {
  if (!bluetoothAvailable) throw new Error('This browser has no Bluetooth. On iPhone, open the app in Bluefy.');
  if (!device) {
    device = await navigator.bluetooth.requestDevice({ filters: [{ services: [SERVICE] }] });
    device.addEventListener('gattserverdisconnected', () => {
      cmdChar = null;
      emit('disconnect');
    });
  }
  await setup();
  return device.name || 'Pagising';
}

// Reconnect to the same wristband without the picker (works after the first tap).
export async function reconnect() {
  if (!device) throw new Error('Not paired yet');
  await setup();
}

export function disconnect() {
  try { device?.gatt?.disconnect(); } catch { /* ignore */ }
}

// Writes are queued: BLE allows only one write at a time.
export function send(cmd) {
  queue = queue
    .then(async () => {
      if (!isConnected()) return;
      await cmdChar.writeValueWithResponse(enc.encode(cmd));
    })
    .catch((e) => console.warn('Wristband write failed:', cmd, e));
  return queue;
}

// Signal strength (dBm) -> 0-4 bars used by the screens.
export function bars(rssi) {
  const r = Number(rssi);
  if (!Number.isFinite(r) || r <= -95) return 0;
  if (r > -65) return 4;
  if (r > -75) return 3;
  if (r > -85) return 2;
  return 1;
}

// The firmware reports battery volts; map 3.3-4.2 V to 0-100 %.
export function batteryPercent(volts) {
  const v = Number(volts);
  if (!Number.isFinite(v) || v <= 0) return null;
  return Math.max(0, Math.min(100, Math.round(((v - 3.3) / 0.9) * 100)));
}
