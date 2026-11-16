<script>
  import { fly } from 'svelte/transition';
  import { buzzing } from '../lib/sim.js';
  import { reducedMotion } from '../lib/stores.js';
  import Icon from './Icon.svelte';
</script>

<div class="wrap" role="status" aria-live="polite">
  {#if $buzzing}
    <div class="buzz" transition:fly={{ y: -16, duration: $reducedMotion ? 0 : 180 }}>
      <span class="buzzing"><Icon name="watch" size={20} /></span>
      {$buzzing.label}
    </div>
  {/if}
</div>

<style>
  .wrap { position: fixed; top: 12px; left: 50%; transform: translateX(-50%); z-index: 60; pointer-events: none; }
  .buzz {
    display: flex; align-items: center; gap: 8px; background: var(--surface); color: var(--text);
    border: 1px solid var(--border); border-radius: 999px; padding: 8px 16px 8px 12px; font-size: 0.875rem;
    box-shadow: 0 6px 20px rgb(0 0 0 / 0.12); white-space: nowrap;
  }
  .buzz span { display: inline-flex; color: var(--primary); }
</style>
