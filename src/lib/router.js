import { writable } from 'svelte/store';

const read = () => decodeURI(location.hash.replace(/^#/, '')) || '/';

export const path = writable(read());
export const direction = writable(1);
let depth = 0;

window.addEventListener('hashchange', () => path.set(read()));

export function navigate(to, { replace = false } = {}) {
  direction.set(1);
  if (replace) {
    history.replaceState(null, '', '#' + to);
    path.set(read());
  } else {
    depth++;
    location.hash = to;
  }
}

export function back(fallback = '/') {
  if (depth > 0) {
    depth--;
    direction.set(-1);
    history.back();
  } else {
    navigate(fallback, { replace: true });
    direction.set(-1);
  }
}

export function match(pattern, p) {
  const a = pattern.split('/');
  const b = p.split('/');
  if (a.length !== b.length) return null;
  const params = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = b[i];
    else if (a[i] !== b[i]) return null;
  }
  return params;
}
