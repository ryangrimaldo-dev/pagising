<script>
  // "Gising": an original 16×16 pixel buddy shaped like the wristband.
  // mood: happy | alert | sleepy | worried
  import { fly } from 'svelte/transition';
  import { buzz } from '../lib/sim.js';
  import { reducedMotion } from '../lib/stores.js';
  import Icon from './Icon.svelte';

  let { mood = 'happy', size = 160, interactive = true } = $props();

  const BASE = [
    '......kkkk......',
    '......kbbk......',
    '....kkkkkkkk....',
    '...kbbbbbbbbk...',
    '...kbssssssbk...',
    '...kbsessesbk...',
    '...kbsessesbk...',
    '..akbcsssscbka..',
    '..akbssmmssbka..',
    '...kbssssssbk...',
    '...kbbbbbbbbk...',
    '....kkkkkkkk....',
    '......kbbk......',
    '......kbbk......',
    '.....kk..kk.....',
    '................'
  ];

  const grid = $derived.by(() => {
    const g = BASE.map((r) => r.split(''));
    if (mood === 'sleepy') {
      g[5] = '...kbssssssbk...'.split(''); // closed eyes: one line
    }
    if (mood === 'alert') {
      g[8] = '..akbssmmssbka..'.split('');
      g[9] = '...kbssmmssbk...'.split(''); // open mouth
    }
    if (mood === 'worried') {
      g[8] = '..akbsmssmsbka..'.split(''); // wobbly frown
    }
    return g;
  });

  const TIPS = {
    happy: ['All your things are with you', 'Plan a trip and nap. I’ll wake you', 'Tap me any time to test a buzz'],
    alert: ['Something moved away. Check your tags!'],
    sleepy: ['Zz… I’ll buzz before your stop'],
    worried: ['I can’t reach the wristband. Reconnect me?']
  };
  let tip = $state('');
  let thinking = $state(false);
  let tipTimer;
  // Short "thinking" pause before the message so it doesn't pop instantly.
  function poke() {
    if (!interactive || thinking) return;
    buzz('stop10', 'Gising says hi');
    tip = '';
    thinking = true;
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => {
      thinking = false;
      const list = TIPS[mood];
      tip = list[Math.floor(Math.random() * list.length)];
      tipTimer = setTimeout(() => (tip = ''), 3400);
    }, 900);
  }
</script>

<div class="wrap" style="--s:min({size}px, 38vw)">
  <div class="bubble-slot" role="status" aria-live="polite">
    {#if thinking || tip}
      <p class="bubble {mood}" transition:fly={{ y: 8, duration: $reducedMotion ? 0 : 180 }}>
        {#if thinking}
          <span class="dots" aria-label="Gising is thinking"><i></i><i></i><i></i></span>
        {:else}
          <Icon name="sparkle" size={16} /> <span>{tip}</span>
        {/if}
      </p>
    {/if}
  </div>
  <svelte:element
    this={interactive ? 'button' : 'div'}
    class="mascot {mood}"
    data-mood={mood}
    onclick={poke}
    aria-label={interactive ? `Gising, your wristband buddy, looks ${mood}. Tap to test a buzz` : undefined}
    aria-hidden={interactive ? undefined : 'true'}
    role={interactive ? undefined : 'presentation'}>
    <svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">
      {#each grid as row, y}
        {#each row as c, x}
          {#if c !== '.'}<rect {x} {y} width="1.02" height="1.02" class="p-{c}" />{/if}
        {/each}
      {/each}
    </svg>
    {#if mood === 'sleepy'}<span class="zz" aria-hidden="true">z<span>z</span></span>{/if}
    {#if mood === 'alert'}<span class="bang l" aria-hidden="true">!</span><span class="bang r" aria-hidden="true">!</span>{/if}
  </svelte:element>
</div>

<style>
  .wrap { position: relative; display: flex; flex-direction: column; align-items: center; }
  .mascot {
    --body: #f2a93b; --screen: #fff6dd; --ink: #2b2112; --cheek: #ff8f8f; --arm: #e0922a;
    position: relative; width: var(--s); height: var(--s); padding: 0; border: none; background: none; cursor: pointer;
    border-radius: 24px; animation: bob 2.4s ease-in-out infinite;
  }
  div.mascot { cursor: default; }
  .mascot:hover svg { transform: scale(1.04); }
  .mascot:active svg { transform: scale(0.96); }
  svg { width: 100%; height: 100%; display: block; transition: transform 0.15s; filter: drop-shadow(0 6px 0 rgb(0 0 0 / 0.08)); }
  .p-k { fill: var(--ink); }
  .p-b { fill: var(--body); }
  .p-a { fill: var(--arm); }
  .p-s { fill: var(--screen); }
  .p-e, .p-m { fill: var(--ink); }
  .p-c { fill: var(--cheek); }
  .happy .p-e { animation: blink 4s infinite; transform-box: fill-box; transform-origin: center; }
  .alert { --body: #ff7a6b; --arm: #e65a4a; --screen: #fff0ee; animation: shake 0.2s linear infinite; }
  .sleepy { --screen: #e9e2ff; animation-duration: 4s; }
  .worried { --body: #aab2bf; --arm: #949cab; --screen: #eef1f5; --cheek: #c9cfd8; animation: none; }
  .zz, .bang { position: absolute; font-weight: 800; color: var(--text-2); font-size: calc(var(--s) * 0.16); }
  .zz { right: -4%; top: 2%; animation: float 2.4s ease-in-out infinite; }
  .zz span { font-size: 0.7em; margin-left: 2px; }
  .bang {
    width: calc(var(--s) * 0.18); height: calc(var(--s) * 0.18); display: grid; place-items: center; border-radius: 50%;
    background: #3a3f48; color: #fff; font-size: calc(var(--s) * 0.11);
  }
  .bang.l { left: -14%; top: 8%; }
  .bang.r { right: -12%; bottom: 18%; }
  .bubble-slot { position: absolute; bottom: calc(100% + 10px); left: 50%; transform: translateX(-50%); z-index: 3; width: max-content; max-width: min(260px, 78vw); }
  /* Sticker-style speech bubble: chunky pill, soft inner glow, tail pointing at Gising */
  .bubble {
    --bg: #ff3e9d; --fg: #ffffff; --edge: #ff9ccc;
    position: relative; display: flex; align-items: center; gap: 6px; margin: 0; padding: 10px 16px;
    background: var(--bg); color: var(--fg); border-radius: 22px; font-weight: 700; font-size: 0.9375rem; line-height: 1.3; text-align: left;
    box-shadow: inset 0 0 0 3px var(--edge), inset 0 -6px 12px rgb(0 0 0 / 0.08), 0 8px 18px rgb(0 0 0 / 0.16);
    transform: rotate(-2deg); animation: pop 0.32s cubic-bezier(0.3, 1.6, 0.5, 1);
  }
  .bubble::after {
    content: ''; position: absolute; left: 50%; bottom: -9px; width: 18px; height: 18px; background: var(--bg);
    transform: translateX(-50%) rotate(45deg); border-radius: 0 0 5px 0; box-shadow: inset -3px -3px 0 var(--edge);
  }
  .bubble :global(svg) { flex-shrink: 0; }
  .bubble.alert { --bg: #4b2fd1; --edge: #8c7bff; }
  .bubble.sleepy { --bg: #fff6d8; --fg: #a46a00; --edge: #ffe08a; }
  .bubble.worried { --bg: #e9ecf2; --fg: #3a4150; --edge: #c7cdd8; }
  .dots { display: inline-flex; gap: 5px; padding: 3px 2px; }
  .dots i { width: 7px; height: 7px; border-radius: 50%; background: currentColor; animation: dot 0.9s ease-in-out infinite; }
  .dots i:nth-child(2) { animation-delay: 0.15s; }
  .dots i:nth-child(3) { animation-delay: 0.3s; }
  @keyframes pop { from { transform: rotate(-2deg) scale(0.6); opacity: 0; } }
  @keyframes dot { 0%, 100% { transform: translateY(0); opacity: 0.5; } 50% { transform: translateY(-4px); opacity: 1; } }
  @keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
  @keyframes blink { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }
  @keyframes float { 0%, 100% { transform: translateY(0); opacity: 0.6; } 50% { transform: translateY(-6px); opacity: 1; } }
</style>
