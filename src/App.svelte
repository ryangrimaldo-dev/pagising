<script>
  import { onMount, tick } from 'svelte';
  import { fly } from 'svelte/transition';
  import { path, direction, match, navigate } from './lib/router.js';
  import { settings, alert, reducedMotion, systemDark, now } from './lib/stores.js';
  import RouteEditor from './screens/RouteEditor.svelte';
  import { startSim } from './lib/sim.js';
  import Nav from './components/Nav.svelte';
  import Toasts from './components/Toasts.svelte';
  import BuzzIndicator from './components/BuzzIndicator.svelte';
  import Permissions from './screens/Permissions.svelte';
  import Connect from './screens/Connect.svelte';
  import AddTags from './screens/AddTags.svelte';
  import Home from './screens/Home.svelte';
  import PlanTrip from './screens/PlanTrip.svelte';
  import Trip from './screens/Trip.svelte';
  import StopAlert from './screens/StopAlert.svelte';
  import TheftAlert from './screens/TheftAlert.svelte';
  import Tags from './screens/Tags.svelte';
  import TagDetail from './screens/TagDetail.svelte';
  import Log from './screens/Log.svelte';
  import Settings from './screens/Settings.svelte';
  import Vibration from './screens/Vibration.svelte';

  const ROUTES = [
    ['/onboard/1', Permissions],
    ['/onboard/2', Connect],
    ['/onboard/3', AddTags, { props: { mode: 'onboard' } }],
    ['/', Home, { nav: true }],
    ['/plan', PlanTrip],
    ['/trip', Trip, { nav: true }],
    ['/routes/new', RouteEditor],
    ['/alert/stop', StopAlert, { full: true }],
    ['/alert/theft/:id', TheftAlert, { full: true }],
    ['/tags', Tags, { nav: true }],
    ['/tags/add', AddTags, { props: { mode: 'add' } }],
    ['/tags/:id', TagDetail],
    ['/log', Log, { nav: true }],
    ['/settings', Settings, { nav: true }],
    ['/settings/vibration', Vibration]
  ];

  const route = $derived.by(() => {
    for (const [p, C, o] of ROUTES) {
      const params = match(p, $path);
      if (params) return { C, params, ...(o ?? {}) };
    }
    return null;
  });

  // Guards: onboarding first, active alerts take over the screen, unknown paths go home.
  $effect(() => {
    const p = $path;
    const a = $alert;
    if (!$settings.onboarded && !p.startsWith('/onboard')) navigate('/onboard/1', { replace: true });
    else if ($settings.onboarded && p.startsWith('/onboard')) navigate('/', { replace: true });
    else if (a && !p.startsWith('/alert')) navigate(a.type === 'stop' ? '/alert/stop' : `/alert/theft/${a.tagId}`, { replace: true });
    else if (!route) navigate('/', { replace: true });
  });

  $effect(() => {
    $path;
    tick().then(() => {
      window.scrollTo(0, 0);
      const h = document.querySelector('main h1');
      if (h) {
        h.setAttribute('tabindex', '-1');
        h.focus({ preventScroll: true });
      }
    });
  });

  $effect(() => {
    const pref = $settings.theme ?? 'system';
    const dark = pref === 'dark' || (pref === 'system' && $systemDark);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0e131c' : '#f4f5f8');
  });

  // Time-of-day gradient: dawn 5–8, day 8–16, dusk 16–19, night otherwise.
  $effect(() => {
    const h = new Date($now).getHours();
    document.documentElement.dataset.tod = h >= 5 && h < 8 ? 'dawn' : h >= 8 && h < 16 ? 'day' : h >= 16 && h < 19 ? 'dusk' : 'night';
  });

  $effect(() => {
    document.documentElement.lang = $settings.lang === 'fil' ? 'fil' : 'en';
  });

  onMount(startSim);
</script>

<a class="skip" href="#main" onclick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>

<div class="app" class:has-nav={route?.nav} class:full={route?.full}>
  {#if route?.nav}<Nav />{/if}
  <main id="main" tabindex="-1">
    {#key $path}
      <div in:fly={{ x: $direction * 24, duration: $reducedMotion ? 0 : 240, opacity: 0 }}>
        {#if route}<route.C params={route.params} {...route.props ?? {}} />{/if}
      </div>
    {/key}
  </main>
</div>
<BuzzIndicator />
<Toasts />
