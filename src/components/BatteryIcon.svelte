<script>
  // Battery glyph with the percentage inside. Green ≥ 50, orange 20–49, red < 20.
  let { level = null, label = 'Battery', size = 1 } = $props();
  const pct = $derived(level == null ? null : Math.max(0, Math.min(100, Math.round(level))));
  const tone = $derived(pct == null ? 'none' : pct >= 50 ? 'high' : pct >= 20 ? 'mid' : 'low');
</script>

<span class="batt {tone}" style="--k:{size}" role="img" aria-label="{label} battery {pct == null ? 'unknown' : pct + '%'}">
  <span class="body"><span class="fill" style="width:{pct ?? 0}%"></span><span class="txt">{pct == null ? '—' : pct}</span></span>
  <span class="cap"></span>
</span>

<style>
  .batt { display: inline-flex; align-items: center; gap: 2px; flex-shrink: 0; }
  .body {
    position: relative; width: calc(46px * var(--k)); height: calc(22px * var(--k)); border-radius: calc(6px * var(--k));
    border: 2px solid currentColor; padding: 2px; display: block; overflow: hidden;
  }
  .fill { position: absolute; left: 2px; top: 2px; bottom: 2px; max-width: calc(100% - 4px); border-radius: calc(3px * var(--k)); transition: width 0.4s, background-color 0.4s; }
  .txt {
    position: relative; z-index: 1; display: grid; place-items: center; height: 100%; font-size: calc(0.75rem * var(--k)); font-weight: 800;
    color: #fff; text-shadow: 0 0 2px rgb(0 0 0 / 0.55), 0 0 1px rgb(0 0 0 / 0.7); font-variant-numeric: tabular-nums; line-height: 1;
  }
  .cap { width: calc(3px * var(--k)); height: calc(9px * var(--k)); border-radius: 0 2px 2px 0; background: currentColor; }
  .high .fill { background: #2fa565; }
  .mid .fill { background: #f08c2e; }
  .low .fill { background: #e0463a; }
  .low { color: #e0463a; }
  .none .txt { color: inherit; text-shadow: none; }
</style>
