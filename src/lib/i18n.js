import { derived } from 'svelte/store';
import { settings } from './stores.js';

// English strings are the keys; Filipino covers the main labels.
const FIL = {
  Home: 'Home',
  Tags: 'Mga tag',
  Log: 'Talaan',
  Settings: 'Settings',
  Protected: 'Protektado',
  'Plan a trip': 'Magplano ng biyahe',
  'Saved routes · tap to start': 'Mga naka-save na ruta · i-tap para simulan',
  'Add tag': 'Magdagdag ng tag',
  'Where are you getting off?': 'Saan ka bababa?',
  'Start trip': 'Simulan ang biyahe',
  'End trip': 'Tapusin ang biyahe',
  'Your stop is near': 'Malapit na ang baba mo',
  "I'm awake": 'Gising na ako',
  'My tags': 'Mga tag ko',
  'Wristband not connected': 'Hindi konektado ang wristband',
  Wristband: 'Wristband',
  'detects now': 'nakikita ngayon',
  'Search for your stop': 'Hanapin ang hintuan mo',
  'How are you riding?': 'Ano ang sasakyan mo?',
  'Wake-up alerts': 'Mga paalala sa paggising',
  'Save this route': 'I-save ang rutang ito'
};

export const t = derived(settings, (s) => (key) => (s.lang === 'fil' && FIL[key]) || key);
