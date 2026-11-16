<script>
  let { level = 0 } = $props();
</script>

<span class="bars" role="img" aria-label="Signal {level} of 4">
  {#each [1, 2, 3, 4] as i}<span class:on={i <= level}></span>{/each}
</span>

<style>
  .bars { display: inline-flex; gap: 4px; flex-shrink: 0; }
  .bars span {
    width: 10px; height: 15px; border: 1.5px solid currentColor; border-radius: 2px; opacity: 0.4;
    transition: background-color 0.3s, opacity 0.3s;
  }
  .bars span.on { background: currentColor; opacity: 1; }
</style>
