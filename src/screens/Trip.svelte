<script>
  import { onMount } from 'svelte';
  import Icon from '../components/Icon.svelte';
  import MapView from '../components/MapView.svelte';
  import Dialog from '../components/Dialog.svelte';
  import { trip, tags, settings, statusOf } from '../lib/stores.js';
  import { navigate } from '../lib/router.js';
  import { endTrip } from '../lib/sim.js';
  import { fmtTime } from '../lib/format.js';
  import { t } from '../lib/i18n.js';

  const tr = $derived($trip);
  const mins = $derived(tr ? Math.ceil(tr.remainingSec / 60) : 0);
  const progress = $derived(tr ? 1 - tr.remainingSec / tr.totalSec : 0);
  const km = $derived(tr ? (tr.kmLeft ?? (tr.km * tr.remainingSec) / tr.totalSec).toFixed(1) : 0);
  const eta = $derived(tr ? fmtTime(Date.now() + tr.remainingSec * 1000) : '');
  const lostCount = $derived($tags.filter((x) => statusOf(x) === 'out').length);
  let endOpen = $state(false);

  // Real Screen Wake Lock where supported, so the phone stays on during the ride.
  onMount(() => {
    let lock;
    navigator.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => {});
    return () => lock?.release().catch(() => {});
  });
</script>

{#if tr}
  <section class="screen">
    <header class="trip-top">
      <button class="icon-btn" onclick={() => navigate('/')} aria-label="Back to home. The trip keeps running"><Icon name="chevronLeft" size={26} /></button>
      <span class="small muted">Trip keeps running if you leave this screen</span>
    </header>
    {#if lostCount}
      <p class="banner danger slim"><Icon name="alert" size={20} /> <span><strong class="inline">{lostCount} tag out of range</strong></span></p>
    {:else if !$tags.length}
      <p class="banner warn slim"><Icon name="watch" size={20} /> <span><strong class="inline">Wristband on</strong> · add a tag to protect your things</span></p>
    {:else}
      <p class="banner ok slim"><Icon name="checkCircle" size={20} /> <span><strong class="inline">Protected</strong> · wristband and {$tags.length} tags</span></p>
    {/if}

    <div class="hero trip-hero">
      <div class="count">
        <h1><span class="big" aria-live="polite">{mins} min</span> <span class="to">to {tr.stopName}</span></h1>
        <p class="muted">{tr.line}</p>
      </div>
      <div class="frost-tiles">
        <div class="frost"><span>Left</span><strong>{km} km</strong></div>
        <div class="frost"><span>Arrive</span><strong>{eta}</strong></div>
        <div class="frost"><span>Alerts sent</span><strong>{tr.fired}/{tr.alertMins.length}</strong></div>
      </div>
    </div>

    <MapView variant="route" {progress} height={210} label="Map: you, your route and your stop" />

    <div class="card">
      <h2 class="small muted">{$t('Wake-up alerts')}</h2>
      <ol class="stages">
        {#each tr.alertMins as m, i}
          {@const st = i < tr.fired ? 'done' : i === tr.fired ? 'next' : 'later'}
          <li class={st}>
            <span class="dot" aria-hidden="true"></span>
            <span>{m} min{st === 'done' ? ' ✓' : st === 'next' ? ' (next)' : ''}</span>
            <span class="sr-only">{st === 'done' ? 'sent' : st === 'next' ? 'next alert' : 'later'}</span>
          </li>
        {/each}
      </ol>
    </div>

    <div class="row-between">
      <span>Wristband detects: <strong>{$settings.band.posture}</strong></span>
      <span class:awake={tr.awake} class="muted">{tr.awake ? 'Awake ✓' : 'Not yet awake'}</span>
    </div>

    <p class="note"><Icon name="phone" size={20} /> Keep this screen on during your trip</p>

    <div class="bottom">
      <button class="btn btn-lg btn-danger" onclick={() => (endOpen = true)}>{$t('End trip')}</button>
    </div>
  </section>

  <Dialog bind:open={endOpen} title="End this trip?">
    <p class="muted">Wake-up alerts for {tr.stopName} will stop. Your tags stay protected.</p>
    {#snippet actions()}
      <button class="btn" onclick={() => (endOpen = false)}>Keep riding</button>
      <button class="btn btn-danger-solid" onclick={() => { endOpen = false; endTrip(); }}>End trip</button>
    {/snippet}
  </Dialog>
{:else}
  <section class="screen">
    <h1>No trip running</h1>
    <p class="lead">Plan a trip and Pagising will wake you before your stop.</p>
    <button class="btn btn-primary btn-lg" onclick={() => navigate('/plan', { replace: true })}>Plan a trip</button>
    <button class="link center" onclick={() => navigate('/', { replace: true })}>Back to home</button>
  </section>
{/if}

<style>
  .trip-top { display: flex; align-items: center; gap: 6px; margin: -8px 0 -6px -10px; }
  .slim { padding: 8px 14px; font-size: 0.9375rem; }
  .slim .inline { display: inline; font-size: inherit; }
  .count { text-align: center; display: flex; flex-direction: column; gap: 4px; }
  .count h1 { display: flex; flex-direction: column; font-weight: 600; }
  .trip-hero { display: flex; flex-direction: column; gap: 18px; padding-top: 28px; }
  .big { font-size: clamp(4rem, 18vw, 5.5rem); font-weight: 800; line-height: 1; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
  .to { font-size: 1.5rem; font-weight: 500; }
  .stages { display: grid; grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); margin-top: 10px; text-align: center; }
  .stages li { display: flex; flex-direction: column; align-items: center; gap: 6px; font-size: 0.9375rem; color: var(--text-2); }
  .dot { width: 26px; height: 26px; border-radius: 50%; border: 2px solid var(--border-strong); transition: all 0.3s; }
  .done { color: var(--text); }
  .done .dot { background: var(--text); border-color: var(--text); }
  .next { color: var(--primary); font-weight: 600; }
  .next .dot { border-color: var(--primary); border-width: 3px; border-radius: 8px; }
  .awake { color: var(--ok); font-weight: 600; }
  .note {
    display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: var(--radius);
    background: var(--warn-soft); border: 1.5px dashed var(--warn-border); color: var(--text);
  }
  .note :global(svg) { color: var(--warn); }
</style>
