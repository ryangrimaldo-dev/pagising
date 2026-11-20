<script>
  import { flip } from 'svelte/animate';
  import Icon from '../components/Icon.svelte';
  import Dialog from '../components/Dialog.svelte';
  import Segmented from '../components/Segmented.svelte';
  import Meter from '../components/Meter.svelte';
  import Mascot from '../components/Mascot.svelte';
  import AlertsDialog from '../components/AlertsDialog.svelte';
  import { settings, tags, routes, trip, toast, addLog, resetAll, reducedMotion } from '../lib/stores.js';
  import { navigate } from '../lib/router.js';
  import { connectBand, disconnectBand, buzz, triggerTheft, hwAvailable } from '../lib/sim.js';
  import { fmtList, fmtDur } from '../lib/format.js';
  import { t } from '../lib/i18n.js';

  const band = $derived($settings.band);
  let connecting = $state(false);
  let alertsOpen = $state(false);
  let resetOpen = $state(false);

  const set = (patch) => settings.update((s) => ({ ...s, ...patch }));
  const setBand = (patch) => settings.update((s) => ({ ...s, band: { ...s.band, ...patch } }));

  async function toggleBand() {
    if (band.connected) {
      disconnectBand();
      buzz('lost', 'Wristband disconnected');
      addLog({ type: 'alert', title: 'Wristband disconnected', detail: 'You disconnected it in Settings' });
      return;
    }
    connecting = true;
    try {
      await connectBand();
      toast('Wristband connected', 'ok');
    } catch {
      toast('Wristband not found. Is it charged and nearby?', 'danger');
    }
    connecting = false;
  }

  function lowBattery() {
    setBand({ battery: 15 });
    buzz('battery');
    addLog({ type: 'alert', title: 'Wristband battery low', detail: '15% left · charge it tonight' });
    toast('Wristband battery is at 15%');
  }

  function theft() {
    const pick = $tags.find((x) => x.kind === 'Bag' && !x.lost) ?? $tags.find((x) => !x.lost);
    if (pick) triggerTheft(pick.id);
  }

  function removeRoute(r) {
    routes.update((l) => l.filter((x) => x.id !== r.id));
    toast(`${r.name} removed`);
  }
</script>

<section class="screen">
  <h1>{$t('Settings')}</h1>

  <div class="hero band-hero">
    <Mascot mood={band.connected ? (band.battery < 20 ? 'worried' : 'happy') : 'worried'} size={84} interactive={false} />
    <div class="grow">
      <strong class="h3">Pagising wristband</strong>
      <span class="small muted">{band.connected ? `Battery ${band.battery}%` : 'Not connected'}</span>
      {#if band.connected}<Meter value={band.battery / 100} label="Battery" min="0" max="100%" />{/if}
    </div>
  </div>

  <h2 class="section-label">{$t('Wristband')}</h2>
  <div class="list">
    <div class="row">
      <Icon name="watch" />
      <span class="grow"><strong>Pagising wristband</strong><span class="small muted">{band.connected ? `Connected · battery ${band.battery}%` : 'Not connected'}</span></span>
      <button class="btn btn-sm" onclick={toggleBand} disabled={connecting}>{connecting ? 'Connecting…' : band.connected ? 'Disconnect' : 'Connect'}</button>
    </div>
    <button class="row" onclick={() => navigate('/settings/vibration')}>
      <Icon name="bell" />
      <span class="grow"><strong>Vibration</strong><span class="small muted">Strength {$settings.strength}% · feel each pattern</span></span>
      <Icon name="chevronRight" size={20} />
    </button>
  </div>

  <h2 class="section-label">Trips</h2>
  <div class="list">
    <div class="row">
      <Icon name="bell" />
      <span class="grow"><strong>{$t('Wake-up alerts')}</strong><span class="small muted">{fmtList($settings.alertMins)} min before your stop</span></span>
      <button class="link" onclick={() => (alertsOpen = true)}>Edit</button>
    </div>
  </div>
  {#if $routes.length}
    <ul class="list" aria-label="Saved routes">
      {#each $routes as r (r.id)}
        <li class="row" animate:flip={{ duration: $reducedMotion ? 0 : 200 }}>
          <Icon name="route" />
          <span class="grow"><strong>{r.name}</strong><span class="small muted">{r.via} · about {fmtDur(r.minutes)}</span></span>
          <button class="icon-btn" aria-label="Remove route {r.name}" onclick={() => removeRoute(r)}><Icon name="x" size={20} /></button>
        </li>
      {/each}
    </ul>
  {/if}

  <h2 class="section-label" id="theme-l">Appearance</h2>
  <Segmented
    labelledby="theme-l"
    value={$settings.theme ?? 'system'}
    onchange={(v) => set({ theme: v })}
    options={[{ id: 'system', label: 'System' }, { id: 'light', label: 'Light' }, { id: 'dark', label: 'Dark' }]} />

  <h2 class="section-label" id="lang-l">Language</h2>
  <Segmented
    labelledby="lang-l"
    value={$settings.lang}
    onchange={(v) => set({ lang: v })}
    options={[{ id: 'en', label: 'English' }, { id: 'fil', label: 'Filipino' }]} />

  <h2 class="section-label">Wristband mode</h2>
  <div class="list">
    <label class="row check">
      <Icon name="bluetooth" />
      <span class="grow"><strong>Use the real wristband</strong><span class="small muted">{hwAvailable ? 'Bluetooth and GPS instead of the demo' : 'Needs Bluetooth. On iPhone, open this app in Bluefy'}</span></span>
      <input type="checkbox" disabled={!hwAvailable} checked={!!$settings.hw} onchange={(e) => { disconnectBand(); set({ hw: e.currentTarget.checked }); }} />
    </label>
  </div>

  <h2 class="section-label">Try it out</h2>
  <p class="small muted">These buttons act out events that would come from the wristband.</p>
  <div class="list">
    <button class="row" onclick={theft} disabled={!$tags.some((x) => !x.lost)}>
      <Icon name="bagAlert" />
      <span class="grow"><strong>Simulate possible theft</strong><span class="small muted">{$tags.length ? 'Moves your bag out of range' : 'Add a tag first'}</span></span>
    </button>
    <button class="row" onclick={lowBattery} disabled={!band.connected}>
      <Icon name="alert" />
      <span class="grow"><strong>Simulate low battery</strong><span class="small muted">Two short buzzes</span></span>
    </button>
    <label class="row check">
      <Icon name="bluetooth" />
      <span class="grow"><strong>Fail the next pairing</strong><span class="small muted">Shows the “not found” screen once</span></span>
      <input type="checkbox" checked={$settings.failNextPairing} onchange={(e) => set({ failNextPairing: e.currentTarget.checked })} />
    </label>
    <button class="row" onclick={() => (resetOpen = true)}>
      <Icon name="x" />
      <span class="grow"><strong class="error">Reset demo data</strong><span class="small muted">Start again from setup</span></span>
    </button>
  </div>
  <p class="small muted">Everything stays on this device. Nothing is sent anywhere.</p>
</section>

<AlertsDialog bind:open={alertsOpen} value={$settings.alertMins} onsave={(v) => { set({ alertMins: v }); toast('Wake-up alerts saved', 'ok'); }} />

<Dialog bind:open={resetOpen} title="Reset demo data?">
  <p class="muted">Tags, routes, the log and settings go back to the start{$trip ? ', and the current trip ends' : ''}.</p>
  {#snippet actions()}
    <button class="btn" onclick={() => (resetOpen = false)}>Cancel</button>
    <button class="btn btn-danger-solid" onclick={resetAll}>Reset</button>
  {/snippet}
</Dialog>

<style>
  .row :global(svg) { flex-shrink: 0; }
  .row > :global(svg:first-child) { color: var(--text-2); }
  button.row:disabled { opacity: 0.5; cursor: not-allowed; background: none; }
  .check { cursor: pointer; }
  .band-hero { display: flex; align-items: center; gap: 16px; }
  .band-hero .grow { gap: 4px; }
</style>
