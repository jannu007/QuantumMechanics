import { initInfiniteWell } from './modules/infiniteWell.js';
import { initOscillator } from './modules/oscillator.js';
import { initTunneling } from './modules/tunneling.js';
import { initHydrogen } from './modules/hydrogen.js';
import { initDoubleSlit } from './modules/doubleSlit.js';
import { initCustomPotential } from './modules/customPotential.js';
import { initBackground } from './utils/background.js';

initBackground(document.getElementById('bg-canvas'));

const MODULES = [
  { id: 'well', label: '無限井戸型ポテンシャル', init: initInfiniteWell },
  { id: 'oscillator', label: '調和振動子', init: initOscillator },
  { id: 'tunneling', label: 'トンネル効果', init: initTunneling },
  { id: 'hydrogen', label: '水素原子の軌道', init: initHydrogen },
  { id: 'doubleslit', label: '二重スリット実験', init: initDoubleSlit },
  { id: 'custom', label: '汎用ポテンシャル・ソルバー', init: initCustomPotential },
];

const tabsEl = document.getElementById('tabs');
const contentEl = document.getElementById('content');
let current = null;

function mount(id) {
  if (current && current.instance && current.instance.cleanup) current.instance.cleanup();
  const mod = MODULES.find(m => m.id === id);
  contentEl.innerHTML = '';
  const instance = mod.init(contentEl);
  current = { id, instance };
  for (const btn of tabsEl.querySelectorAll('button')) {
    btn.classList.toggle('active', btn.dataset.id === id);
  }
  location.hash = id;
}

for (const mod of MODULES) {
  const btn = document.createElement('button');
  btn.textContent = mod.label;
  btn.dataset.id = mod.id;
  btn.addEventListener('click', () => mount(mod.id));
  tabsEl.appendChild(btn);
}

window.addEventListener('resize', () => {
  if (current && current.instance && current.instance.render) current.instance.render();
});

const startId = MODULES.some(m => m.id === location.hash.slice(1)) ? location.hash.slice(1) : MODULES[0].id;
mount(startId);
