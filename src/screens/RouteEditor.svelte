<script>
  import { slide } from 'svelte/transition';
  import TopBar from '../components/TopBar.svelte';
  import Icon from '../components/Icon.svelte';
  import Segmented from '../components/Segmented.svelte';
  import { routes, toast, reducedMotion } from '../lib/stores.js';
  import { back } from '../lib/router.js';
  import { STOPS, MODES } from '../lib/mock.js';
  import { uid } from '../lib/format.js';

  let how = $state('type'); // type | pin
  let name = $state('');
  let query = $state('');
  let stop = $state(null);
  let pin = $state(null); // { x, y } in %
  let pinName = $state('');
  let mode = $state('Bus');
  let minutes = $state('');
  let tried = $state(false);

  const d = $derived($reducedMotion ? 0 : 180);
  const q = $derived(query.trim().toLowerCase());
  const results = $derived(q ? STOPS.filter((s) => `${s.name} ${s.line}`.toLowerCase().includes(q)).slice(0, 6) : []);

  // A pinned spot becomes a stop; distance is measured from "you" at the map centre.
  const pinnedStop = $derived.by(() => {
    if (!pin) return null;
    const km = Math.max(0.5, Math.hypot(pin.x - 50, pin.y - 50) / 4);
    return { id: 'pin-' + uid(), name: pinName.trim() || 'Pinned spot', line: 'Pinned on map', mode, km: +km.toFixed(1), min: Math.round(km * 3 + 4), pinned: true, x: pin.x, y: pin.y };
  });
  const chosen = $derived(how === 'pin' ? pinnedStop : stop);
  const mins = $derived(Number(minutes) || chosen?.min || 0);
  const errors = $derived({
    stop: !chosen ? (how === 'pin' ? 'Tap the map to drop a pin' : 'Pick a stop from the list') : '',
    minutes: minutes !== '' && (!(Number(minutes) >= 1) || Number(minutes) > 600) ? 'Use 1 to 600 minutes' : ''
  });

  function choose(s) {
    stop = s;
    mode = s.mode;
    query = s.name;
    minutes = String(s.min);
  }
  function dropPin(e) {
    const r = e.currentTarget.getBoundingClientRect();
    pin = { x: +(((e.clientX - r.left) / r.width) * 100).toFixed(1), y: +(((e.clientY - r.top) / r.height) * 100).toFixed(1) };
    minutes = '';
  }
  function nudge(e) {
    const step = { ArrowLeft: [-4, 0], ArrowRight: [4, 0], ArrowUp: [0, -4], ArrowDown: [0, 4] }[e.key];
    if (!step) return;
    e.preventDefault();
    const p = pin ?? { x: 50, y: 50 };
    pin = { x: Math.min(98, Math.max(2, p.x + step[0])), y: Math.min(96, Math.max(4, p.y + step[1])) };
  }
  function save() {
    tried = true;
    if (errors.stop || errors.minutes) return;
    const s = chosen;
    const label = name.trim() || `To ${s.name}`;
    routes.update((l) => [{ id: uid(), name: label, stopId: s.id, stop: s, mode, via: s.pinned ? `${mode} · pinned` : mode === s.mode ? s.line.split(' · ')[0] : mode, minutes: mins }, ...l]);
    toast(`${label} saved`, 'ok');
    back('/');
  }
</script>

<section class="screen">
  <TopBar title="New route" fallback="/" />

  <label class="field">
    <span class="small muted">Route name</span>
    <input bind:value={name} placeholder={chosen ? `Home → ${chosen.name}` : 'Home → School'} maxlength="32" />
  </label>

  <h2 class="small muted" id="how-l">Where to</h2>
  <Segmented labelledby="how-l" bind:value={how} options={[{ id: 'type', label: 'Type a stop' }, { id: 'pin', label: 'Pin on map' }]} />

  {#if how === 'type'}
    <div class="search">
      <Icon name="search" />
      <input type="search" aria-label="Search stops" bind:value={query} oninput={() => stop && query !== stop.name && (stop = null)} placeholder="Station or stop name" autocomplete="off" />
    </div>
    {#if q}
      {#if results.length}
        <div class="list" role="listbox" aria-label="Matching stops" transition:slide={{ duration: d }}>
          {#each results as s (s.id)}
            <button class="row" role="option" aria-selected={stop?.id === s.id} onclick={() => choose(s)}>
              <span class="grow"><strong>{s.name}</strong><span class="small muted">{s.line} · saved offline</span></span>
              {#if stop?.id === s.id}<span class="accent"><Icon name="check" size={20} stroke={2.4} /></span>{/if}
            </button>
          {/each}
        </div>
      {:else}
        <p class="empty small">No saved stop matches “{query.trim()}”. Try “Pin on map” instead.</p>
      {/if}
    {/if}
  {:else}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class="pickmap"
      role="application"
      aria-label="Map. Click to drop a pin, or use arrow keys to move it"
      tabindex="0"
      onclick={dropPin}
      onkeydown={nudge}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <g stroke="var(--road)" stroke-width="2.4" fill="none"><path d="M10 0 L95 100" /><path d="M0 40 L100 20" /><path d="M0 85 L100 60" /><path d="M55 0 L45 100" /></g>
      </svg>
      <span class="you" aria-hidden="true">You</span>
      {#if pin}
        <span class="drop" style="left:{pin.x}%;top:{pin.y}%" aria-hidden="true"><Icon name="pin" size={34} stroke={2.2} /></span>
      {/if}
      {#if !pin}<span class="hint" aria-hidden="true">Tap anywhere to drop a pin</span>{/if}
    </div>
    {#if pin}
      <label class="field" transition:slide={{ duration: d }}>
        <span class="small muted">Name this place</span>
        <input bind:value={pinName} placeholder="Tita’s house, office gate…" maxlength="28" />
      </label>
      <p class="small muted" aria-live="polite">About {pinnedStop.km} km away · roughly {pinnedStop.min} min</p>
    {/if}
  {/if}
  {#if tried && errors.stop}<p class="error small" role="alert">{errors.stop}</p>{/if}

  <h2 id="mode-l" class="small muted">How are you riding?</h2>
  <div class="chips" role="radiogroup" aria-labelledby="mode-l">
    {#each MODES as m}<button class="chip" role="radio" aria-checked={mode === m} onclick={() => (mode = m)}>{m}</button>{/each}
  </div>

  <label class="field">
    <span class="small muted">Usual ride time (minutes)</span>
    <input type="text" inputmode="numeric" bind:value={minutes} placeholder={chosen ? String(chosen.min) : '30'} aria-invalid={!!errors.minutes} />
  </label>
  {#if errors.minutes}<p class="error small" role="alert">{errors.minutes}</p>{/if}

  <div class="bottom">
    <button class="btn btn-primary btn-lg" onclick={save}>Save route</button>
  </div>
</section>

<style>
  .search { display: flex; align-items: center; gap: 10px; border: 1.5px solid var(--border-strong); border-radius: 14px; padding-left: 14px; background: var(--surface); color: var(--text-2); }
  .search:focus-within { outline: 3px solid var(--primary); outline-offset: 1px; }
  .search input { border: none; padding-left: 0; }
  .search input:focus-visible { outline: none; }
  .pickmap { position: relative; height: clamp(220px, 60vw, 300px); background: var(--map); border-radius: var(--radius); overflow: hidden; cursor: crosshair; border: 1.5px dashed var(--border-strong); }
  .pickmap:focus-visible { outline: 3px solid var(--primary); outline-offset: 2px; }
  .pickmap svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .you { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); background: var(--primary); color: var(--on-primary); font-size: 0.75rem; font-weight: 700; padding: 3px 8px; border-radius: 999px; }
  .drop { position: absolute; transform: translate(-50%, -100%); color: var(--danger); animation: drop 0.3s cubic-bezier(0.3, 1.5, 0.5, 1); pointer-events: none; }
  .hint { position: absolute; left: 50%; bottom: 12px; transform: translateX(-50%); background: color-mix(in srgb, var(--surface) 90%, transparent); padding: 5px 12px; border-radius: 999px; font-size: 0.8125rem; white-space: nowrap; }
  @keyframes drop { from { transform: translate(-50%, -160%); opacity: 0; } }
</style>
