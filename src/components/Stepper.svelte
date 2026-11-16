<script>
  let { step } = $props();
</script>

<div class="stepper">
  <p>Step {step} of 3</p>
  <div class="bars" role="progressbar" aria-label="Setup progress" aria-valuemin="1" aria-valuemax="3" aria-valuenow={step}>
    {#each [1, 2, 3] as i}<span class:done={i <= step}></span>{/each}
  </div>
</div>

<style>
  .stepper { display: flex; flex-direction: column; gap: 10px; margin-bottom: 8px; }
  p { margin: 0; color: var(--text-2); font-size: 0.9375rem; }
  .bars { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .bars span { height: 6px; border-radius: 3px; background: var(--line); transition: background-color 0.4s; }
  .bars span.done { background: var(--primary); }
</style>
