// 二重スリット実験: 干渉パターンと単一粒子の蓄積
import { linePlot } from '../utils/plot.js';

export function initDoubleSlit(root) {
  root.innerHTML = `
    <div class="module-grid">
      <div class="controls">
        <h2>二重スリット実験<span class="sub"><br>Double-Slit Experiment</span></h2>
        <p class="desc">
          電子や光子を1個ずつ発射しても、スクリーン上には波の干渉模様が現れます。
          「粒子であり波でもある」という量子力学の中心的な性質を体験できます。
        </p>
        <label>スリット間隔 d = <span id="ds-d-val">4.0</span>
          <input type="range" id="ds-d" min="1" max="10" step="0.1" value="4.0">
        </label>
        <label>スリット幅 a = <span id="ds-a-val">0.8</span>
          <input type="range" id="ds-a" min="0.1" max="3" step="0.1" value="0.8">
        </label>
        <label>波長 λ = <span id="ds-lambda-val">1.0</span>
          <input type="range" id="ds-lambda" min="0.2" max="3" step="0.1" value="1.0">
        </label>
        <label class="checkbox"><input type="checkbox" id="ds-single" checked> 片方のスリットのみ開ける</label>
        <div class="btn-row">
          <button id="ds-play">▶ 粒子を発射</button>
          <button id="ds-reset">スクリーンをクリア</button>
        </div>
        <div class="readout" id="ds-info">発射数: 0</div>
      </div>
      <div class="plots">
        <div class="plot-card">
          <h3>強度分布 I(θ) (理論値)</h3>
          <canvas id="ds-theory"></canvas>
        </div>
        <div class="plot-card">
          <h3>1粒子ずつの蓄積によるスクリーン模様</h3>
          <canvas id="ds-screen"></canvas>
        </div>
      </div>
    </div>
  `;

  const dSlider = root.querySelector('#ds-d');
  const aSlider = root.querySelector('#ds-a');
  const lambdaSlider = root.querySelector('#ds-lambda');
  const singleCheck = root.querySelector('#ds-single');
  const playBtn = root.querySelector('#ds-play');
  const resetBtn = root.querySelector('#ds-reset');
  const theoryCanvas = root.querySelector('#ds-theory');
  const screenCanvas = root.querySelector('#ds-screen');
  const infoBox = root.querySelector('#ds-info');

  const THETA_MAX = 1.2; // rad
  let hits = [];
  let running = false;
  let rafId = null;
  let count = 0;

  function sinc(x) { return x === 0 ? 1 : Math.sin(x) / x; }

  function intensity(theta) {
    const d = parseFloat(dSlider.value);
    const a = parseFloat(aSlider.value);
    const lambda = parseFloat(lambdaSlider.value);
    const beta = (Math.PI * a * Math.sin(theta)) / lambda;
    const single = sinc(beta) ** 2;
    if (singleCheck.checked) {
      // 単一スリット (回折のみ)
      return single;
    }
    const delta = (Math.PI * d * Math.sin(theta)) / lambda;
    return single * Math.cos(delta) ** 2;
  }

  function drawTheory() {
    const N = 400;
    const thetas = [], Is = [];
    for (let i = 0; i <= N; i++) {
      const th = -THETA_MAX + (2 * THETA_MAX * i) / N;
      thetas.push(th);
      Is.push(intensity(th));
    }
    linePlot(theoryCanvas, [{ x: thetas, y: Is, color: '#6ea8fe', width: 2, fill: 'rgba(110,168,254,0.15)' }],
      { xRange: [-THETA_MAX, THETA_MAX], yRange: [0, 1.05] });
  }

  // 逆変換サンプリング用の累積分布 (離散近似)
  function sampleTheta() {
    const N = 2000;
    if (!sampleTheta.cdf || sampleTheta.dirty) {
      const cdf = new Float64Array(N + 1);
      let sum = 0;
      const vals = new Float64Array(N + 1);
      for (let i = 0; i <= N; i++) {
        const th = -THETA_MAX + (2 * THETA_MAX * i) / N;
        vals[i] = Math.max(intensity(th), 0);
        sum += vals[i];
        cdf[i] = sum;
      }
      for (let i = 0; i <= N; i++) cdf[i] /= sum;
      sampleTheta.cdf = cdf;
      sampleTheta.dirty = false;
    }
    const r = Math.random();
    const cdf = sampleTheta.cdf;
    let lo = 0, hi = N;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < r) lo = mid + 1; else hi = mid;
    }
    return -THETA_MAX + (2 * THETA_MAX * lo) / N;
  }

  function invalidateSampler() { sampleTheta.dirty = true; }

  function drawScreen() {
    const { ctx, w, h } = screenCanvas.getContext ? { ctx: screenCanvas.getContext('2d'), w: screenCanvas.clientWidth, h: screenCanvas.clientHeight } : {};
    const ratio = window.devicePixelRatio || 1;
    if (screenCanvas.width !== screenCanvas.clientWidth * ratio) {
      screenCanvas.width = screenCanvas.clientWidth * ratio;
      screenCanvas.height = screenCanvas.clientHeight * ratio;
    }
    const c = screenCanvas.getContext('2d');
    c.setTransform(ratio, 0, 0, ratio, 0, 0);
    const W = screenCanvas.clientWidth, H = screenCanvas.clientHeight;
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--plot-bg').trim() || '#0b1220';
    c.fillStyle = bg;
    c.fillRect(0, 0, W, H);

    // ヒストグラムビン (縦方向の帯としてスクリーンを表現)
    const bins = 120;
    const counts = new Array(bins).fill(0);
    for (const th of hits) {
      const frac = (th + THETA_MAX) / (2 * THETA_MAX);
      const bin = Math.max(0, Math.min(bins - 1, Math.floor(frac * bins)));
      counts[bin]++;
    }
    const maxCount = Math.max(1, ...counts);
    const binW = W / bins;
    for (let i = 0; i < bins; i++) {
      const v = counts[i] / maxCount;
      c.fillStyle = `rgba(255,180,84,${0.15 + 0.85 * v})`;
      c.fillRect(i * binW, 0, binW + 1, H);
    }
    // 最新の粒子ヒットを点で強調
    c.fillStyle = '#fff';
    const recent = hits.slice(-40);
    for (const th of recent) {
      const frac = (th + THETA_MAX) / (2 * THETA_MAX);
      const x = frac * W;
      const y = H * (0.15 + 0.7 * Math.random());
      c.beginPath();
      c.arc(x, y, 1.6, 0, Math.PI * 2);
      c.fill();
    }
  }

  function fireBatch() {
    for (let i = 0; i < 6; i++) {
      hits.push(sampleTheta());
      count++;
    }
    if (hits.length > 20000) hits = hits.slice(-20000);
    drawScreen();
    infoBox.textContent = `発射数: ${count}`;
    if (running) rafId = requestAnimationFrame(fireBatch);
  }

  playBtn.addEventListener('click', () => {
    running = !running;
    playBtn.textContent = running ? '⏸ 一時停止' : '▶ 粒子を発射';
    if (running) fireBatch();
    else if (rafId) cancelAnimationFrame(rafId);
  });
  resetBtn.addEventListener('click', () => {
    hits = [];
    count = 0;
    drawScreen();
    infoBox.textContent = '発射数: 0';
  });

  for (const el of [dSlider, aSlider, lambdaSlider, singleCheck]) {
    el.addEventListener('input', () => {
      root.querySelector('#ds-d-val').textContent = parseFloat(dSlider.value).toFixed(1);
      root.querySelector('#ds-a-val').textContent = parseFloat(aSlider.value).toFixed(1);
      root.querySelector('#ds-lambda-val').textContent = parseFloat(lambdaSlider.value).toFixed(1);
      invalidateSampler();
      drawTheory();
    });
  }

  drawTheory();
  drawScreen();

  return {
    render() { drawTheory(); drawScreen(); },
    cleanup() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
    },
  };
}
