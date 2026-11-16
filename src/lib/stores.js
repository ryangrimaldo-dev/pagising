import { writable, readable } from 'svelte/store';
import { DEFAULT_ROUTES, seedLog } from './mock.js';
import { uid } from './format.js';

const PREFIX = 'pagising.v1.';

function persisted(key, initial) {
  let value = structuredClone(initial);
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw !== null) value = JSON.parse(raw);
  } catch {
    /* storage unavailable: start fresh */
  }
  const store = writable(value);
  store.subscribe((v) => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(v));
    } catch {
      /* ignore */
    }
  });
  return store;
}

export const DEFAULT_SETTINGS = {
  lang: 'en',
  theme: 'system',
  onboarded: false,
  perms: { location: false, bluetooth: false, notifications: false },
  band: { connected: false, battery: 82, posture: 'Sitting' },
  strength: 60,
  alertMins: [10, 5, 1],
  failNextPairing: false
};

export const settings = persisted('settings', DEFAULT_SETTINGS);
export const tags = persisted('tags', []);
export const routes = persisted('routes', DEFAULT_ROUTES);
export const log = persisted('log', seedLog());
export const trip = persisted('trip', null);
export const alert = persisted('alert', null);

export const toasts = writable([]);
export function toast(message, tone = 'info') {
  const id = uid();
  toasts.update((t) => [...t, { id, message, tone }]);
  setTimeout(() => toasts.update((t) => t.filter((x) => x.id !== id)), 3400);
}

export function addLog(entry) {
  log.update((l) => [{ id: uid(), at: Date.now(), ...entry }, ...l].slice(0, 200));
}

export function resetAll() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
  location.hash = '/onboard/1';
  location.reload();
}

export const now = readable(Date.now(), (set) => {
  const iv = setInterval(() => set(Date.now()), 15000);
  return () => clearInterval(iv);
});

export const reducedMotion = readable(false, (set) => {
  if (!window.matchMedia) return;
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  set(mq.matches);
  const h = (e) => set(e.matches);
  mq.addEventListener('change', h);
  return () => mq.removeEventListener('change', h);
});

export const systemDark = readable(false, (set) => {
  if (!window.matchMedia) return;
  const mq = matchMedia('(prefers-color-scheme: dark)');
  set(mq.matches);
  const h = (e) => set(e.matches);
  mq.addEventListener('change', h);
  return () => mq.removeEventListener('change', h);
});

export function statusOf(tag) {
  if (tag.lost || tag.signal === 0) return 'out';
  return tag.signal >= 3 ? 'near' : 'far';
}
