<script>
  import Icon from './Icon.svelte';
  import { path } from '../lib/router.js';
  import { t } from '../lib/i18n.js';
  const TABS = [
    { href: '/', label: 'Home', icon: 'home' },
    { href: '/tags', label: 'Tags', icon: 'tag' },
    { href: '/log', label: 'Log', icon: 'list' },
    { href: '/settings', label: 'Settings', icon: 'gear' }
  ];
  const active = (href, p) => (href === '/' ? p === '/' : p.startsWith(href));
</script>

<nav class="nav" aria-label="Main">
  <span class="brand">Pagising</span>
  {#each TABS as tab}
    <a href="#{tab.href}" aria-current={active(tab.href, $path) ? 'page' : undefined}>
      <Icon name={tab.icon} size={22} />
      <span>{$t(tab.label)}</span>
    </a>
  {/each}
</nav>
