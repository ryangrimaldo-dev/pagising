<script>
  import { fly } from 'svelte/transition';
  import { toasts, reducedMotion } from '../lib/stores.js';
</script>

<div class="toasts" role="status" aria-live="polite">
  {#each $toasts as t (t.id)}
    <div class="toast {t.tone}" transition:fly={{ y: 16, duration: $reducedMotion ? 0 : 200 }}>{t.message}</div>
  {/each}
</div>

<style>
  .toasts {
    position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(88px + env(safe-area-inset-bottom));
    display: flex; flex-direction: column; gap: 8px; z-index: 50; width: min(440px, calc(100vw - 32px)); pointer-events: none;
  }
  .toast { background: var(--toast-bg); color: var(--toast-text); padding: 12px 16px; border-radius: 12px; font-size: 0.9375rem; box-shadow: 0 8px 24px rgb(0 0 0 / 0.18); }
  .toast.ok { background: var(--ok); color: var(--on-primary); }
  .toast.danger { background: var(--danger); color: var(--on-primary); }
</style>
