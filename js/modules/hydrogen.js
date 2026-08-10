// 水素原子の電子軌道 (動径部分 x 実数球面調和関数)
import { radialHydrogen, realAngular, ORBITALS } from '../utils/math.js';
import { heatmap, heatColor } from '../utils/plot.js';
import { mountBeginnerBox } from '../utils/explainer.js';

export function initHydrogen(root) {
  root.innerHTML = `
    <div class="module-topbar"><div id="hy-beginner"></div></div>
    <div class="module-grid">
      <div class="controls">
        <h2>水素原子の軌道<br><span class="sub">Hydrogen Atom Orbitals</span></h2>
        <p class="desc">
          水素原子の電子の確率密度 |ψ<sub>nlm</sub>|² を xz 平面の断面図で表示します。
          動径部分はラゲール陪多項式、角度部分は実数球面調和関数(s, p, d軌道の形)で計算しています
          (ボーア半径 a₀=1 の原子単位系)。
        </p>
        <label>主量子数 n = <span id="hy-n-val">2</span>
          <input type="range" id="hy-n" min="1" max="4" step="1" value="2">
        </label>
        <label>軌道の種類
          <select id="hy-orb"></select>
        </label>
        <label>表示範囲 (原子単位) = <span id="hy-range-val">20</span>
          <input type="range" id="hy-range" min="8" max="40" step="1" value="20">
        </label>
        <div class="readout" id="hy-info"></div>
      </div>
      <div class="plots">
        <div class="plot-card square">
          <h3>電子密度 |ψ|² (xz平面断面, 明るいほど密度が高い)</h3>
          <canvas id="hy-map"></canvas>
        </div>
        <div class="plot-card">
          <h3>動径分布関数 4πr²|R<sub>nl</sub>(r)|²</h3>
          <canvas id="hy-radial"></canvas>
        </div>
      </div>
    </div>
  `;

  mountBeginnerBox(root.querySelector('#hy-beginner'), {
    what: '原子の中の電子は、よく教科書にあるような「惑星が太陽の周りを回る」ようには動いていません。実際は、雲やモヤのように空間に広がった「存在しやすさの分布」として原子核の周りに広がっています。この形が軌道ごとに違い、s軌道は球形、p軌道はダンベル型など、決まった模様になります。',
    analogy: '電子は「今どこにいるか」をピンポイントには言えず、「この辺りに現れやすい霧」のようなものだと考えてください。ヒートマップの明るい場所ほど、電子が見つかりやすい場所です。',
    steps: [
      '軌道の種類を「s」→「p_z」→「d_z²」と切り替えて、電子雲の形がどんどん複雑になっていく様子を見てみましょう。',
      '主量子数 n を増やすと、電子雲が原子核から遠くまで、より大きく広がっていくのが分かります。',
      '下の動径分布関数のグラフで、電子が原子核から「どのくらいの距離」に一番現れやすいかを確認できます。',
    ],
  });

  const nSlider = root.querySelector('#hy-n');
  const orbSelect = root.querySelector('#hy-orb');
  const rangeSlider = root.querySelector('#hy-range');
  const mapCanvas = root.querySelector('#hy-map');
  const radialCanvas = root.querySelector('#hy-radial');
  const infoBox = root.querySelector('#hy-info');

  function populateOrbitals() {
    const n = parseInt(nSlider.value, 10);
    const prevKey = orbSelect.value;
    orbSelect.innerHTML = '';
    for (const o of ORBITALS) {
      if (o.l > n - 1) continue;
      const opt = document.createElement('option');
      opt.value = o.key;
      opt.textContent = o.label;
      orbSelect.appendChild(opt);
    }
    if ([...orbSelect.options].some(o => o.value === prevKey)) orbSelect.value = prevKey;
  }

  function render() {
    const n = parseInt(nSlider.value, 10);
    root.querySelector('#hy-n-val').textContent = n;
    populateOrbitals();
    const orbKey = orbSelect.value;
    const orb = ORBITALS.find(o => o.key === orbKey) || ORBITALS[0];
    const l = orb.l;
    const range = parseFloat(rangeSlider.value);
    root.querySelector('#hy-range-val').textContent = range;

    const size = 220;
    const grid = new Float64Array(size * size);
    let maxVal = 0;
    for (let iz = 0; iz < size; iz++) {
      const z = range / 2 - (iz / (size - 1)) * range;
      for (let ix = 0; ix < size; ix++) {
        const x = -range / 2 + (ix / (size - 1)) * range;
        const r = Math.sqrt(x * x + z * z) || 1e-6;
        const theta = Math.acos(z / r);
        const phi = x >= 0 ? 0 : Math.PI;
        const R = radialHydrogen(n, l, r);
        const Y = realAngular(orbKey, theta, phi);
        const psi = R * Y;
        const dens = psi * psi;
        grid[iz * size + ix] = dens;
        if (dens > maxVal) maxVal = dens;
      }
    }
    const normGrid = new Float64Array(size * size);
    for (let i = 0; i < grid.length; i++) {
      normGrid[i] = maxVal > 0 ? Math.pow(grid[i] / maxVal, 0.35) : 0;
    }
    heatmap(mapCanvas, normGrid, size, heatColor);

    // 動径分布関数
    const rMax = range * 0.6;
    const Nr = 300;
    const rs = [], radialDist = [];
    for (let i = 0; i <= Nr; i++) {
      const r = (i / Nr) * rMax;
      const R = radialHydrogen(n, l, r);
      rs.push(r);
      radialDist.push(4 * Math.PI * r * r * R * R);
    }
    import('../utils/plot.js').then(({ linePlot }) => {
      linePlot(radialCanvas, [{ x: rs, y: radialDist, color: '#6ea8fe', width: 2, fill: 'rgba(110,168,254,0.15)' }],
        { xRange: [0, rMax] });
    });

    const En = -1 / (2 * n * n);
    infoBox.innerHTML =
      `n=${n}, l=${l}, 軌道: ${orb.label}<br>` +
      `<span class="unit">エネルギー E<sub>${n}</sub> = -1/(2n²) = ${En.toFixed(4)} Hartree (原子単位)</span>`;
  }

  nSlider.addEventListener('input', render);
  orbSelect.addEventListener('change', render);
  rangeSlider.addEventListener('input', render);
  populateOrbitals();
  render();
  return { render, cleanup() {} };
}
