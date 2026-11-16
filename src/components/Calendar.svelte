<script>
  import Icon from './Icon.svelte';
  import { dayKey } from '../lib/format.js';

  // selected: 'YYYY-MM-DD'; marks: { [dayKey]: { trip: bool, alert: bool } }
  let { selected = $bindable(), marks = {} } = $props();

  const todayKey = dayKey(Date.now());
  const parse = (k) => {
    const [y, m, d] = k.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const firstOf = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
  let view = $state(firstOf(parse(selected ?? todayKey)));

  const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const title = $derived(view.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
  const cells = $derived.by(() => {
    const y = view.getFullYear();
    const m = view.getMonth();
    const lead = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const out = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= days; d++) out.push(dayKey(new Date(y, m, d)));
    return out;
  });

  let grid;
  function shiftMonth(n) {
    view = new Date(view.getFullYear(), view.getMonth() + n, 1);
  }
  function move(days) {
    const d = parse(selected);
    d.setDate(d.getDate() + days);
    selected = dayKey(d);
    if (d.getMonth() !== view.getMonth() || d.getFullYear() !== view.getFullYear()) view = new Date(d.getFullYear(), d.getMonth(), 1);
    queueMicrotask(() => grid?.querySelector(`[data-day="${selected}"]`)?.focus());
  }
  function key(e) {
    const map = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (map[e.key]) {
      e.preventDefault();
      move(map[e.key]);
    }
  }
  const label = (k) => parse(k).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
</script>

<div class="cal">
  <div class="head">
    <button class="icon-btn" onclick={() => shiftMonth(-1)} aria-label="Previous month"><Icon name="chevronLeft" size={22} /></button>
    <h2 aria-live="polite">{title}</h2>
    <button class="icon-btn" onclick={() => shiftMonth(1)} aria-label="Next month"><Icon name="chevronRight" size={22} /></button>
  </div>
  <div class="dow" aria-hidden="true">{#each DOW as d}<span>{d}</span>{/each}</div>
  <div class="days" bind:this={grid} role="group" aria-label="Days in {title}">
    {#each cells as k}
      {#if k}
        {@const mk = marks[k]}
        <button
          data-day={k}
          class:today={k === todayKey}
          aria-pressed={k === selected}
          tabindex={k === selected ? 0 : -1}
          aria-label="{label(k)}{mk ? ', has activity' : ''}"
          onclick={() => (selected = k)}
          onkeydown={key}>
          <span>{Number(k.slice(8))}</span>
          <span class="dots" aria-hidden="true">
            {#if mk?.trip}<i class="trip"></i>{/if}
            {#if mk?.alert}<i class="alert"></i>{/if}
          </span>
        </button>
      {:else}
        <span></span>
      {/if}
    {/each}
  </div>
</div>

<style>
  .cal { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 12px 14px; box-shadow: var(--shadow); }
  .head { display: flex; align-items: center; justify-content: space-between; }
  h2 { font-size: 1.0625rem; }
  .dow, .days { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; }
  .dow { font-size: 0.75rem; color: var(--text-2); padding: 4px 0 6px; }
  .days { gap: 2px; }
  .days button {
    aspect-ratio: 1; max-height: 52px; border: none; background: none; border-radius: 14px; font: inherit; color: var(--text);
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; cursor: pointer;
    transition: background-color 0.15s, color 0.15s;
  }
  .days button:hover { background: var(--hover); }
  .days button.today { box-shadow: inset 0 0 0 1.5px var(--primary); }
  .days button[aria-pressed='true'] { background: var(--primary); color: var(--on-primary); font-weight: 650; }
  .dots { display: flex; gap: 3px; height: 6px; }
  .dots i { width: 6px; height: 6px; border-radius: 50%; }
  .dots .trip { background: var(--primary); }
  .dots .alert { background: var(--danger); }
  [aria-pressed='true'] .dots i { background: var(--on-primary); }
</style>
