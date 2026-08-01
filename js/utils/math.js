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

// --- 安全な数式パーサー (eval/Function を使わず、V(x) をユーザー入力から評価する) ---
// 対応: + - * / ^ 単項マイナス 括弧 sin cos tan exp sqrt abs log 定数 pi e 変数 x
const FUNCS = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  exp: Math.exp, sqrt: Math.sqrt, abs: Math.abs,
  log: Math.log, tanh: Math.tanh,
};
const CONSTS = { pi: Math.PI, e: Math.E };

function tokenize(expr) {
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < expr.length && /[0-9.]/.test(expr[j])) j++;
      tokens.push({ type: 'num', value: parseFloat(expr.slice(i, j)) });
      i = j;
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < expr.length && /[a-zA-Z_0-9]/.test(expr[j])) j++;
      tokens.push({ type: 'id', value: expr.slice(i, j) });
      i = j;
      continue;
    }
    if ('+-*/^(),'.includes(c)) {
      tokens.push({ type: 'op', value: c });
      i++;
      continue;
    }
    throw new Error(`不正な文字: "${c}"`);
  }
  return tokens;
}

// 再帰下降パーサー: expr -> term (('+'|'-') term)* ; term -> pow (('*'|'/') pow)* ;
// pow -> unary ('^' unary)* ; unary -> '-' unary | primary ; primary -> num | id | id '(' expr ')' | '(' expr ')'
function parseExpr(expr) {
  const tokens = tokenize(expr);
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  function parseAddSub() {
    let node = parseMulDiv();
    while (peek() && peek().type === 'op' && (peek().value === '+' || peek().value === '-')) {
      const op = next().value;
      const rhs = parseMulDiv();
      node = { type: 'bin', op, left: node, right: rhs };
    }
    return node;
  }
  function parseMulDiv() {
    let node = parsePow();
    while (peek() && peek().type === 'op' && (peek().value === '*' || peek().value === '/')) {
      const op = next().value;
      const rhs = parsePow();
      node = { type: 'bin', op, left: node, right: rhs };
    }
    return node;
  }
  function parsePow() {
    let node = parseUnary();
    if (peek() && peek().type === 'op' && peek().value === '^') {
      next();
      const rhs = parsePow();
      node = { type: 'bin', op: '^', left: node, right: rhs };
    }
    return node;
  }
  function parseUnary() {
    if (peek() && peek().type === 'op' && peek().value === '-') {
      next();
      return { type: 'neg', arg: parseUnary() };
    }
    return parsePrimary();
  }
  function parsePrimary() {
    const tok = peek();
    if (!tok) throw new Error('式が不完全です');
    if (tok.type === 'num') { next(); return { type: 'num', value: tok.value }; }
    if (tok.type === 'op' && tok.value === '(') {
      next();
      const node = parseAddSub();
      if (!peek() || peek().value !== ')') throw new Error(') が必要です');
      next();
      return node;
    }
    if (tok.type === 'id') {
      next();
      if (peek() && peek().type === 'op' && peek().value === '(') {
        next();
        const arg = parseAddSub();
        if (!peek() || peek().value !== ')') throw new Error(') が必要です');
        next();
        return { type: 'call', name: tok.value, arg };
      }
      return { type: 'id', name: tok.value };
    }
    throw new Error(`予期しないトークン: ${tok.value}`);
  }

  const ast = parseAddSub();
  if (pos < tokens.length) throw new Error('式の末尾が不正です');
  return ast;
}

function evalAst(node, x) {
  switch (node.type) {
    case 'num': return node.value;
    case 'neg': return -evalAst(node.arg, x);
    case 'id':
      if (node.name === 'x') return x;
      if (node.name in CONSTS) return CONSTS[node.name];
      throw new Error(`未定義の変数: ${node.name}`);
    case 'call': {
      if (!(node.name in FUNCS)) throw new Error(`未定義の関数: ${node.name}`);
      return FUNCS[node.name](evalAst(node.arg, x));
    }
    case 'bin': {
      const l = evalAst(node.left, x), r = evalAst(node.right, x);
      switch (node.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return l / r;
        case '^': return Math.pow(l, r);
      }
    }
  }
  throw new Error('評価に失敗しました');
}

// 式文字列を x -> 数値 の関数にコンパイルする (eval/Function 不使用)
export function compilePotential(expr) {
  const ast = parseExpr(expr);
  evalAst(ast, 0); // 早期に文法エラーを検出
  return (x) => evalAst(ast, x);
}

// 実対称行列の固有値・固有ベクトルを求める古典的 Jacobi 法
// A: Float64Array(n*n) row-major (破壊的に変更される), n: 次元
// 戻り値: { values: Float64Array(n), vectors: Float64Array(n*n) (列ベクトルが固有ベクトル) }
export function jacobiEigenSymmetric(A, n, maxSweeps = 100, tol = 1e-11) {
  const V = new Float64Array(n * n);
  for (let i = 0; i < n; i++) V[i * n + i] = 1;

  const at = (M, i, j) => M[i * n + j];
  const set = (M, i, j, v) => { M[i * n + j] = v; };

  for (let sweep = 0; sweep < maxSweeps; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) off += at(A, i, j) * at(A, i, j);
    if (off < tol) break;

    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = at(A, p, q);
        if (Math.abs(apq) < 1e-15) continue;
        const app = at(A, p, p), aqq = at(A, q, q);
        const phi = 0.5 * Math.atan2(2 * apq, aqq - app);
        const c = Math.cos(phi), s = Math.sin(phi);

        for (let k = 0; k < n; k++) {
          const akp = at(A, k, p), akq = at(A, k, q);
          set(A, k, p, c * akp - s * akq);
          set(A, k, q, s * akp + c * akq);
        }
        for (let k = 0; k < n; k++) {
          const apk = at(A, p, k), aqk = at(A, q, k);
          set(A, p, k, c * apk - s * aqk);
          set(A, q, k, s * apk + c * aqk);
        }
        for (let k = 0; k < n; k++) {
          const vkp = at(V, k, p), vkq = at(V, k, q);
          set(V, k, p, c * vkp - s * vkq);
          set(V, k, q, s * vkp + c * vkq);
        }
      }
    }
  }

  const values = new Float64Array(n);
  for (let i = 0; i < n; i++) values[i] = at(A, i, i);

  // 昇順ソート (固有ベクトルの列も並べ替え)
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => values[a] - values[b]);
  const sortedValues = new Float64Array(n);
  const sortedVectors = new Float64Array(n * n);
  for (let newIdx = 0; newIdx < n; newIdx++) {
    const oldIdx = order[newIdx];
    sortedValues[newIdx] = values[oldIdx];
    for (let k = 0; k < n; k++) sortedVectors[k * n + newIdx] = V[k * n + oldIdx];
  }
  return { values: sortedValues, vectors: sortedVectors };
}
