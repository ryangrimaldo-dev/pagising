<script>
  import Dialog from './Dialog.svelte';
  let { open = $bindable(false), value, onsave } = $props();
  const OPTIONS = [15, 10, 5, 3, 1];
  let picked = $state([]);
  $effect(() => {
    if (open) picked = [...value];
  });
  const toggle = (m) => (picked = picked.includes(m) ? picked.filter((x) => x !== m) : [...picked, m]);
  function save() {
    onsave([...picked].sort((a, b) => b - a));
    open = false;
  }
</script>

<Dialog bind:open title="Wake-up alerts">
  <p class="muted">Pick when the wristband buzzes before your stop. The last one keeps buzzing until you tap.</p>
  <fieldset class="opts">
    <legend class="sr-only">Minutes before your stop</legend>
    {#each OPTIONS as m}
      <label class="check-row">
        <span>{m} min before</span>
        <input type="checkbox" checked={picked.includes(m)} onchange={() => toggle(m)} />
      </label>
    {/each}
  </fieldset>
  {#if !picked.length}<p class="error small" role="alert">Choose at least one alert</p>{/if}
  {#snippet actions()}
    <button class="btn" onclick={() => (open = false)}>Cancel</button>
    <button class="btn btn-primary" disabled={!picked.length} onclick={save}>Save</button>
  {/snippet}
</Dialog>

<style>
  .opts { border: none; padding: 0; margin: 0; display: flex; flex-direction: column; }
</style>
