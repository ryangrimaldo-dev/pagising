<script>
  import { slide } from 'svelte/transition';
  import Icon from '../components/Icon.svelte';
  import Dialog from '../components/Dialog.svelte';
  import Calendar from '../components/Calendar.svelte';
  import Segmented from '../components/Segmented.svelte';
  import { log, toast, reducedMotion } from '../lib/stores.js';
  import { fmtTime, dayKey } from '../lib/format.js';
  import { t } from '../lib/i18n.js';

  const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'trip', label: 'Trips' },
    { id: 'alert', label: 'Alerts' }
  ];
  let filter = $state('all');
  let day = $state(dayKey(Date.now()));
  let clearOpen = $state(false);

  const marks = $derived.by(() => {
    const m = {};
    for (const e of $log) {
      const k = dayKey(e.at);
      m[k] ??= { trip: false, alert: false };
      m[k][e.type] = true;
    }
    return m;
  });
  const items = $derived($log.filter((e) => dayKey(e.at) === day && (filter === 'all' || e.type === filter)));
  const dayTitle = $derived.by(() => {
    const [y, m, d] = day.split('-').map(Number);
    const k = dayKey(Date.now());
    if (day === k) return 'Today';
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  });

  function clear() {
    log.set([]);
    clearOpen = false;
    toast('Log cleared');
  }
</script>

<section class="screen log">
  <h1>{$t('Log')}</h1>
  <Calendar bind:selected={day} {marks} />

  <h2 class="section-label">{dayTitle}</h2>
  {#if items.length}
    <ul class="list">
      {#each items as e (e.id)}
        <li class="row" transition:slide={{ duration: $reducedMotion ? 0 : 180 }}>
          <span class="ic {e.type}"><Icon name={e.type === 'trip' ? 'route' : 'bell'} size={20} /></span>
          <span class="grow"><strong>{e.title}</strong><span class="small muted">{e.detail}</span></span>
          <time class="small muted" datetime={new Date(e.at).toISOString()}>{fmtTime(e.at)}</time>
        </li>
      {/each}
    </ul>
  {:else}
    <div class="empty">
      <p><strong>Nothing on this day</strong></p>
      <p>{filter === 'alert' ? 'No alerts.' : filter === 'trip' ? 'No trips.' : 'Pick a day with a dot to see what happened.'}</p>
    </div>
  {/if}

  <div class="actionbar">
    <div class="ab-inner">
      <div class="grow-seg"><Segmented options={FILTERS} bind:value={filter} label="Show" /></div>
      <button class="btn btn-sm btn-danger" onclick={() => (clearOpen = true)} disabled={!$log.length}>Clear</button>
    </div>
  </div>
</section>

<Dialog bind:open={clearOpen} title="Clear the log?">
  <p class="muted">This removes every trip and alert on this phone. It can’t be undone.</p>
  {#snippet actions()}
    <button class="btn" onclick={() => (clearOpen = false)}>Cancel</button>
    <button class="btn btn-danger-solid" onclick={clear}>Clear log</button>
  {/snippet}
</Dialog>

<style>
  .log { padding-bottom: 76px; }
  .ic { display: inline-grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; }
  .ic.trip { background: var(--primary-soft); color: var(--primary); }
  .ic.alert { background: var(--danger-soft); color: var(--danger); }
  time { white-space: nowrap; font-variant-numeric: tabular-nums; }
  .empty p + p { margin-top: 4px; }
  .actionbar {
    position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(66px + env(safe-area-inset-bottom)); width: 100%; max-width: 480px; z-index: 9;
    padding: 10px 16px; background: color-mix(in srgb, var(--bg) 88%, transparent); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    border-top: 1px solid var(--border);
  }
  .ab-inner { display: flex; gap: 10px; align-items: center; }
  .grow-seg { flex: 1; }
  @media (min-width: 640px) { .actionbar { max-width: 600px; } }
  @media (min-width: 960px) {
    .actionbar { position: sticky; bottom: 0; left: auto; transform: none; max-width: none; padding: 12px 0; margin-top: auto; border-top: 1px solid var(--border); }
    .log { padding-bottom: 0; }
  }
</style>
