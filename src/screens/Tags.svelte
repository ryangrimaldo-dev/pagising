<script>
  import { flip } from 'svelte/animate';
  import { fly } from 'svelte/transition';
  import Icon from '../components/Icon.svelte';
  import SignalBars from '../components/SignalBars.svelte';
  import TagStatus from '../components/TagStatus.svelte';
  import { tags, statusOf, reducedMotion } from '../lib/stores.js';
  import { navigate } from '../lib/router.js';
  import { t } from '../lib/i18n.js';

  const tagIcon = (k) => ({ Wallet: 'wallet', Bag: 'bag', Keys: 'key' })[k] ?? 'tag';
  const d = $derived($reducedMotion ? 0 : 220);
</script>

<section class="screen">
  <header class="row-between">
    <h1>{$t('My tags')}</h1>
    {#if $tags.length}<button class="btn btn-sm pill" onclick={() => navigate('/tags/add')}><Icon name="plus" size={18} /> {$t('Add tag')}</button>{/if}
  </header>

  {#if $tags.length}
    <ul class="stack-sm">
      {#each $tags as tag (tag.id)}
        {@const st = statusOf(tag)}
        <li animate:flip={{ duration: d }} in:fly={{ y: 8, duration: d }}>
          <button class="card tag {st}" onclick={() => navigate(`/tags/${tag.id}`)}>
            <span class="ic"><Icon name={tagIcon(tag.kind)} size={28} /></span>
            <span class="grow"><strong class="h3">{tag.name}</strong><TagStatus {tag} /></span>
            <span class="sig"><SignalBars level={tag.signal} /></span>
          </button>
        </li>
      {/each}
    </ul>
    <p class="small muted">Near is within a few steps. Far is across the aisle. Out of range means the wristband lost it.</p>
  {:else}
    <div class="empty-state">
      <Icon name="tag" size={48} stroke={1.4} />
      <h2 class="h3">No tags yet</h2>
      <p class="muted">Clip a tag to your wallet, bag or keys and the wristband buzzes if it moves away.</p>
      <button class="btn btn-primary btn-lg" onclick={() => navigate('/tags/add')}>Add your first tag</button>
    </div>
  {/if}
</section>

<style>
  .pill { border-radius: 999px; }
  .tag { display: flex; align-items: center; gap: 14px; }
  .tag.out { background: var(--danger-soft); border-color: var(--danger); }
  .tag.out .ic { color: var(--danger); }
  .sig { color: var(--text); }
  .tag.out .sig { color: var(--border-strong); }
  .empty-state { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px; padding: 48px 8px; color: var(--text-2); }
  .empty-state h2 { color: var(--text); font-size: 1.25rem; }
</style>
