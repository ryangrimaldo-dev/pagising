<script>
  import TopBar from '../components/TopBar.svelte';
  import Icon from '../components/Icon.svelte';
  import MapView from '../components/MapView.svelte';
  import SignalBars from '../components/SignalBars.svelte';
  import Dialog from '../components/Dialog.svelte';
  import Segmented from '../components/Segmented.svelte';
  import Meter from '../components/Meter.svelte';
  import { tags, toast, addLog, statusOf } from '../lib/stores.js';
  import { navigate } from '../lib/router.js';
  import { recoverTag } from '../lib/sim.js';
  import { fmtTime } from '../lib/format.js';

  let { params } = $props();
  const tag = $derived($tags.find((x) => x.id === params.id));
  const st = $derived(tag ? statusOf(tag) : null);
  const label = $derived({ near: 'Near', far: 'Far', out: 'Out of range' }[st]);

  const DIST = [
    { id: 'close', label: 'Close', hint: 'Buzzes when it is about 2 m away. Best for crowded trains.' },
    { id: 'normal', label: 'Normal', hint: 'Buzzes at about 5 m. Good for most rides.' },
    { id: 'far', label: 'Far', hint: 'Buzzes at about 10 m. Fewer alerts if your bag is in the rack.' }
  ];

  let renameOpen = $state(false);
  let removeOpen = $state(false);
  let draft = $state('');

  const update = (patch) => tags.update((l) => l.map((x) => (x.id === tag.id ? { ...x, ...patch } : x)));
  function rename(e) {
    e.preventDefault();
    const n = draft.trim();
    if (!n) return;
    update({ name: n });
    renameOpen = false;
    toast('Name saved', 'ok');
  }
  function remove() {
    const n = tag.name;
    tags.update((l) => l.filter((x) => x.id !== tag.id));
    addLog({ type: 'alert', title: `${n} tag removed`, detail: 'Unpaired from your wristband' });
    removeOpen = false;
    toast(`${n} removed`);
    navigate('/tags', { replace: true });
  }
  const place = $derived(tag?.lost ? tag.lastPlace : 'your current location');
</script>

{#if tag}
  <section class="screen">
    <TopBar title={tag.name} fallback="/tags">
      {#snippet action()}
        <button class="icon-btn outlined" aria-label="Rename {tag.name}" onclick={() => { draft = tag.name; renameOpen = true; }}><Icon name="edit" size={20} /></button>
      {/snippet}
    </TopBar>

    <MapView
      variant="streets"
      height={250}
      tone={st === 'out' ? 'danger' : 'primary'}
      label={st === 'out' ? `Last known location · saved ${fmtTime(tag.lostAt ?? Date.now())} ${tag.lastPlace ?? ''}` : 'With you now · updated just now'} />

    <div class="signal {st}" aria-live="polite">
      <span>Signal now: <strong>{label}</strong></span>
      <SignalBars level={tag.signal} />
    </div>
    <Meter value={tag.signal / 4} label="Signal strength" min="Out of range" max="Right here" />
    {#if st === 'out'}
      <button class="btn" onclick={() => recoverTag(tag.id)}>I have it now</button>
    {/if}

    <h2 class="small muted" id="dist-l">Alert distance: how far it can go before the wristband buzzes</h2>
    <Segmented labelledby="dist-l" value={tag.distance} onchange={(v) => update({ distance: v })} options={DIST} />
    <p class="small muted">{DIST.find((x) => x.id === tag.distance)?.hint}</p>

    <button class="btn btn-primary btn-lg" onclick={() => (tag.lost && tag.lastLat != null ? window.open(`https://www.google.com/maps?q=${tag.lastLat},${tag.lastLng}`, '_blank') : toast(`Maps would open at ${place} (simulated)`))}>Open in Maps</button>

    <div class="bottom">
      <button class="text-btn danger" onclick={() => (removeOpen = true)}>Remove tag</button>
    </div>
  </section>

  <Dialog bind:open={renameOpen} title="Rename tag">
    <form id="rename" onsubmit={rename} class="field">
      <label for="tag-name" class="small muted">Name</label>
      <input id="tag-name" bind:value={draft} maxlength="20" />
    </form>
    {#snippet actions()}
      <button class="btn" onclick={() => (renameOpen = false)}>Cancel</button>
      <button class="btn btn-primary" type="submit" form="rename" disabled={!draft.trim()}>Save</button>
    {/snippet}
  </Dialog>

  <Dialog bind:open={removeOpen} title="Remove {tag.name}?">
    <p class="muted">The wristband stops watching this tag. You can pair it again later.</p>
    {#snippet actions()}
      <button class="btn" onclick={() => (removeOpen = false)}>Cancel</button>
      <button class="btn btn-danger-solid" onclick={remove}>Remove</button>
    {/snippet}
  </Dialog>
{:else}
  <section class="screen">
    <TopBar title="Tag" fallback="/tags" />
    <p class="empty">This tag isn’t paired anymore.</p>
    <button class="btn" onclick={() => navigate('/tags', { replace: true })}>Back to my tags</button>
  </section>
{/if}

<style>
  .signal { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-radius: var(--radius); border: 1.5px solid var(--border); background: var(--surface); }
  .signal.out { background: var(--danger-soft); border-color: var(--danger-border); }
  .signal.out strong { color: var(--danger); }
  .signal.out :global(.bars) { color: var(--border-strong); }
  .signal.near strong { color: var(--ok); }
  .signal.far strong { color: var(--warn); }
</style>
