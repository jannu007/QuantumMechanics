// 特殊関数・数値計算ユーティリティ (外部ライブラリ不使用)

export function factorial(n) {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

// 物理学者エルミート多項式 H_n(x)
export function hermite(n, x) {
  if (n === 0) return 1;
  if (n === 1) return 2 * x;
  let h0 = 1, h1 = 2 * x;
  for (let k = 2; k <= n; k++) {
    const h2 = 2 * x * h1 - 2 * (k - 1) * h0;
    h0 = h1;
    h1 = h2;
  }
  return h1;
}

// ラゲール陪多項式 L_n^alpha(x)
export function assocLaguerre(n, alpha, x) {
  if (n === 0) return 1;
  if (n === 1) return 1 + alpha - x;
  let l0 = 1, l1 = 1 + alpha - x;
  for (let k = 2; k <= n; k++) {
    const l2 = ((2 * k - 1 + alpha - x) * l1 - (k - 1 + alpha) * l0) / k;
    l0 = l1;
    l1 = l2;
  }
  return l1;
}

// ルジャンドル陪多項式 P_l^m(x)  (0 <= m <= l)
export function assocLegendre(l, m, x) {
  let pmm = 1;
  if (m > 0) {
    const somx2 = Math.sqrt((1 - x) * (1 + x));
    let fact = 1;
    for (let i = 1; i <= m; i++) {
      pmm *= -fact * somx2;
      fact += 2;
    }
  }
  if (l === m) return pmm;
  let pmmp1 = x * (2 * m + 1) * pmm;
  if (l === m + 1) return pmmp1;
  let pll = 0;
  for (let ll = m + 2; ll <= l; ll++) {
    pll = ((2 * ll - 1) * x * pmmp1 - (ll + m - 1) * pmm) / (ll - m);
    pmm = pmmp1;
    pmmp1 = pll;
  }
  return pll;
}

// 実数球面調和関数の「形状」(規格化定数を除く角度部分)
// type: 's','pz','px','py','dz2','dxz','dyz','dx2y2','dxy'
export function realAngular(type, theta, phi) {
  const s = Math.sin(theta), c = Math.cos(theta);
  switch (type) {
    case 's': return 1;
    case 'pz': return c;
    case 'px': return s * Math.cos(phi);
    case 'py': return s * Math.sin(phi);
    case 'dz2': return 3 * c * c - 1;
    case 'dxz': return s * c * Math.cos(phi);
    case 'dyz': return s * c * Math.sin(phi);
    case 'dx2y2': return s * s * Math.cos(2 * phi);
    case 'dxy': return s * s * Math.sin(2 * phi);
    default: return 1;
  }
}

export const ORBITALS = [
  { key: 's', label: '1s/2s/3s (s)', l: 0 },
  { key: 'pz', label: 'p_z', l: 1 },
  { key: 'px', label: 'p_x', l: 1 },
  { key: 'py', label: 'p_y', l: 1 },
  { key: 'dz2', label: 'd_z²', l: 2 },
  { key: 'dxz', label: 'd_xz', l: 2 },
  { key: 'dyz', label: 'd_yz', l: 2 },
  { key: 'dx2y2', label: 'd_x²-y²', l: 2 },
  { key: 'dxy', label: 'd_xy', l: 2 },
];

// 水素原子 動径波動関数 R_nl(r)  (ボーア半径 a0=1 の原子単位系)
export function radialHydrogen(n, l, r) {
  const a0 = 1;
  const rho = (2 * r) / (n * a0);
  const norm = Math.sqrt(
    Math.pow(2 / (n * a0), 3) * factorial(n - l - 1) / (2 * n * factorial(n + l))
  );
  return norm * Math.exp(-rho / 2) * Math.pow(rho, l) * assocLaguerre(n - l - 1, 2 * l + 1, rho);
}

// 反復 Radix-2 Cooley-Tukey FFT (in-place, re/im は Float64Array、長さは2の累乗)
export function fft(re, im, invert) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((invert ? -1 : 1) * 2 * Math.PI) / len;
    const wRe = Math.cos(ang), wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1, curIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const uRe = re[i + k], uIm = im[i + k];
        const vRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm;
        const vIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe;
        re[i + k] = uRe + vRe;
        im[i + k] = uIm + vIm;
        re[i + k + len / 2] = uRe - vRe;
        im[i + k + len / 2] = uIm - vIm;
        const nextRe = curRe * wRe - curIm * wIm;
        const nextIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
        curIm = nextIm;
      }
    }
  }
  if (invert) {
    for (let i = 0; i < n; i++) {
      re[i] /= n;
      im[i] /= n;
    }
  }
}
