<script>
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import Stepper from '../components/Stepper.svelte';
  import Icon from '../components/Icon.svelte';
  import { settings, reducedMotion } from '../lib/stores.js';
  import { navigate } from '../lib/router.js';
  import { connectBand, buzz, buzzing, hwAvailable } from '../lib/sim.js';

  // choose (real wristband available) | searching | notfound | connected
  let phase = $state(hwAvailable ? 'choose' : 'searching');
  let errorMsg = $state('');

  function useReal() {
    settings.update((s) => ({ ...s, hw: true }));
    connect();
  }
  function useDemo() {
    settings.update((s) => ({ ...s, hw: false }));
    connect();
  }
  let noCount = $state(0);

  async function connect() {
    phase = 'searching';
    try {
      errorMsg = '';
      await connectBand();
      phase = 'connected';
      buzz('stop10', 'Test buzz sent to your wristband');
    } catch (e) {
      errorMsg = $settings.hw ? e?.message ?? '' : '';
      phase = 'notfound';
    }
  }
  // The Bluetooth picker needs a tap, so only demo mode connects by itself.
  onMount(() => {
    if (!hwAvailable) connect();
  });

  function again() {
    noCount++;
    buzz('stop5', 'Stronger test buzz sent');
  }
  const d = $derived($reducedMotion ? 0 : 220);
</script>

<section class="screen">
  <div class="hero onb">
    <Stepper step={2} />
    <h1>Connect your wristband</h1>
    <p class="lead">Turn it on and hold it near your phone.</p>
  </div>

  <div class="illus" class:found={phase === 'connected'}>
    <span class:buzzing={!!$buzzing}><Icon name="watch" size={96} stroke={1.4} /></span>
    {#if phase === 'searching'}
      <p class="searching" role="status"><span class="spinner"></span> Looking for your wristband…</p>
    {/if}
  </div>

  {#if phase === 'choose'}
    <div class="card stack-sm" in:fly={{ y: 8, duration: d }}>
      <button class="btn btn-primary btn-lg" onclick={useReal}>Connect my wristband</button>
      <button class="btn" onclick={useDemo}>Try the demo instead</button>
      <p class="small muted">The demo acts out the wristband so you can try the app without it.</p>
    </div>
  {:else if phase === 'notfound'}
    <div class="banner danger" role="alert" in:fly={{ y: 8, duration: d }}>
      <Icon name="alert" size={26} />
      <div class="grow">
        <strong>No wristband found</strong>
        <ul class="tips">
          <li>Is it charged? Hold the side button for 3 seconds.</li>
          <li>Is Bluetooth on?</li>
          <li>Keep it within arm’s reach.</li>
          {#if $settings.hw}<li>On iPhone, open this app in the Bluefy browser.</li>{/if}
        </ul>
        {#if errorMsg}<p class="small">{errorMsg}</p>{/if}
      </div>
    </div>
    <button class="btn btn-primary btn-lg" onclick={connect}>Try again</button>
    {#if hwAvailable && $settings.hw}<button class="link center" onclick={useDemo}>Use the demo instead</button>{/if}
  {:else if phase === 'connected'}
    <div class="banner ok" role="status" in:fly={{ y: 8, duration: d }}>
      <Icon name="checkCircle" size={30} />
      <div><strong>Connected: Pagising</strong><span>Battery {$settings.band.battery}%</span></div>
    </div>
    <div class="card stack-sm" in:fly={{ y: 12, delay: 120, duration: d }}>
      <h2 class="h3">Did you feel a buzz on your wrist?</h2>
      <div class="grid-2">
        <button class="btn btn-primary" onclick={() => navigate('/onboard/3')}>Yes</button>
        <button class="btn" onclick={again}>No, buzz again</button>
      </div>
      {#if noCount >= 2}
        <p class="muted small" in:fly={{ y: 6, duration: d }}>Still nothing? Make sure the strap is snug. You can raise the strength later in Settings → Vibration.</p>
      {/if}
    </div>
  {/if}
</section>

<style>
  .onb { display: flex; flex-direction: column; gap: 10px; }
  .onb .lead { color: var(--hero-text-2); }
  .illus {
    min-height: 220px; border: 1.5px dashed var(--border-strong); border-radius: var(--radius); background: var(--map);
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; color: var(--text);
    transition: background-color 0.4s;
  }
  .illus.found { background: var(--primary-soft); }
  .searching { display: flex; align-items: center; gap: 10px; color: var(--text-2); }
  .tips { list-style: disc; padding-left: 18px; margin-top: 4px; color: var(--text); font-size: 0.9375rem; }
</style>
