// 無限井戸型ポテンシャル (箱の中の粒子)
import { linePlot } from '../utils/plot.js';
import { mountBeginnerBox } from '../utils/explainer.js';

export function initInfiniteWell(root) {
  root.innerHTML = `
    <div class="module-topbar"><div id="iw-beginner"></div></div>
    <div class="module-grid">
      <div class="controls">
        <h2>無限井戸型ポテンシャル<br><span class="sub">Particle in a Box</span></h2>
        <p class="desc">
          幅 <b>L</b> の箱に閉じ込められた粒子の定常状態。壁の外では波動関数はゼロになります。
          エネルギーは離散的な値 <b>E<sub>n</sub> = n²π²ℏ²/(2mL²)</b> のみ許されます。
        </p>
        <label>量子数 n = <span id="iw-n-val">1</span>
          <input type="range" id="iw-n" min="1" max="12" step="1" value="1">
        </label>
        <label>箱の幅 L = <span id="iw-L-val">1.0</span>
          <input type="range" id="iw-L" min="0.5" max="3" step="0.1" value="1.0">
        </label>
        <label class="checkbox"><input type="checkbox" id="iw-prob" checked> 確率密度 |ψ|² を表示</label>
        <div class="readout" id="iw-energy"></div>
      </div>
      <div class="plots">
        <div class="plot-card">
          <h3>波動関数 ψ<sub>n</sub>(x) と確率密度</h3>
          <canvas id="iw-wave"></canvas>
        </div>
        <div class="plot-card">
          <h3>エネルギー準位図</h3>
          <canvas id="iw-levels"></canvas>
        </div>
      </div>
    </div>
  `;

  mountBeginnerBox(root.querySelector('#iw-beginner'), {
    what: '電子のような超小さな粒子を「箱」に閉じ込めると、粒子はどんなエネルギーでも持てるわけではなく、決まった特定のエネルギーしか取れなくなります。これが「量子化」と呼ばれる、量子力学の一番基本的な性質です。',
    analogy: '階段しかないビル。1階と2階の間の高さには立てず、決まった段にしか立てませんよね。粒子のエネルギーもそれと同じで、飛び飛びの値しか取れません。',
    steps: [
      '右の「量子数 n」のスライダーを動かしてみましょう。波の山の数がどんどん増えていきます。',
      '波の山が増えるほど、その状態のエネルギー(下のエネルギー準位図のオレンジの線)が高くなることを確認しましょう。',
      '「箱の幅 L」を狭くしてみましょう。エネルギーの間隔がさらに広がる=箱を小さくするほど、粒子は身動きが取りづらくエネルギーが上がりやすくなります。',
    ],
  });

  const nSlider = root.querySelector('#iw-n');
  const LSlider = root.querySelector('#iw-L');
  const probCheck = root.querySelector('#iw-prob');
  const waveCanvas = root.querySelector('#iw-wave');
  const levelsCanvas = root.querySelector('#iw-levels');

  function render() {
    const n = parseInt(nSlider.value, 10);
    const L = parseFloat(LSlider.value);
    root.querySelector('#iw-n-val').textContent = n;
    root.querySelector('#iw-L-val').textContent = L.toFixed(1);

    const N = 400;
    const xs = [], psi = [], prob = [];
    for (let i = 0; i <= N; i++) {
      const x = (i / N) * L;
      const p = Math.sqrt(2 / L) * Math.sin((n * Math.PI * x) / L);
      xs.push(x);
      psi.push(p);
      prob.push(p * p);
    }

    const series = [{ x: xs, y: psi, color: '#6ea8fe', label: 'ψ' }];
    if (probCheck.checked) {
      series.push({ x: xs, y: prob, color: '#ffb454', label: '|ψ|²', fill: 'rgba(255,180,84,0.15)' });
    }
    linePlot(waveCanvas, series, { symmetricY: !probCheck.checked });

    // エネルギー準位図 (ħ=1, m=1 の自然単位)
    const maxN = 8;
    const energies = [];
    for (let k = 1; k <= maxN; k++) energies.push((k * k * Math.PI * Math.PI) / (2 * L * L));
    const Emax = energies[maxN - 1] * 1.1;
    const lvlSeries = [];
    for (let k = 1; k <= maxN; k++) {
      lvlSeries.push({
        x: [0, 1], y: [energies[k - 1], energies[k - 1]],
        color: k === n ? '#ffb454' : '#4a5b78', width: k === n ? 3 : 1.5,
      });
    }
    linePlot(levelsCanvas, lvlSeries, { xRange: [0, 1], yRange: [0, Emax] });

    const En = (n * n * Math.PI * Math.PI) / (2 * L * L);
    root.querySelector('#iw-energy').innerHTML =
      `E<sub>${n}</sub> = ${En.toFixed(3)} <span class="unit">(ħ=m=1 の自然単位)</span>`;
  }

  nSlider.addEventListener('input', render);
  LSlider.addEventListener('input', render);
  probCheck.addEventListener('change', render);
  render();
  return { render, cleanup() {} };
}
