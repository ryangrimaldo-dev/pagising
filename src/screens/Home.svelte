<script>
  import { onMount } from 'svelte';
  import { flip } from 'svelte/animate';
  import { slide } from 'svelte/transition';
  import Icon from '../components/Icon.svelte';
  import Mascot from '../components/Mascot.svelte';
  import TagStatus from '../components/TagStatus.svelte';
  import BatteryIcon from '../components/BatteryIcon.svelte';
  import { settings, tags, routes, trip, log, toast, statusOf, now, reducedMotion } from '../lib/stores.js';
  import { navigate } from '../lib/router.js';
  import { connectBand, startTrip } from '../lib/sim.js';
  import { STOPS } from '../lib/mock.js';
  import { fmtDur, fmtTime, relTime } from '../lib/format.js';
  import { t } from '../lib/i18n.js';

  const band = $derived($settings.band);
  const lost = $derived($tags.filter((x) => statusOf(x) === 'out'));
  const near = $derived($tags.length - lost.length);
  const protectedNow = $derived(band.connected && $tags.length > 0 && lost.length === 0);
  const mood = $derived(!band.connected ? 'worried' : lost.length ? 'alert' : $trip && !$trip.awake ? 'sleepy' : 'happy');
  const weekTrips = $derived($log.filter((e) => e.type === 'trip' && e.title.startsWith('Arrived') && $now - e.at < 7 * 864e5).length);
  const dateLabel = $derived(new Date($now).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  const statusLine = $derived(
    !band.connected
      ? 'Wristband is not connected'
      : lost.length
        ? `${lost[0].name} left you ${relTime(lost[0].lostAt, $now)}`
        : $trip
          ? `On the way to ${$trip.stopName}`
          : $tags.length
            ? 'All your things are with you'
            : 'Add a tag so I can watch your things'
  );
  const tripPct = $derived($trip ? Math.round((1 - $trip.remainingSec / $trip.totalSec) * 100) : 0);

  // Phone battery via the Battery Status API (Chrome, Edge, Android). Firefox and Safari don't expose it.
  let phone = $state(null);
  onMount(() => {
    let b;
    const upd = () => (phone = Math.round(b.level * 100));
    navigator.getBattery?.()
      .then((x) => {
        b = x;
        upd();
        b.addEventListener('levelchange', upd);
      })
      .catch(() => {});
    return () => b?.removeEventListener('levelchange', upd);
  });

  let reconnecting = $state(false);
  let editing = $state(false);

  async function reconnect() {
    reconnecting = true;
    try {
      await connectBand();
      toast('Wristband connected', 'ok');
    } catch {
      toast('Wristband not found. Is it charged?', 'danger');
    }
    reconnecting = false;
  }
  function startRoute(r) {
    const stop = r.stop ?? STOPS.find((s) => s.id === r.stopId);
    if (stop) startTrip({ stop, mode: r.mode, alertMins: $settings.alertMins, minutes: r.minutes });
  }
  function removeRoute(r) {
    routes.update((l) => l.filter((x) => x.id !== r.id));
    toast(`${r.name} deleted`);
    if ($routes.length === 0) editing = false;
  }
  const tagIcon = (k) => ({ Wallet: 'wallet', Bag: 'bag', Keys: 'key' })[k] ?? 'tag';
</script>

<section class="screen">
  <div class="hero home-hero" class:alerting={mood === 'alert'}>
    <header class="top">
      <button class="icon-btn add-btn" onclick={() => navigate($trip ? '/trip' : '/plan')} aria-label={$trip ? 'Open current trip' : $t('Plan a trip')}><Icon name="plus" size={26} /></button>
      <h1><button class="date" onclick={() => navigate('/log')} aria-label="Today, {dateLabel}. Open log calendar">Today <span>{dateLabel}</span> <Icon name="chevronRight" size={16} /></button></h1>
      <span class="phone-batt" title={phone == null ? 'Wristband battery' : 'Phone battery'}>
        <small>{phone == null ? 'Band' : 'Phone'}</small>
        <BatteryIcon level={phone ?? (band.connected ? band.battery : null)} label={phone == null ? 'Wristband' : 'Phone'} />
      </span>
    </header>

    {#if $trip}
      <button class="trip-card" onclick={() => navigate('/trip')} aria-label="Ongoing trip to {$trip.stopName}, {Math.ceil($trip.remainingSec / 60)} minutes left. Open trip">
        <span class="tc-top">
          <span class="live" aria-hidden="true"></span>
          <strong>On the way to {$trip.stopName}</strong>
          <span class="tc-min">{Math.ceil($trip.remainingSec / 60)} min</span>
        </span>
        <span class="tc-bar" aria-hidden="true"><span style="width:{tripPct}%"></span></span>
        <span class="tc-sub">{$trip.mode} · {$trip.fired}/{$trip.alertMins.length} alerts sent · tap to open</span>
      </button>
    {/if}

    <div class="headline">
      <div>
        {#if $tags.length}
          <p class="big" aria-label="{near} of {$tags.length} tags with you"><span>{near}</span><small>/{$tags.length}</small></p>
          <p class="sub"><strong>tags with you</strong></p>
        {:else}
          <p class="big zero" aria-label="No tags yet">0</p>
          <p class="sub"><strong>no tags yet</strong></p>
        {/if}
      </div>
      <div class="pills">
        {#if !band.connected}<span class="pill danger">Wristband off</span>
        {:else if protectedNow}<span class="pill ok"><Icon name="check" size={14} stroke={2.6} /> {$t('Protected')}</span>
        {:else if !$tags.length}<span class="pill info">Not protected yet</span>{/if}
        {#if lost.length}<span class="pill danger">{lost.length} out of range</span>{/if}
      </div>
    </div>

    <div class="stage">
      <Mascot {mood} size={150} />
    </div>

    <p class="status"><Icon name="pin" size={16} /> <strong>{statusLine}</strong></p>
    <p class="updated">updated {fmtTime($now)}</p>

    <div class="frost-tiles">
      <div class="frost"><span>Wristband</span><BatteryIcon level={band.connected ? band.battery : null} label="Wristband" /></div>
      <div class="frost"><span>Detects</span><strong>{band.posture}</strong></div>
      <div class="frost"><span>This week</span><strong>{weekTrips} {weekTrips === 1 ? 'trip' : 'trips'}</strong></div>
    </div>
  </div>

  {#if !band.connected}
    <div class="banner warn">
      <Icon name="watch" size={26} />
      <div class="grow"><strong>{$t('Wristband not connected')}</strong><span>Alerts can’t reach your wrist</span></div>
      <button class="btn btn-sm" onclick={reconnect} disabled={reconnecting}>{reconnecting ? 'Connecting…' : 'Reconnect'}</button>
    </div>
  {:else if lost.length}
    <button class="banner danger" onclick={() => navigate(`/tags/${lost[0].id}`)}>
      <Icon name="alert" size={26} />
      <div class="grow"><strong>{lost[0].name} is out of range</strong><span>Last seen {relTime(lost[0].lostAt, $now)} · see where</span></div>
      <Icon name="chevronRight" />
    </button>
  {/if}

  {#if $trip}
    <button class="btn btn-primary btn-lg" onclick={() => navigate('/trip')}>Back to my trip</button>
  {:else}
    <button class="btn btn-primary btn-lg" onclick={() => navigate('/plan')}>{$t('Plan a trip')}</button>
  {/if}

  <h2 class="section-label">Your tags</h2>
  <div class="tag-grid">
    {#each $tags as tag (tag.id)}
      <button class="card tag-mini" class:lost={statusOf(tag) === 'out'} onclick={() => navigate(`/tags/${tag.id}`)} animate:flip={{ duration: $reducedMotion ? 0 : 200 }}>
        <span class="tm-head"><Icon name={tagIcon(tag.kind)} size={18} /> <strong>{tag.name}</strong></span>
        <TagStatus {tag} short />
      </button>
    {/each}
    <button class="tag-mini add" onclick={() => navigate('/tags/add')}><Icon name="plus" size={18} /> {$t('Add tag')}</button>
  </div>

  <div class="row-between sec-head">
    <h2 class="section-label">Saved routes</h2>
    <div class="sec-actions">
      {#if $routes.length}<button class="text-btn plain" onclick={() => (editing = !editing)} aria-pressed={editing}>{editing ? 'Done' : 'Edit'}</button>{/if}
      <button class="btn btn-sm" onclick={() => navigate('/routes/new')}><Icon name="plus" size={18} /> Add</button>
    </div>
  </div>
  {#if $routes.length}
    <ul class="list">
      {#each $routes as r (r.id)}
        <li class="route-li" animate:flip={{ duration: $reducedMotion ? 0 : 200 }} out:slide={{ duration: $reducedMotion ? 0 : 180 }}>
          <button class="row" onclick={() => startRoute(r)} disabled={editing || !!$trip} aria-label="Start {r.name}, {r.via}, about {fmtDur(r.minutes)}">
            <span class="r-ic"><Icon name={r.stop?.pinned ? 'pin' : 'route'} size={20} /></span>
            <span class="grow"><strong>{r.name}</strong><span class="small muted">{r.via} · about {fmtDur(r.minutes)}</span></span>
            {#if !editing}<Icon name="chevronRight" size={20} />{/if}
          </button>
          {#if editing}
            <button class="icon-btn del" onclick={() => removeRoute(r)} aria-label="Delete route {r.name}"><Icon name="trash" size={20} /></button>
          {/if}
        </li>
      {/each}
    </ul>
    {#if $trip && !editing}<p class="small muted">Routes start once your current trip ends.</p>{/if}
  {:else}
    <p class="empty">No saved routes yet. Add one by typing a stop or pinning it on the map.</p>
  {/if}
</section>

<style>
  .home-hero { display: flex; flex-direction: column; gap: 8px; padding-bottom: 18px; position: relative; }
  .home-hero.alerting { --hero-from: #f19a7e; --hero-mid: #f8c7b5; --hero-to: #fdeee8; --hero-text: #3d1a12; --hero-text-2: #7a3b2c; }
  :global([data-theme='dark']) .home-hero.alerting { --hero-from: #6e2a22; --hero-mid: #3a1e1d; --hero-to: #171e2a; --hero-text: #ffe6e1; --hero-text-2: #f2b3a8; }
  .top { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 4px; }
  .top h1 { font-size: clamp(1rem, 4.4vw, 1.125rem); font-weight: 700; text-align: center; }
  .add-btn { color: var(--hero-text); background: var(--frost); margin-left: -4px; }
  .add-btn:hover { background: var(--frost); filter: brightness(1.08); }
  .date { display: inline-flex; align-items: center; gap: 5px; background: none; border: none; font: inherit; color: inherit; cursor: pointer; padding: 6px 8px; border-radius: 10px; }
  .date span { font-weight: 500; }
  .date:hover { background: var(--frost); }
  .phone-batt { display: inline-flex; flex-direction: column; align-items: center; gap: 1px; color: var(--hero-text); }
  .phone-batt small { font-size: 0.6875rem; color: var(--hero-text-2); }

  .trip-card {
    display: flex; flex-direction: column; gap: 8px; text-align: left; width: 100%; font: inherit; color: var(--hero-text); cursor: pointer;
    background: var(--frost); border: 1.5px solid color-mix(in srgb, var(--hero-text) 18%, transparent); border-radius: 18px; padding: 12px 14px;
    transition: transform 0.1s, filter 0.15s;
  }
  .trip-card:hover { filter: brightness(1.04); }
  .trip-card:active { transform: scale(0.99); }
  .tc-top { display: flex; align-items: center; gap: 8px; }
  .tc-top strong { flex: 1; min-width: 0; }
  .tc-min { font-weight: 800; font-size: 1.125rem; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .live { width: 10px; height: 10px; border-radius: 50%; background: #2fa565; box-shadow: 0 0 0 0 #2fa565; animation: live 1.6s ease-out infinite; flex-shrink: 0; }
  .tc-bar { height: 6px; border-radius: 999px; background: color-mix(in srgb, var(--hero-text) 14%, transparent); overflow: hidden; }
  .tc-bar span { display: block; height: 100%; background: linear-gradient(90deg, var(--meter-a), var(--meter-b)); border-radius: 999px; transition: width 0.9s linear; }
  .tc-sub { font-size: 0.8125rem; color: var(--hero-text-2); }

  .headline { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
  .big { font-size: clamp(3.5rem, 19vw, 5rem); font-weight: 200; line-height: 1; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
  .big small { font-size: 0.4em; font-weight: 300; color: var(--hero-text-2); }
  .big.zero { color: var(--hero-text-2); }
  .sub { font-size: 0.9375rem; margin-top: 4px; }
  .pills { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; padding-top: 6px; }
  .stage { display: grid; place-items: center; min-height: clamp(150px, 46vw, 200px); margin-top: 22px; }
  .status { display: flex; align-items: flex-start; justify-content: center; gap: 6px; text-align: center; font-size: clamp(0.9375rem, 4vw, 1rem); padding: 0 4px; }
  .status :global(svg) { flex-shrink: 0; margin-top: 3px; }
  .updated { text-align: center; font-size: 0.8125rem; color: var(--hero-text-2); margin-bottom: 8px; }

  .tag-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(120px, 42vw), 1fr)); gap: 10px; }
  .tag-mini { display: flex; flex-direction: column; gap: 6px; padding: 12px; min-height: 76px; }
  .tm-head { display: flex; align-items: center; gap: 6px; }
  .tag-mini.lost { background: var(--danger-soft); border-color: var(--danger-border); }
  .tag-mini.add {
    align-items: center; justify-content: center; flex-direction: row; border: 1.5px dashed var(--border-strong); border-radius: var(--radius);
    background: none; color: var(--primary); font: inherit; font-weight: 600; cursor: pointer; transition: background-color 0.15s;
  }
  .tag-mini.add:hover { background: var(--primary-soft); }

  .sec-head { margin-top: 10px; }
  .sec-head .section-label { margin-top: 0; }
  .sec-actions { display: flex; align-items: center; gap: 4px; }
  .text-btn.plain { color: var(--primary); }
  .text-btn.plain:hover { background: var(--primary-soft); }
  .route-li { display: flex; align-items: center; }
  .route-li .row { flex: 1; min-width: 0; }
  .route-li button.row:disabled { cursor: default; }
  .del { color: var(--danger); margin-right: 8px; }
  .del:hover { background: var(--danger-soft); }
  .r-ic { display: inline-grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; background: var(--primary-soft); color: var(--primary); flex-shrink: 0; }
  @keyframes live { 70% { box-shadow: 0 0 0 8px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
</style>
