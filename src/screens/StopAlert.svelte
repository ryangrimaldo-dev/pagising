<script>
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import Mascot from '../components/Mascot.svelte';
  import { alert } from '../lib/stores.js';
  import { acknowledgeStop, buzz } from '../lib/sim.js';
  import { PATTERNS } from '../lib/mock.js';
  import { fmtTime } from '../lib/format.js';
  import { t } from '../lib/i18n.js';

  const a = $derived($alert?.type === 'stop' ? $alert : null);
  const final = $derived(a && a.stage === a.total);
  const felt = $derived(a ? PATTERNS.find((p) => p.id === a.pattern)?.felt : '');

  // The last stage keeps buzzing until the rider taps.
  onMount(() => {
    const iv = setInterval(() => {
      const x = get(alert);
      if (x?.type === 'stop' && x.stage === x.total) buzz('stop1', 'Wristband: buzzing until you tap', { send: false });
    }, 2500);
    return () => clearInterval(iv);
  });
</script>

<svelte:window onkeydown={(e) => a && (e.key === 'Enter' || e.key === ' ') && e.target === document.body && acknowledgeStop()} />

{#if a}
  <div class="alert-screen" class:final role="alertdialog" aria-labelledby="sa-title" aria-describedby="sa-desc">
    <div class="inner">
      <span class="badge">Stop alert · stage {a.stage} of {a.total}</span>
      <div class="ring"><Mascot mood="alert" size={104} interactive={false} /></div>
      <h1 id="sa-title">{final ? 'Get ready to get off' : $t('Your stop is near')}</h1>
      <p class="sub" id="sa-desc">{a.stopName} in <strong>{a.minutes} min</strong></p>
      <p>Tap your wristband or the button below.</p>
      <p class="felt">You felt: <strong>{felt}</strong><span class="small">{fmtTime(a.at)}</span></p>
      <div class="bottom">
        <button class="btn btn-primary btn-lg" onclick={acknowledgeStop}>{$t("I'm awake")}</button>
        <p class="small">{final ? 'Buzzing continues until you tap' : `Stage ${a.total} turns red and keeps buzzing until you tap`}</p>
      </div>
    </div>
  </div>
{/if}

<style>
  .alert-screen { --tone: var(--warn); --tone-border: var(--warn-border); min-height: 100dvh; background: var(--warn-soft); display: flex; justify-content: center; transition: background-color 0.4s; }
  .alert-screen.final { --tone: var(--danger); --tone-border: var(--danger-border); background: var(--danger-soft); }
  .inner { width: 100%; max-width: 480px; padding: 48px 24px 32px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 16px; }
  .badge { border: 1.5px solid var(--tone); color: var(--tone); border-radius: 999px; padding: 5px 14px; font-size: 0.9375rem; }
  .ring { width: 150px; height: 150px; border-radius: 50%; border: 2px solid var(--tone); color: var(--tone); display: grid; place-items: center; background: var(--surface); margin: 8px 0; animation: pulse 1.6s ease-out infinite; }
  h1 { font-size: 2.25rem; }
  .sub { font-size: 1.375rem; }
  .felt { display: flex; flex-direction: column; gap: 2px; border: 1.5px dashed var(--tone-border); border-radius: 12px; padding: 10px 18px; background: color-mix(in srgb, var(--surface) 55%, transparent); }
  .bottom { width: 100%; }
  @keyframes pulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--tone) 35%, transparent); } 100% { box-shadow: 0 0 0 26px transparent; } }
</style>
