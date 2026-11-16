<script>
  import { scale } from 'svelte/transition';
  import Stepper from '../components/Stepper.svelte';
  import Icon from '../components/Icon.svelte';
  import { settings } from '../lib/stores.js';
  import { navigate } from '../lib/router.js';
  import { wait } from '../lib/sim.js';

  const ITEMS = [
    { key: 'location', icon: 'pin', title: 'Location', desc: 'To know when your stop is near. Used only during a trip.' },
    { key: 'bluetooth', icon: 'bluetooth', title: 'Bluetooth', desc: 'To talk to your wristband and tags.' },
    { key: 'notifications', icon: 'bell', title: 'Notifications', desc: 'To show alerts on your phone too.' }
  ];
  let pending = $state(null);
  const perms = $derived($settings.perms);
  const ready = $derived(perms.location && perms.bluetooth);

  async function allow(key) {
    pending = key;
    await wait(700); // simulated system prompt
    settings.update((s) => ({ ...s, perms: { ...s.perms, [key]: true } }));
    pending = null;
  }
</script>

<section class="screen">
  <div class="hero onb">
    <Stepper step={1} />
    <h1>Pagising needs 3 things</h1>
    <p class="lead">Allow each one so the wristband can wake you and watch your things.</p>
  </div>
  <ul class="stack-sm">
    {#each ITEMS as it}
      <li class="card perm">
        <span class="ic"><Icon name={it.icon} /></span>
        <div class="grow">
          <h2 class="h3">{it.title}</h2>
          <p class="muted small">{it.desc}</p>
        </div>
        {#if perms[it.key]}
          <span class="allowed" in:scale={{ start: 0.7, duration: 200 }}><Icon name="check" size={20} stroke={2.4} /> Allowed</span>
        {:else}
          <button class="btn btn-sm" onclick={() => allow(it.key)} disabled={pending === it.key} aria-label="Allow {it.title}">
            {#if pending === it.key}<span class="spinner" style="width:16px;height:16px;border-width:2px"></span>{:else}Allow{/if}
          </button>
        {/if}
      </li>
    {/each}
  </ul>
  <div class="bottom">
    {#if !ready}<p class="muted small center">Continue unlocks after Location and Bluetooth</p>{/if}
    <button class="btn btn-primary btn-lg" disabled={!ready} onclick={() => navigate('/onboard/2')}>Continue</button>
  </div>
</section>

<style>
  .onb { display: flex; flex-direction: column; gap: 10px; }
  .onb .lead { color: var(--hero-text-2); }
  .perm { display: flex; align-items: center; gap: 14px; }
  .ic { display: inline-flex; color: var(--text); }
  .allowed { display: inline-flex; align-items: center; gap: 4px; color: var(--ok); font-weight: 600; white-space: nowrap; }
  .btn-sm { min-width: 76px; }
</style>
