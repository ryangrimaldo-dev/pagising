<script>
  // Mock map. variant: 'pin' (single stop), 'streets' (last known spot), 'route' (live trip)
  let { variant = 'pin', label = '', tone = 'primary', progress = 0, height = 180 } = $props();
  let pathEl = $state();
  let dot = $state({ x: 30, y: 170 });
  $effect(() => {
    if (!pathEl) return;
    const L = pathEl.getTotalLength();
    const p = pathEl.getPointAtLength(L * Math.min(1, Math.max(0, progress)));
    dot = { x: p.x, y: p.y };
  });
</script>

<div class="map {tone}" style="height:{height}px" role="img" aria-label={label}>
  <svg viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice">
    {#if variant === 'streets'}
      <g stroke="var(--road)" stroke-width="9" fill="none">
        <path d="M-10 60 L380 160" /><path d="M120 -10 L150 220" /><path d="M-10 150 L380 120" /><path d="M260 -10 L300 220" stroke-width="5" />
      </g>
    {/if}
    {#if variant === 'route'}
      <path bind:this={pathEl} d="M30 170 C 90 140, 100 95, 170 100 S 270 95, 318 40" fill="none" stroke="var(--primary)" stroke-width="5" stroke-dasharray="11 9" stroke-linecap="round" />
      <circle cx={dot.x} cy={dot.y} r="9" fill="var(--primary)" stroke="var(--surface)" stroke-width="3" class="dot" />
      <g transform="translate(318 52)">
        <path d="M0 0 c-10-12 -15-19 -15-26 a15 15 0 0 1 30 0 c0 7 -5 14 -15 26z" fill="var(--surface)" stroke="var(--text)" stroke-width="2.5" />
        <circle cx="0" cy="-26" r="5" fill="var(--text)" />
      </g>
    {:else if tone !== 'muted'}
      <g transform="translate(180 {variant === 'pin' ? 125 : 118})" class="pin">
        <path d="M0 0 c-13-15 -20-24 -20-34 a20 20 0 0 1 40 0 c0 10 -7 19 -20 34z" fill="var(--surface)" stroke="currentColor" stroke-width="3" />
        <circle cx="0" cy="-34" r="7" fill="currentColor" />
      </g>
    {/if}
  </svg>
  {#if label}<span class="label">{label}</span>{/if}
</div>

<style>
  .map {
    position: relative; overflow: hidden; border-radius: var(--radius); background: var(--map);
    border: 1.5px dashed var(--border-strong); flex-shrink: 0;
  }
  svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .primary { color: var(--primary); }
  .danger { color: var(--danger); }
  .muted { color: var(--text-2); }
  .pin { animation: drop 0.4s ease-out; }
  .dot { transition: cx 0.9s linear, cy 0.9s linear; }
  .label {
    position: absolute; left: 12px; bottom: 10px; right: 12px; width: fit-content; background: color-mix(in srgb, var(--surface) 92%, transparent);
    color: var(--text); padding: 5px 10px; border-radius: 8px; font-size: 0.8125rem;
  }
  @keyframes drop { from { transform: translate(180px, 90px); opacity: 0; } }
</style>
