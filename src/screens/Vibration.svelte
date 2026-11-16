<script>
  import { onDestroy } from 'svelte';
  import TopBar from '../components/TopBar.svelte';
  import Icon from '../components/Icon.svelte';
  import Segmented from '../components/Segmented.svelte';
  import { settings, toast } from '../lib/stores.js';
  import { buzz, buzzing, stopBuzz } from '../lib/sim.js';
  import { PATTERNS } from '../lib/mock.js';

  let finding = $state(false);
  let findTimer;
  const s = $derived($settings.strength);
  const LEVELS = [
    { v: 20, n: '1', name: 'Very gentle' },
    { v: 40, n: '2', name: 'Gentle' },
    { v: 60, n: '3', name: 'Medium' },
    { v: 80, n: '4', name: 'Strong' },
    { v: 100, n: '5', name: 'Strongest' }
  ];
  // snap any older slider value to the nearest of the 5 levels
  const step = $derived(LEVELS.reduce((a, b) => (Math.abs(b.v - s) < Math.abs(a.v - s) ? b : a)).v);
  const level = $derived(LEVELS.find((l) => l.v === step).name);
  // Play loops the pattern until paused, so you can feel it a few times.
  let playing = $state(null);
  let loopTimer;
  function stopLoop() {
    clearInterval(loopTimer);
    playing = null;
    stopBuzz();
  }
  function toggle(p) {
    if (playing === p.id) return stopLoop();
    stopLoop();
    playing = p.id;
    const once = () => buzz(p, `Playing ${p.title.toLowerCase()} · tap pause to stop`);
    once();
    loopTimer = setInterval(once, p.vib.reduce((a, b) => a + b, 0) + 900);
  }
  onDestroy(() => clearInterval(loopTimer));

  function find() {
    clearInterval(findTimer);
    if (playing) stopLoop();
    if (finding) {
      finding = false;
      stopBuzz();
      return;
    }
    finding = true;
    toast('Your wristband is buzzing. Listen for it.');
    let n = 0;
    const once = () => buzz('lost', 'Find my wristband: buzzing');
    once();
    findTimer = setInterval(() => {
      if (++n >= 6) {
        clearInterval(findTimer);
        finding = false;
        return;
      }
      once();
    }, 1300);
  }
  onDestroy(() => clearInterval(findTimer));
</script>

<section class="screen">
  <TopBar title="Vibration" fallback="/settings" />

  <div class="card stack-sm">
    <div class="row-between">
      <h2 class="h3" id="str-l">Strength</h2>
      <span class="level">{level}</span>
    </div>
    <Segmented labelledby="str-l" value={String(step)} onchange={(v) => settings.update((x) => ({ ...x, strength: Number(v) }))} options={LEVELS.map((l) => ({ id: String(l.v), label: l.n }))} />
    <div class="row-between small muted"><span>Gentle</span><span>Strong</span></div>
    <button class="btn" onclick={() => { stopLoop(); buzz('stop5', `Test at ${level.toLowerCase()} strength`); }}>Test this strength</button>
  </div>

  <h2 class="small muted">Feel each pattern</h2>
  <ul class="list">
    {#each PATTERNS as p}
      {@const on = playing === p.id}
      <li class="row">
        <button class="play" class:on aria-label="{on ? 'Pause' : 'Play'} {p.title}" aria-pressed={on} onclick={() => toggle(p)}>
          <Icon name={on ? 'pause' : 'play'} size={20} stroke={2} />
        </button>
        <span class="grow"><strong>{p.title}</strong><span class="small muted">{p.desc}</span></span>
      </li>
    {/each}
  </ul>

  <div class="bottom">
    <button class="btn btn-lg" aria-pressed={finding} onclick={find}>
      {#if finding}<span class="buzzing"><Icon name="watch" size={20} /></span> Stop buzzing{:else}Find my wristband{/if}
    </button>
  </div>
</section>

<style>
  .level { font-weight: 700; color: var(--primary); }
  .play {
    width: 44px; height: 44px; flex-shrink: 0; border-radius: 50%; border: 1.5px solid var(--text); background: var(--surface);
    color: var(--primary); display: grid; place-items: center; cursor: pointer; transition: background-color 0.15s, transform 0.1s;
  }
  .play:hover { background: var(--primary-soft); }
  .play:active { transform: scale(0.94); }
  .play.on { background: var(--primary); border-color: var(--primary); color: #fff; }
  .row { padding: 12px 14px; }
  .row strong { font-size: clamp(0.9375rem, 4vw, 1rem); }
</style>
