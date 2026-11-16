<script>
  // Gradient meter with a marker, value 0..1.
  let { value = 0, label, min = '0', max = '' } = $props();
  const pct = $derived(Math.round(Math.min(1, Math.max(0, value)) * 100));
</script>

<div class="meter" role="meter" aria-label={label} aria-valuemin="0" aria-valuemax="100" aria-valuenow={pct}>
  <div class="track"><span class="fill" style="width:{pct}%"></span></div>
  <div class="marks" aria-hidden="true"><span class="mark" style="left:{pct}%">▲</span></div>
  <div class="scale" aria-hidden="true"><span>{min}</span><span>{max}</span></div>
</div>

<style>
  .meter { display: flex; flex-direction: column; gap: 4px; }
  .track { height: 8px; border-radius: 999px; background: var(--line); overflow: hidden; }
  .fill { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--meter-a), #f7c88f 55%, var(--meter-b)); transition: width 0.5s ease; }
  .scale { position: relative; display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-2); }
  .marks { position: relative; height: 10px; margin-top: -2px; }
  .mark { position: absolute; font-size: 0.625rem; line-height: 1; transform: translateX(-50%); color: var(--text-2); transition: left 0.5s ease; }
</style>
