<script>
  import { get } from 'svelte/store';
  import { slide } from 'svelte/transition';
  import TopBar from '../components/TopBar.svelte';
  import Icon from '../components/Icon.svelte';
  import MapView from '../components/MapView.svelte';
  import Dialog from '../components/Dialog.svelte';
  import AlertsDialog from '../components/AlertsDialog.svelte';
  import { settings, routes, trip, reducedMotion } from '../lib/stores.js';
  import { startTrip } from '../lib/sim.js';
  import { STOPS, MODES } from '../lib/mock.js';
  import { fmtList, uid } from '../lib/format.js';
  import { t } from '../lib/i18n.js';

  let query = $state('');
  let stop = $state(null);
  let mode = $state('Bus');
  let alertMins = $state([...get(settings).alertMins]);
  let save = $state(true);
  let routeName = $state('');
  let pickOpen = $state(false);
  let alertsOpen = $state(false);

  const q = $derived(query.trim().toLowerCase());
  const results = $derived(q ? STOPS.filter((s) => `${s.name} ${s.line}`.toLowerCase().includes(q)).slice(0, 6) : []);
  const d = $derived($reducedMotion ? 0 : 180);

  function choose(s) {
    stop = s;
    mode = s.mode;
    query = s.name;
    pickOpen = false;
  }
  function onInput() {
    if (stop && query !== stop.name) stop = null;
  }

  function start() {
    if (save && !$routes.some((r) => r.stopId === stop.id && r.mode === mode)) {
      routes.update((l) => [
        { id: uid(), name: routeName.trim() || `To ${stop.name}`, stopId: stop.id, stop, mode, via: mode === stop.mode ? stop.line.split(' · ')[0] : mode, minutes: stop.min },
        ...l
      ]);
    }
    settings.update((s) => ({ ...s, alertMins }));
    startTrip({ stop, mode, alertMins });
  }
</script>

<section class="screen">
  <TopBar title={$t('Where are you getting off?')} fallback="/" />

  <label class="small muted" for="stop-q">{$t('Search for your stop')}</label>
  <div class="search">
    <Icon name="search" />
    <input id="stop-q" type="search" bind:value={query} oninput={onInput} placeholder="Station or stop name" autocomplete="off" />
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
      <p class="empty small" role="status">No saved stop matches “{query.trim()}”. Try a station like Ayala or Cubao.</p>
    {/if}
  {/if}

  <button class="link" onclick={() => (pickOpen = true)}>or pick on map</button>
  <MapView
    variant="pin"
    height={120}
    tone={stop ? 'primary' : 'muted'}
    label={stop ? `${stop.name} · ${stop.line}: check it’s the right stop` : 'Pick a stop to preview it here'} />

  <h2 class="small muted" id="mode-l">{$t('How are you riding?')}</h2>
  <div class="chips" role="radiogroup" aria-labelledby="mode-l">
    {#each MODES as m}<button class="chip" role="radio" aria-checked={mode === m} onclick={() => (mode = m)}>{m}</button>{/each}
  </div>

  <div class="card row-between">
    <div><span class="small muted">{$t('Wake-up alerts')}</span><strong class="block">{fmtList(alertMins)} min before</strong></div>
    <button class="link" onclick={() => (alertsOpen = true)}>Edit</button>
  </div>

  <label class="check-row"><span>{$t('Save this route')}</span><input type="checkbox" bind:checked={save} /></label>
  {#if save}
    <label class="field" transition:slide={{ duration: d }}>
      <span class="small muted">Route name (optional)</span>
      <input bind:value={routeName} placeholder={stop ? `Home → ${stop.name}` : 'Home → Work'} maxlength="32" />
    </label>
  {/if}

  <div class="bottom">
    {#if $trip}<p class="small muted center">A trip is already running. End it first.</p>
    {:else if !stop}<p class="small muted center">Choose a stop to start</p>{/if}
    <button class="btn btn-primary btn-lg" disabled={!stop || !!$trip} onclick={start}>{$t('Start trip')}</button>
  </div>
</section>

<Dialog bind:open={pickOpen} title="Pick your stop">
  <div class="pick">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <g stroke="var(--road)" stroke-width="2.5" fill="none"><path d="M10 0 L95 100" /><path d="M0 40 L100 20" /><path d="M0 85 L100 60" /><path d="M55 0 L45 100" /></g>
    </svg>
    {#each STOPS.filter((s) => s.x !== undefined) as s (s.id)}
      <button class="pin-btn" class:sel={stop?.id === s.id} style="left:{s.x}%;top:{s.y}%" onclick={() => choose(s)} aria-label="{s.name}, {s.line}">
        <Icon name="pin" size={22} stroke={2.2} /><span>{s.name}</span>
      </button>
    {/each}
  </div>
  <p class="small muted">Stops saved for offline use. Long trips like provincial buses are in search.</p>
  {#snippet actions()}<button class="btn" onclick={() => (pickOpen = false)}>Close</button>{/snippet}
</Dialog>

<AlertsDialog bind:open={alertsOpen} value={alertMins} onsave={(v) => (alertMins = v)} />

<style>
  .search { display: flex; align-items: center; gap: 10px; border: 1.5px solid var(--border-strong); border-radius: 12px; padding-left: 14px; background: var(--surface); color: var(--text-2); }
  .search:focus-within { outline: 3px solid var(--primary); outline-offset: 1px; }
  .search input { border: none; padding-left: 0; font-size: 1.0625rem; }
  .search input:focus-visible { outline: none; }
  .pick { position: relative; height: 320px; background: var(--map); border-radius: 12px; overflow: hidden; }
  .pick svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .pin-btn {
    position: absolute; transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center;
    background: none; border: none; color: var(--text-2); font: inherit; font-size: 0.75rem; cursor: pointer; padding: 2px 4px; border-radius: 8px;
  }
  .pin-btn span { background: color-mix(in srgb, var(--surface) 90%, transparent); padding: 1px 5px; border-radius: 6px; white-space: nowrap; }
  .pin-btn:hover, .pin-btn.sel { color: var(--primary); font-weight: 600; z-index: 2; }
</style>
