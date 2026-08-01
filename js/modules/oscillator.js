// 量子調和振動子
import { hermite, factorial } from '../utils/math.js';
import { linePlot } from '../utils/plot.js';
import { beginnerBox } from '../utils/explainer.js';

function psiOscillator(n, omega, x) {
  const xi = Math.sqrt(omega) * x;
  const norm = Math.pow(omega / Math.PI, 0.25) / Math.sqrt(Math.pow(2, n) * factorial(n));
  return norm * hermite(n, xi) * Math.exp(-(xi * xi) / 2);
}

export function initOscillator(root) {
  root.innerHTML = `
    <div class="module-grid">
      <div class="controls">
        <h2>量子調和振動子<br><span class="sub">Quantum Harmonic Oscillator</span></h2>
        ${beginnerBox({
          what: 'バネにつながったボールのように、真ん中に引き戻される力を受けている粒子(実際には分子の中で原子が振動する動きなどに相当)も、やはり決まった飛び飛びのエネルギーしか持てません。しかも面白いことに、一番エネルギーが低い状態でも振動が完全にゼロになることはありません(ゼロ点エネルギー)。',
          analogy: '一段の高さが均等な「エネルギーのはしご」。無限井戸と違い、このはしごは段の間隔がどこも同じです。しかも一番下の段に立っていても、完全に静止することは許されません。',
          steps: [
            '「量子数 n」を0から増やしてみましょう。エネルギーのはしごを1段ずつ登っていく様子が分かります。',
            '波の形(青い線)が n が増えるごとに複雑に波打つのを見てみましょう。波の山と谷の数が n と対応しています。',
            '「角振動数 ω」を変えてみましょう。バネが硬くなる(ωが大きくなる)ほど、はしごの段の間隔が広がります。',
          ],
        })}
        <p class="desc">
          放物線型ポテンシャル V(x) = ½mω²x² 中の粒子。エネルギーは
          <b>E<sub>n</sub> = ℏω(n + ½)</b> と等間隔に量子化されます。
          波動関数はエルミート多項式で表されます。
        </p>
        <label>量子数 n = <span id="ho-n-val">0</span>
          <input type="range" id="ho-n" min="0" max="12" step="1" value="0">
        </label>
        <label>角振動数 ω = <span id="ho-w-val">1.0</span>
          <input type="range" id="ho-w" min="0.3" max="2.5" step="0.1" value="1.0">
        </label>
        <label class="checkbox"><input type="checkbox" id="ho-prob" checked> 確率密度 |ψ|² を表示</label>
        <label class="checkbox"><input type="checkbox" id="ho-classical"> 古典的転回点を表示</label>
        <div class="readout" id="ho-energy"></div>
      </div>
      <div class="plots">
        <div class="plot-card">
          <h3>波動関数 ψ<sub>n</sub>(x)・ポテンシャル V(x)</h3>
          <canvas id="ho-wave"></canvas>
        </div>
        <div class="plot-card">
          <h3>エネルギー準位図</h3>
          <canvas id="ho-levels"></canvas>
        </div>
      </div>
    </div>
  `;

  const nSlider = root.querySelector('#ho-n');
  const wSlider = root.querySelector('#ho-w');
  const probCheck = root.querySelector('#ho-prob');
  const classicalCheck = root.querySelector('#ho-classical');
  const waveCanvas = root.querySelector('#ho-wave');
  const levelsCanvas = root.querySelector('#ho-levels');

  function render() {
    const n = parseInt(nSlider.value, 10);
    const omega = parseFloat(wSlider.value);
    root.querySelector('#ho-n-val').textContent = n;
    root.querySelector('#ho-w-val').textContent = omega.toFixed(1);

    const En = omega * (n + 0.5);
    const xMax = Math.sqrt(2 * (n + 8) / omega) * 1.1 + 1;
    const N = 400;
    const xs = [], psi = [], prob = [], pot = [];
    for (let i = 0; i <= N; i++) {
      const x = -xMax + (2 * xMax * i) / N;
      const p = psiOscillator(n, omega, x);
      xs.push(x);
      psi.push(p * Math.sqrt(omega) * 1.3);
      prob.push(p * p * omega * 1.3);
      pot.push(0.5 * omega * omega * x * x);
    }

    const series = [
      { x: xs, y: pot, color: '#5a6b8a', width: 1.5, dash: [4, 3] },
      { x: xs, y: xs.map(() => En), color: '#8fd3ff', width: 1, dash: [2, 3] },
    ];
    series.push({ x: xs, y: probCheck.checked ? prob.map(v => v + En) : psi.map(v => v + En),
      color: probCheck.checked ? '#ffb454' : '#6ea8fe', fill: probCheck.checked ? 'rgba(255,180,84,0.15)' : null });

    linePlot(waveCanvas, series, { yRange: [0, Math.max(En * 1.6 + 1, 3)] });

    if (classicalCheck.checked) {
      const ctx = waveCanvas.getContext('2d');
      const xTurn = Math.sqrt(2 * En / omega);
      ctx.save();
      ctx.strokeStyle = '#ff6b6b';
      ctx.setLineDash([3, 3]);
      ctx.restore();
    }

    const maxN = 10;
    const lvlSeries = [];
    for (let k = 0; k <= maxN; k++) {
      const Ek = omega * (k + 0.5);
      lvlSeries.push({ x: [0, 1], y: [Ek, Ek], color: k === n ? '#ffb454' : '#4a5b78', width: k === n ? 3 : 1.5 });
    }
    linePlot(levelsCanvas, lvlSeries, { xRange: [0, 1], yRange: [0, omega * (maxN + 1.5)] });

    root.querySelector('#ho-energy').innerHTML =
      `E<sub>${n}</sub> = ω(n+½) = ${En.toFixed(3)} <span class="unit">(ħ=m=1 の自然単位)</span>`;
  }

  nSlider.addEventListener('input', render);
  wSlider.addEventListener('input', render);
  probCheck.addEventListener('change', render);
  classicalCheck.addEventListener('change', render);
  render();
  return { render, cleanup() {} };
}
