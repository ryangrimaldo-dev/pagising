<script>
  import { get } from 'svelte/store';
  import { fly, slide } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import Stepper from '../components/Stepper.svelte';
  import TopBar from '../components/TopBar.svelte';
  import SignalBars from '../components/SignalBars.svelte';
  import Icon from '../components/Icon.svelte';
  import { settings, tags, toast, addLog, reducedMotion } from '../lib/stores.js';
  import { navigate } from '../lib/router.js';
  import { scanTags } from '../lib/sim.js';
  import { TAG_KINDS } from '../lib/mock.js';
  import { uid } from '../lib/format.js';

  let { mode = 'onboard' } = $props();

  const nextKind = () => {
    const used = new Set(get(tags).map((t) => t.kind));
    return ['Wallet', 'Bag', 'Keys'].find((k) => !used.has(k)) ?? 'Other';
  };

  let scanning = $state(false);
  let scanned = $state(false);
  let devices = $state([]);
  let selected = $state(null);
  let kind = $state(nextKind());
  let custom = $state('');
  let added = $state([]);

  const name = $derived(kind === 'Other' ? custom.trim() : kind);
  const d = $derived($reducedMotion ? 0 : 200);

  async function scan() {
    scanning = true;
    selected = null;
    devices = [];
    const found = await scanTags();
    devices = found.sort((a, b) => b.signal - a.signal);
    selected = devices[0]?.id ?? null;
    scanning = false;
    scanned = true;
  }

  function add() {
    const dev = devices.find((x) => x.id === selected);
    if (!dev || !name) return;
    const tag = { id: uid(), name, kind, base: dev.signal, signal: dev.signal, lost: false, lostAt: null, distance: 'normal' };
    tags.update((l) => [...l, tag]);
    addLog({ type: 'alert', title: `${name} tag added`, detail: 'Paired with your wristband' });
    added = [...added, tag];
    devices = devices.filter((x) => x.id !== selected);
    selected = null;
    toast(`${name} added`, 'ok');
    kind = nextKind();
    custom = '';
  }

  function finish() {
    if (mode === 'onboard') {
      settings.update((s) => ({ ...s, onboarded: true }));
      navigate('/', { replace: true });
    } else navigate('/tags', { replace: true });
  }
</script>

<section class="screen">
  {#if mode === 'onboard'}
    <Stepper step={3} />
    <h1>Add your tags</h1>
  {:else}
    <TopBar title="Add a tag" fallback="/tags" />
  {/if}
  <p class="lead">Hold one tag close to the wristband, then scan.</p>

  <button class="btn btn-lg" onclick={scan} disabled={scanning}>
    {#if scanning}<span class="spinner"></span> Scanning…{:else}{scanned ? 'Scan again' : 'Scan for tags'}{/if}
  </button>

  {#if scanned && !scanning}
    {#if devices.length}
      <p class="muted" id="found-l">Found nearby · strongest first</p>
      <div class="list" role="radiogroup" aria-labelledby="found-l" in:fly={{ y: 8, duration: d }}>
        {#each devices as dev, i (dev.id)}
          <button class="row" role="radio" aria-checked={selected === dev.id} onclick={() => (selected = dev.id)} animate:flip={{ duration: d }} out:slide={{ duration: d }}>
            <span class="grow">
              <strong>{dev.name}</strong>
              {#if i === 0 && dev.name === 'PAGISING-TAG'}<span class="small accent">Closest, probably your tag</span>{/if}
            </span>
            <SignalBars level={dev.signal} />
          </button>
        {/each}
      </div>
    {:else}
      <p class="empty">No more tags nearby. Hold the next tag close and scan again.</p>
    {/if}
  {/if}

  {#if selected}
    <div class="card stack-sm" transition:fly={{ y: 8, duration: d }}>
      <h2 class="h3" id="name-l">Name this tag</h2>
      <div class="chips" role="radiogroup" aria-labelledby="name-l">
        {#each TAG_KINDS as k}
          <button class="chip" role="radio" aria-checked={kind === k} onclick={() => (kind = k)}>{k}</button>
        {/each}
      </div>
      {#if kind === 'Other'}
        <label class="field" transition:slide={{ duration: d }}>
          <span class="small muted">Tag name</span>
          <input bind:value={custom} placeholder="Umbrella, laptop…" maxlength="20" />
        </label>
      {/if}
      <button class="btn" disabled={!name} onclick={add}>Add tag</button>
    </div>
  {/if}

  {#if added.length}
    <p class="added" aria-live="polite"><Icon name="check" size={18} stroke={2.4} /> Added: {added.map((t) => t.name).join(', ')}</p>
  {/if}

  <div class="bottom">
    <button class="btn btn-primary btn-lg" onclick={finish} disabled={!added.length}>Done</button>
    {#if mode === 'onboard'}<button class="link center" onclick={finish}>Skip for now</button>{/if}
  </div>
</section>

<style>
  .added { display: flex; align-items: center; gap: 6px; color: var(--ok); font-weight: 500; }
</style>
