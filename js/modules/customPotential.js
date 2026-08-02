// 汎用ポテンシャル・ソルバー: 任意の V(x) を数値対角化してシュレーディンガー方程式を解く
// (機械学習ではなく、有限差分ハミルトニアン + Jacobi法による数値線形代数エンジン)
import { compilePotential, jacobiEigenSymmetric } from '../utils/math.js';
import { linePlot } from '../utils/plot.js';
import { mountBeginnerBox } from '../utils/explainer.js';

const PRESETS = [
  { label: '調和振動子: 0.5*x^2', expr: '0.5*x^2' },
  { label: '非調和 (四次項): 0.5*x^2 + 0.05*x^4', expr: '0.5*x^2 + 0.05*x^4' },
  { label: '二重井戸: 0.03*(x^2-9)^2', expr: '0.03*(x^2-9)^2' },
  { label: 'モースポテンシャル: 4*(1-exp(-0.5*x))^2', expr: '4*(1-exp(-0.5*x))^2' },
  { label: '周期的 (格子近似): 2*(1-cos(x))', expr: '2*(1-cos(x))' },
  { label: '非対称な井戸: 0.4*x^2 + 0.6*x', expr: '0.4*x^2 + 0.6*x' },
];

export function initCustomPotential(root) {
  root.innerHTML = `
    <div class="module-topbar"><div id="cp-beginner"></div></div>
    <div class="module-grid">
      <div class="controls">
        <h2>汎用ポテンシャル・ソルバー<br><span class="sub">Numerical Schrödinger Solver</span></h2>
        <p class="desc">
          <b>V(x) を自由に入力</b>すると、有限差分法でハミルトニアン行列を作り、
          Jacobi固有値アルゴリズムでその場で数値的に対角化し、固有エネルギーと波動関数を求めます。
          ※ 生成AI(LLM)ではなく、数値線形代数による物理シミュレーションエンジンです。
        </p>
        <label>プリセット
          <select id="cp-preset"></select>
        </label>
        <label>ポテンシャル V(x) =
          <input type="text" id="cp-expr" value="0.5*x^2" spellcheck="false" />
        </label>
        <div class="hint">使える記号: + - * / ^ ( ) sin cos tan exp sqrt abs log tanh pi e x</div>
        <label>x の範囲: ± <span id="cp-range-val">8</span>
          <input type="range" id="cp-range" min="3" max="20" step="0.5" value="8">
        </label>
        <label>表示する準位数 = <span id="cp-levels-val">6</span>
          <input type="range" id="cp-levels" min="1" max="10" step="1" value="6">
        </label>
        <div class="btn-row">
          <button id="cp-solve">⚙ 数値的に解く</button>
        </div>
        <div class="readout" id="cp-info">下の「数値的に解く」を押してください</div>
        <div class="error" id="cp-error"></div>
      </div>
      <div class="plots">
        <div class="plot-card">
          <h3>ポテンシャル V(x) と固有状態 (エネルギー位置にオフセットして表示)</h3>
          <canvas id="cp-wave"></canvas>
        </div>
        <div class="plot-card">
          <h3>エネルギー準位図</h3>
          <canvas id="cp-levels-plot"></canvas>
        </div>
      </div>
    </div>
  `;

  mountBeginnerBox(root.querySelector('#cp-beginner'), {
    what: 'これまでのタブは「決まった形」のポテンシャル(箱・バネ・障壁)でしたが、ここでは自分で好きな形の「エネルギーの地形」V(x)を作れます。式を入れて「解く」ボタンを押すだけで、コンピュータがその地形の中で粒子がとれるエネルギーと、その状態での波の形を自動的に計算してくれます。',
    analogy: '自分で山や谷の形をデザインして、そこにボールを転がしたらどんな動き方をするかをシミュレーションしてくれる「量子版の実験装置」のようなものです。',
    steps: [
      'まずは「プリセット」から好きな形を選んで「数値的に解く」を押してみましょう。',
      'エネルギー準位図(下のグラフ)に、その地形で許される飛び飛びのエネルギーが表示されます。',
      '「二重井戸」を選ぶと、2つの谷のエネルギーがペアのように近い値になることに気づくはずです。これも量子力学ならではの現象です。',
    ],
  });

  const presetSelect = root.querySelector('#cp-preset');
  const exprInput = root.querySelector('#cp-expr');
  const rangeSlider = root.querySelector('#cp-range');
  const levelsSlider = root.querySelector('#cp-levels');
  const solveBtn = root.querySelector('#cp-solve');
  const waveCanvas = root.querySelector('#cp-wave');
  const levelsCanvas = root.querySelector('#cp-levels-plot');
  const infoBox = root.querySelector('#cp-info');
  const errorBox = root.querySelector('#cp-error');

  for (const p of PRESETS) {
    const opt = document.createElement('option');
    opt.value = p.expr;
    opt.textContent = p.label;
    presetSelect.appendChild(opt);
  }

  let lastResult = null;

  function solve() {
    errorBox.textContent = '';
    const range = parseFloat(rangeSlider.value);
    root.querySelector('#cp-range-val').textContent = range;
    const nLevels = parseInt(levelsSlider.value, 10);
    root.querySelector('#cp-levels-val').textContent = nLevels;

    let Vfn;
    try {
      Vfn = compilePotential(exprInput.value);
      Vfn(0);
    } catch (e) {
      errorBox.textContent = `式エラー: ${e.message}`;
      return;
    }

    const N = 180;
    const xMin = -range, xMax = range;
    const dx = (xMax - xMin) / (N - 1);
    const xs = new Float64Array(N);
    const Vgrid = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      xs[i] = xMin + i * dx;
      let v;
      try { v = Vfn(xs[i]); } catch (e) { errorBox.textContent = `式エラー: ${e.message}`; return; }
      if (!Number.isFinite(v)) v = 1e6;
      Vgrid[i] = Math.min(v, 1e6);
    }

    const H = new Float64Array(N * N);
    const kOff = -1 / (2 * dx * dx);
    const kDiag = 1 / (dx * dx);
    for (let i = 0; i < N; i++) {
      H[i * N + i] = kDiag + Vgrid[i];
      if (i > 0) { H[i * N + i - 1] = kOff; H[(i - 1) * N + i] = kOff; }
    }

    infoBox.textContent = '計算中... (数値対角化を実行しています)';
    solveBtn.disabled = true;
    setTimeout(() => {
      const t0 = performance.now();
      const { values, vectors } = jacobiEigenSymmetric(H, N, 60);
      const elapsed = performance.now() - t0;

      const states = [];
      for (let n = 0; n < nLevels; n++) {
        const psi = new Float64Array(N);
        let norm = 0;
        for (let i = 0; i < N; i++) {
          psi[i] = vectors[i * N + n];
          norm += psi[i] * psi[i] * dx;
        }
        const invSqrt = 1 / Math.sqrt(norm);
        for (let i = 0; i < N; i++) psi[i] *= invSqrt;
        states.push({ energy: values[n], psi });
      }

      lastResult = { xs, Vgrid, states, elapsed, gridSize: N };
      render();
      solveBtn.disabled = false;
    }, 20);
  }

  function render() {
    if (!lastResult) return;
    const { xs, Vgrid, states, elapsed, gridSize } = lastResult;
    const xsArr = Array.from(xs);

    const Emax = states[states.length - 1].energy;
    const Emin = Math.min(0, states[0].energy, ...Array.from(Vgrid));
    const yTop = Emax + (Emax - Emin) * 0.35 + 0.5;

    const series = [{ x: xsArr, y: Array.from(Vgrid).map(v => Math.min(v, yTop)), color: '#5a6b8a', width: 1.5 }];
    const scale = (Emax - Emin || 1) * 0.09;
    const colors = ['#6ea8fe', '#ffb454', '#7be495', '#ff8fa3', '#c792ea', '#5ad1e6', '#f0e68c', '#ff9e64', '#9dfaa0', '#f7a1ff'];
    states.forEach((s, idx) => {
      const y = Array.from(s.psi).map(p => s.energy + p * scale);
      series.push({ x: xsArr, y, color: colors[idx % colors.length], width: 2 });
      series.push({ x: [xs[0], xs[xs.length - 1]], y: [s.energy, s.energy], color: colors[idx % colors.length], width: 1, dash: [2, 3] });
    });

    linePlot(waveCanvas, series, { xRange: [xs[0], xs[xs.length - 1]], yRange: [Emin - (Emax - Emin) * 0.1 - 0.3, yTop] });

    const lvlSeries = states.map((s, idx) => ({
      x: [0, 1], y: [s.energy, s.energy], color: colors[idx % colors.length], width: 2,
    }));
    linePlot(levelsCanvas, lvlSeries, { xRange: [0, 1], yRange: [Emin - 0.2, Emax + (Emax - Emin) * 0.15 + 0.3] });

    infoBox.innerHTML =
      `グリッド点数=${gridSize}, 対角化時間=${elapsed.toFixed(1)}ms<br>` +
      `<span class="unit">${states.map((s, i) => `E<sub>${i}</sub>=${s.energy.toFixed(3)}`).join(' &nbsp;')}</span>`;
  }

  presetSelect.addEventListener('change', () => {
    exprInput.value = presetSelect.value;
    solve();
  });
  exprInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') solve(); });
  solveBtn.addEventListener('click', solve);
  rangeSlider.addEventListener('change', solve);
  levelsSlider.addEventListener('change', solve);

  solve();

  return {
    render() { if (lastResult) render(); },
    cleanup() {},
  };
}
