<script>
  // Pill segmented control with a sliding thumb (radio group semantics).
  let { options, value = $bindable(), label, labelledby, onchange } = $props();
  const idx = $derived(Math.max(0, options.findIndex((o) => o.id === value)));
  let el;

  function pick(id) {
    value = id;
    onchange?.(id);
  }
  function key(e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const n = (idx + (e.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length;
    pick(options[n].id);
    el.querySelectorAll('button')[n]?.focus();
  }
</script>

<div class="seg" bind:this={el} role="radiogroup" aria-label={label} aria-labelledby={labelledby} style="--n:{options.length};--i:{idx}">
  <span class="thumb" aria-hidden="true"></span>
  {#each options as o}
    <button role="radio" aria-checked={value === o.id} tabindex={value === o.id ? 0 : -1} onclick={() => pick(o.id)} onkeydown={key}>{o.label}</button>
  {/each}
</div>

<style>
  .seg {
    position: relative; display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr));
    background: var(--surface-2); border: 1px solid var(--border); border-radius: 999px; padding: 4px;
  }
  .thumb {
    position: absolute; top: 4px; bottom: 4px; left: 4px; width: calc((100% - 8px) / var(--n));
    transform: translateX(calc(var(--i) * 100%)); background: var(--surface); border-radius: 999px;
    box-shadow: 0 1px 3px rgb(16 24 40 / 0.12), 0 0 0 1px var(--border); transition: transform 0.25s cubic-bezier(0.3, 0.7, 0.3, 1);
  }
  button {
    position: relative; z-index: 1; min-height: 42px; border: none; background: none; font: inherit; color: var(--text-2);
    border-radius: 999px; cursor: pointer; transition: color 0.2s; padding: 0 8px;
  }
  button:hover { color: var(--text); }
  button[aria-checked='true'] { color: var(--text); font-weight: 650; }
</style>
