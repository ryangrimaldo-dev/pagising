<script>
  import { get } from 'svelte/store';
  import { slide } from 'svelte/transition';
  import TopBar from '../components/TopBar.svelte';
  import Icon from '../components/Icon.svelte';
  import StopMap from '../components/StopMap.svelte';
  import Dialog from '../components/Dialog.svelte';
  import AlertsDialog from '../components/AlertsDialog.svelte';
  import { settings, routes, trip, reducedMotion } from '../lib/stores.js';
  import { startTrip } from '../lib/sim.js';
  import { STOPS, MODES } from '../lib/mock.js';
  import { fmtList, uid } from '../lib/format.js';
  import { t } from '../lib/i18n.js';
  import { onMount } from 'svelte';
  import { searchPlaces, makeStop, placeName } from '../lib/places.js';
  import { locateOnce } from '../lib/gps.js';

  let query = $state('');
  let stop = $state(null);
  let mode = $state('Bus');
  let alertMins = $state([...get(settings).alertMins]);
  let save = $state(true);
  let routeName = $state('');
  let pickOpen = $state(false);
  let alertsOpen = $state(false);
  let line = $state('');            // optional: the user's own line or route name
  let places = $state([]);          // online search results
  let searching = $state(false);
  let searchError = $state(false);
  let draft = $state(null);         // pin dropped on the map, not yet confirmed
  let timer;

  onMount(() => { locateOnce(); });

  const q = $derived(query.trim().toLowerCase());
  const results = $derived(q ? STOPS.filter((s) => `${s.name} ${s.line}`.toLowerCase().includes(q)).slice(0, 6) : []);
  const d = $derived($reducedMotion ? 0 : 180);

  function choose(s) {
    stop = s;
    mode = s.mode;
    query = s.name;
    line = s.pinned ? '' : s.line;
    places = [];
    pickOpen = false;
  }
  function onInput() {
    if (stop && query !== stop.name) stop = null;
    clearTimeout(timer);
    places = [];
    searchError = false;
    const text = query.trim();
    if (text.length < 3) return;
    timer = setTimeout(async () => {
      searching = true;
      try { places = await searchPlaces(text, mode); }
      catch (e) { if (e.name !== 'AbortError') searchError = true; }
      searching = false;
    }, 600);
  }
  async function dropPin(lat, lng) {
    draft = { ...makeStop({ name: 'Pinned stop', lat, lng, mode }), loading: true };
    const n = await placeName(lat, lng);
    if (draft && draft.lat === lat) draft = makeStop({ name: n.name, detail: n.detail, lat, lng, mode });
  }

  function start() {
    const chosen = { ...stop, mode, line: line.trim() || (stop.pinned ? mode : stop.line) };
    stop = chosen;
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
      {#if !places.length && !searching}
        <p class="empty small" role="status">{searchError ? 'Search needs mobile data. You can still pick a saved stop or drop a pin on the map.' : query.trim().length < 3 ? 'Keep typing to search all places…' : `No place found for “${query.trim()}”. Try another name or drop a pin on the map.`}</p>
      {/if}
    {/if}
    {#if searching}<p class="small muted" role="status">Searching places…</p>{/if}
    {#if places.length}
      <div class="list" role="listbox" aria-label="Places found" transition:slide={{ duration: d }}>
        {#each places as s (s.id)}
          <button class="row" role="option" aria-selected={stop?.id === s.id} onclick={() => choose(s)}>
            <span class="grow"><strong>{s.name}</strong><span class="small muted">{s.line} · about {s.km} km</span></span>
            {#if stop?.id === s.id}<span class="accent"><Icon name="check" size={20} stroke={2.4} /></span>{/if}
          </button>
        {/each}
      </div>
    {/if}
  {/if}

  <button class="link" onclick={() => { draft = null; pickOpen = true; }}>or pick on map</button>
  {#if stop}
    <StopMap selected={stop} pickable={false} height={140} />
    <p class="small muted">{stop.name}{stop.pinned ? '' : ` · ${stop.line}`}: check it’s the right stop</p>
  {/if}

  <h2 class="small muted" id="mode-l">{$t('How are you riding?')}</h2>
  <div class="chips" role="radiogroup" aria-labelledby="mode-l">
    {#each MODES as m}<button class="chip" role="radio" aria-checked={mode === m} onclick={() => (mode = m)}>{m}</button>{/each}
  </div>

  <label class="field">
    <span class="small muted">Line or route (optional)</span>
    <input bind:value={line} placeholder={mode === 'Bus' ? 'e.g. Cavite–PITX bus' : mode === 'Jeepney' ? 'e.g. Baclaran–Cubao jeep' : mode === 'MRT/LRT' ? 'e.g. LRT-1' : 'e.g. JAC Liner'} maxlength="40" />
  </label>

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
  {#if pickOpen}
    <StopMap selected={draft ?? stop} height={320} onpick={dropPin} onstop={(s) => (draft = s)} />
  {/if}
  <p class="small muted">
    {#if draft}<strong>{draft.name}</strong>{draft.loading ? ' · finding the place name…' : ` · ${draft.line}`}
    {:else}Tap where you get off to drop a pin, or tap a blue dot for a saved stop.{/if}
  </p>
  {#snippet actions()}
    <button class="btn" onclick={() => (pickOpen = false)}>Close</button>
    <button class="btn btn-primary" disabled={!draft || draft.loading} onclick={() => choose(draft)}>Use this stop</button>
  {/snippet}
</Dialog>

<AlertsDialog bind:open={alertsOpen} value={alertMins} onsave={(v) => (alertMins = v)} />

<style>
  .search { display: flex; align-items: center; gap: 10px; border: 1.5px solid var(--border-strong); border-radius: 12px; padding-left: 14px; background: var(--surface); color: var(--text-2); }
  .search:focus-within { outline: 3px solid var(--primary); outline-offset: 1px; }
  .search input { border: none; padding-left: 0; font-size: 1.0625rem; }
  .search input:focus-visible { outline: none; }
</style>
