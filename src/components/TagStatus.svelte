<script>
  import { statusOf, now } from '../lib/stores.js';
  import { relTime } from '../lib/format.js';
  let { tag, short = false } = $props();
  const s = $derived(statusOf(tag));
</script>

<span class="tstatus {s}">
  {#if s === 'near'}<span aria-hidden="true">●</span> Near
  {:else if s === 'far'}<span aria-hidden="true">◆</span> Far
  {:else}<span aria-hidden="true">▲</span> Out of range{#if tag.lostAt && !short}&nbsp;· last seen {relTime(tag.lostAt, $now)}{/if}
  {/if}
</span>

<style>
  .tstatus { font-size: 0.875rem; font-weight: 500; }
  .tstatus span { font-size: 0.7em; vertical-align: 0.15em; }
  .near { color: var(--ok); }
  .far { color: var(--warn); }
  .out { color: var(--danger); }
</style>
