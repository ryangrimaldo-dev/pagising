<script>
  import { get } from 'svelte/store';
  import Mascot from '../components/Mascot.svelte';
  import MapView from '../components/MapView.svelte';
  import { tags, alert, trip } from '../lib/stores.js';
  import { navigate } from '../lib/router.js';
  import { recoverTag, stopBuzz } from '../lib/sim.js';
  import { fmtTime } from '../lib/format.js';

  let { params } = $props();
  const tag = $derived($tags.find((x) => x.id === params.id));

  $effect(() => {
    if (!tag && get(alert)?.type === 'theft') alert.set(null);
  });

  function haveIt() {
    recoverTag(tag.id);
    navigate(get(trip) ? '/trip' : '/', { replace: true });
  }
  function viewLocation() {
    alert.set(null);
    stopBuzz();
    navigate(`/tags/${tag.id}`, { replace: true });
  }
</script>

{#if tag}
  <div class="alert-screen" role="alertdialog" aria-labelledby="ta-title" aria-describedby="ta-desc">
    <div class="inner">
      <span class="badge">Possible theft</span>
      <div class="ring"><Mascot mood="alert" size={96} interactive={false} /></div>
      <h1 id="ta-title">Your {tag.name} may be taken</h1>
      <p class="sub" id="ta-desc">It moved away while you were seated.</p>
      <div class="map-wrap">
        <MapView variant="pin" tone="danger" height={150} label="Last seen {fmtTime(tag.lostAt ?? Date.now())} · {tag.lastPlace ?? 'nearby'}" />
      </div>
      <p class="felt">You felt: <strong>rapid buzzing</strong> = possible theft</p>
      <div class="bottom">
        <button class="btn btn-primary btn-lg" onclick={haveIt}>I have it</button>
        <button class="link center" onclick={viewLocation}>View last location</button>
      </div>
    </div>
  </div>
{:else}
  <section class="screen"><h1>Tag not found</h1><button class="btn" onclick={() => navigate('/', { replace: true })}>Go home</button></section>
{/if}

<style>
  .alert-screen { min-height: 100dvh; background: var(--danger-soft); display: flex; justify-content: center; }
  .inner { width: 100%; max-width: 480px; padding: 48px 24px 32px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 16px; }
  .badge { border: 1.5px solid var(--danger); color: var(--danger); border-radius: 999px; padding: 5px 14px; font-size: 0.9375rem; }
  .ring { width: 140px; height: 140px; border-radius: 50%; border: 2px solid var(--danger); color: var(--danger); display: grid; place-items: center; background: var(--surface); animation: shake 0.18s linear 12; }
  h1 { font-size: 2rem; }
  .sub { font-size: 1.125rem; color: var(--text-2); }
  .map-wrap { width: 100%; text-align: left; }
  .map-wrap :global(.map) { background: var(--surface); }
  .felt { border: 1.5px dashed var(--danger-border); border-radius: 12px; padding: 8px 16px; }
  .bottom { width: 100%; }
</style>
