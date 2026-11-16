<script>
  import Icon from './Icon.svelte';
  import { back } from '../lib/router.js';
  let { title, fallback = '/', action } = $props();
</script>

<header class="topbar">
  <button class="icon-btn" onclick={() => back(fallback)} aria-label="Back"><Icon name="chevronLeft" size={26} /></button>
  <h1>{title}</h1>
  {#if action}<div class="action">{@render action()}</div>{/if}
</header>

<style>
  .topbar { display: flex; align-items: center; gap: 8px; margin: 0 0 4px -10px; }
  h1 { flex: 1; font-size: 1.625rem; }
  .action { margin-left: auto; }
</style>
