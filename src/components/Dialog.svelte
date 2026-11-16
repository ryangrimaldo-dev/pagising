<script>
  let { open = $bindable(false), title, children, actions } = $props();
  const id = 'dlg-' + Math.random().toString(36).slice(2, 8);
  let el;
  $effect(() => {
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog bind:this={el} aria-labelledby={id} onclose={() => (open = false)} onclick={(e) => e.target === el && (open = false)}>
  <div class="dlg">
    <h2 {id}>{title}</h2>
    {@render children?.()}
    {#if actions}<div class="dlg-actions">{@render actions()}</div>{/if}
  </div>
</dialog>

<style>
  dialog {
    border: none; padding: 0; border-radius: 18px; width: min(420px, calc(100vw - 32px));
    background: var(--surface); color: var(--text); box-shadow: 0 20px 50px rgb(0 0 0 / 0.2);
  }
  dialog[open] { animation: pop 0.2s ease-out; }
  dialog::backdrop { background: rgb(20 22 26 / 0.45); }
  .dlg { padding: 22px; display: flex; flex-direction: column; gap: 14px; }
  h2 { margin: 0; font-size: 1.25rem; }
  .dlg-actions { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; margin-top: 4px; }
  @keyframes pop { from { opacity: 0; transform: translateY(8px) scale(0.98); } }
</style>
