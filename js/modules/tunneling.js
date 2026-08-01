// 量子トンネル効果: ガウス波束のポテンシャル障壁への衝突 (split-step Fourier 法)
import { fft } from '../utils/math.js';
import { linePlot } from '../utils/plot.js';

const N = 512;      // グリッド点数 (2の累乗)
const XMIN = -30, XMAX = 30;
const DX = (XMAX - XMIN) / N;

export function initTunneling(root) {
  root.innerHTML = `
    <div class="module-grid">
      <div class="controls">
        <h2>量子トンネル効果<br><span class="sub">Quantum Tunneling</span></h2>
        <p class="desc">
          古典力学では乗り越えられないはずの障壁 (E &lt; V₀) を、量子力学的な波束は
          有限の確率で通り抜けます。split-step Fourier 法でシュレーディンガー方程式を
          数値的に時間発展させています (ħ=m=1 の自然単位)。
        </p>
        <label>波束の運動エネルギー E ≈ <span id="tn-e-val">1.0</span>
          <input type="range" id="tn-e" min="0.1" max="4" step="0.1" value="1.0">
        </label>
        <label>障壁の高さ V₀ = <span id="tn-v0-val">1.5</span>
          <input type="range" id="tn-v0" min="0.1" max="5" step="0.1" value="1.5">
        </label>
        <label>障壁の幅 a = <span id="tn-a-val">1.5</span>
          <input type="range" id="tn-a" min="0.2" max="5" step="0.1" value="1.5">
        </label>
        <div class="btn-row">
          <button id="tn-play">▶ 再生</button>
          <button id="tn-reset">リセット</button>
        </div>
        <div class="readout" id="tn-info"></div>
      </div>
      <div class="plots">
        <div class="plot-card">
          <h3>波束 |ψ(x,t)|² とポテンシャル障壁</h3>
          <canvas id="tn-wave"></canvas>
        </div>
        <div class="plot-card">
          <h3>透過率・反射率 (解析解, 定常状態近似)</h3>
          <canvas id="tn-coef"></canvas>
        </div>
      </div>
    </div>
  `;

  const eSlider = root.querySelector('#tn-e');
  const v0Slider = root.querySelector('#tn-v0');
  const aSlider = root.querySelector('#tn-a');
  const playBtn = root.querySelector('#tn-play');
  const resetBtn = root.querySelector('#tn-reset');
  const waveCanvas = root.querySelector('#tn-wave');
  const coefCanvas = root.querySelector('#tn-coef');
  const infoBox = root.querySelector('#tn-info');

  const xs = new Float64Array(N);
  for (let i = 0; i < N; i++) xs[i] = XMIN + i * DX;
  // 運動量グリッド (FFT順序: 0..N/2-1 が正, N/2..N-1 が負)
  const ks = new Float64Array(N);
  const dk = (2 * Math.PI) / (N * DX);
  for (let i = 0; i < N; i++) ks[i] = i < N / 2 ? i * dk : (i - N) * dk;

  let psiRe = new Float64Array(N);
  let psiIm = new Float64Array(N);
  let V = new Float64Array(N);
  let running = false;
  let rafId = null;
  let t = 0;
  const dt = 0.01;
  const stepsPerFrame = 4;

  function barrierBounds() {
    const a = parseFloat(aSlider.value);
    return { start: -a / 2, end: a / 2 };
  }

  function setupPotential() {
    const v0 = parseFloat(v0Slider.value);
    const { start, end } = barrierBounds();
    for (let i = 0; i < N; i++) {
      V[i] = (xs[i] >= start && xs[i] <= end) ? v0 : 0;
    }
  }

  function resetWave() {
    const E = parseFloat(eSlider.value);
    const k0 = Math.sqrt(2 * E);
    const sigma = 2.2;
    const x0 = -12;
    let norm = 0;
    for (let i = 0; i < N; i++) {
      const envelope = Math.exp(-((xs[i] - x0) ** 2) / (4 * sigma * sigma));
      psiRe[i] = envelope * Math.cos(k0 * xs[i]);
      psiIm[i] = envelope * Math.sin(k0 * xs[i]);
      norm += (psiRe[i] ** 2 + psiIm[i] ** 2) * DX;
    }
    const invSqrt = 1 / Math.sqrt(norm);
    for (let i = 0; i < N; i++) {
      psiRe[i] *= invSqrt;
      psiIm[i] *= invSqrt;
    }
    t = 0;
  }

  // 端での反射を防ぐ吸収層マスク
  const absorbMask = new Float64Array(N);
  (function buildMask() {
    const edge = N * 0.08;
    for (let i = 0; i < N; i++) {
      let m = 1;
      if (i < edge) m = Math.sin((Math.PI / 2) * (i / edge)) ** 2;
      else if (i > N - edge) m = Math.sin((Math.PI / 2) * ((N - i) / edge)) ** 2;
      absorbMask[i] = m;
    }
  })();

  function step() {
    // 半ステップ: ポテンシャル
    for (let i = 0; i < N; i++) {
      const phase = -V[i] * dt / 2;
      const c = Math.cos(phase), s = Math.sin(phase);
      const re = psiRe[i], im = psiIm[i];
      psiRe[i] = re * c - im * s;
      psiIm[i] = re * s + im * c;
    }
    // フルステップ: 運動エネルギー (フーリエ空間)
    fft(psiRe, psiIm, false);
    for (let i = 0; i < N; i++) {
      const phase = -(ks[i] * ks[i]) * dt / 2;
      const c = Math.cos(phase), s = Math.sin(phase);
      const re = psiRe[i], im = psiIm[i];
      psiRe[i] = re * c - im * s;
      psiIm[i] = re * s + im * c;
    }
    fft(psiRe, psiIm, true);
    // 半ステップ: ポテンシャル
    for (let i = 0; i < N; i++) {
      const phase = -V[i] * dt / 2;
      const c = Math.cos(phase), s = Math.sin(phase);
      const re = psiRe[i], im = psiIm[i];
      psiRe[i] = re * c - im * s;
      psiIm[i] = re * s + im * c;
    }
    // 吸収境界
    for (let i = 0; i < N; i++) {
      psiRe[i] *= absorbMask[i];
      psiIm[i] *= absorbMask[i];
    }
    t += dt;
  }

  function analyticT() {
    const E = parseFloat(eSlider.value);
    const V0 = parseFloat(v0Slider.value);
    const a = parseFloat(aSlider.value);
    if (E >= V0) {
      const k1 = Math.sqrt(2 * E);
      const k2 = Math.sqrt(2 * (E - V0));
      const num = 4 * k1 * k1 * k2 * k2;
      const den = num + (k1 * k1 - k2 * k2) ** 2 * Math.sin(k2 * a) ** 2;
      return num / den;
    }
    const kappa = Math.sqrt(2 * (V0 - E));
    const sh = Math.sinh(kappa * a);
    const T = 1 / (1 + (V0 * V0 * sh * sh) / (4 * E * (V0 - E)));
    return T;
  }

  function drawCoefficients() {
    const E = parseFloat(eSlider.value);
    const V0max = 5;
    const N2 = 200;
    const xsE = [], Ts = [], Rs = [];
    const V0 = parseFloat(v0Slider.value);
    const a = parseFloat(aSlider.value);
    for (let i = 0; i <= N2; i++) {
      const Ev = 0.05 + (i / N2) * V0max;
      let T;
      if (Ev >= V0) {
        const k1 = Math.sqrt(2 * Ev);
        const k2 = Math.sqrt(2 * (Ev - V0));
        const num = 4 * k1 * k1 * k2 * k2;
        const den = num + (k1 * k1 - k2 * k2) ** 2 * Math.sin(k2 * a) ** 2;
        T = den === 0 ? 1 : num / den;
      } else {
        const kappa = Math.sqrt(2 * (V0 - Ev));
        const sh = Math.sinh(kappa * a);
        T = 1 / (1 + (V0 * V0 * sh * sh) / (4 * Ev * (V0 - Ev)));
      }
      xsE.push(Ev);
      Ts.push(T);
      Rs.push(1 - T);
    }
    linePlot(coefCanvas, [
      { x: xsE, y: Ts, color: '#6ea8fe', width: 2 },
      { x: xsE, y: Rs, color: '#ff6b6b', width: 2, dash: [4, 3] },
      { x: [E, E], y: [0, 1], color: '#ffb454', width: 1.5, dash: [2, 2] },
    ], { xRange: [0, V0max], yRange: [0, 1] });
  }

  function drawWave() {
    const N2 = N;
    const prob = new Float64Array(N2);
    let maxP = 0;
    for (let i = 0; i < N2; i++) {
      prob[i] = psiRe[i] ** 2 + psiIm[i] ** 2;
      if (prob[i] > maxP) maxP = prob[i];
    }
    const scale = maxP > 0 ? 1 / maxP : 1;
    const v0 = parseFloat(v0Slider.value) || 1;
    const xsArr = Array.from(xs);
    const potScaled = Array.from(V, v => v / v0 * 0.9);
    linePlot(waveCanvas, [
      { x: xsArr, y: potScaled, color: '#5a6b8a', width: 1.5, fill: 'rgba(90,107,138,0.12)' },
      { x: xsArr, y: Array.from(prob, p => p * scale), color: '#ffb454', width: 2, fill: 'rgba(255,180,84,0.2)' },
    ], { xRange: [XMIN, XMAX], yRange: [0, 1.05] });
  }

  function computeTR() {
    const { end } = barrierBounds();
    let pTrans = 0, pRefl = 0, total = 0;
    for (let i = 0; i < N; i++) {
      const p = (psiRe[i] ** 2 + psiIm[i] ** 2) * DX;
      total += p;
      if (xs[i] > end + 1) pTrans += p;
      else if (xs[i] < -end - 1) pRefl += p;
    }
    return { pTrans, pRefl, total };
  }

  function updateInfo() {
    const T = analyticT();
    const { pTrans, pRefl } = computeTR();
    infoBox.innerHTML =
      `解析的透過率 T ≈ ${T.toFixed(4)} &nbsp;|&nbsp; 反射率 R ≈ ${(1 - T).toFixed(4)}<br>` +
      `<span class="unit">シミュレーション: t=${t.toFixed(2)}, 右側確率=${pTrans.toFixed(3)}, 左側確率=${pRefl.toFixed(3)}</span>`;
  }

  function loop() {
    for (let i = 0; i < stepsPerFrame; i++) step();
    drawWave();
    updateInfo();
    if (running) rafId = requestAnimationFrame(loop);
  }

  function fullReset() {
    running = false;
    playBtn.textContent = '▶ 再生';
    if (rafId) cancelAnimationFrame(rafId);
    setupPotential();
    resetWave();
    drawWave();
    drawCoefficients();
    updateInfo();
  }

  playBtn.addEventListener('click', () => {
    running = !running;
    playBtn.textContent = running ? '⏸ 一時停止' : '▶ 再生';
    if (running) loop();
    else if (rafId) cancelAnimationFrame(rafId);
  });
  resetBtn.addEventListener('click', fullReset);
  eSlider.addEventListener('input', () => {
    root.querySelector('#tn-e-val').textContent = parseFloat(eSlider.value).toFixed(1);
    fullReset();
  });
  v0Slider.addEventListener('input', () => {
    root.querySelector('#tn-v0-val').textContent = parseFloat(v0Slider.value).toFixed(1);
    fullReset();
  });
  aSlider.addEventListener('input', () => {
    root.querySelector('#tn-a-val').textContent = parseFloat(aSlider.value).toFixed(1);
    fullReset();
  });

  fullReset();

  return {
    render: fullReset,
    cleanup() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
    },
  };
}
