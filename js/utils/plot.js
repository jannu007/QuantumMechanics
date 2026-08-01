// Canvas 描画ユーティリティ (グラフ・ヒートマップ)

function dpr(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  if (canvas.width !== rect.width * ratio || canvas.height !== rect.height * ratio) {
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, w: rect.width, h: rect.height };
}

export function clear(canvas) {
  const { ctx, w, h } = dpr(canvas);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

// series: [{x:[...], y:[...], color, label}], xRange:[min,max], yRange:[min,max] (省略時は自動)
export function linePlot(canvas, series, opts = {}) {
  const { ctx, w, h } = clear(canvas);
  const pad = { l: 46, r: 16, t: 16, b: 30 };
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;

  let xMin = opts.xRange ? opts.xRange[0] : Infinity;
  let xMax = opts.xRange ? opts.xRange[1] : -Infinity;
  let yMin = opts.yRange ? opts.yRange[0] : Infinity;
  let yMax = opts.yRange ? opts.yRange[1] : -Infinity;

  if (!opts.xRange || !opts.yRange) {
    for (const s of series) {
      for (let i = 0; i < s.x.length; i++) {
        if (!opts.xRange) {
          if (s.x[i] < xMin) xMin = s.x[i];
          if (s.x[i] > xMax) xMax = s.x[i];
        }
        if (!opts.yRange) {
          if (s.y[i] < yMin) yMin = s.y[i];
          if (s.y[i] > yMax) yMax = s.y[i];
        }
      }
    }
  }
  if (yMin === yMax) { yMin -= 1; yMax += 1; }
  if (opts.symmetricY) {
    const m = Math.max(Math.abs(yMin), Math.abs(yMax));
    yMin = -m; yMax = m;
  }
  const yPad = (yMax - yMin) * 0.08;
  yMin -= yPad; yMax += yPad;

  const X = (x) => pad.l + ((x - xMin) / (xMax - xMin)) * plotW;
  const Y = (y) => pad.t + plotH - ((y - yMin) / (yMax - yMin)) * plotH;

  // 背景
  ctx.fillStyle = 'var(--plot-bg)';
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--plot-bg').trim() || '#0b1220';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // 軸
  const axisColor = getComputedStyle(document.documentElement).getPropertyValue('--axis').trim() || '#3a4a63';
  ctx.strokeStyle = axisColor;
  ctx.lineWidth = 1;
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = axisColor;

  // y=0 の軸線
  if (yMin < 0 && yMax > 0) {
    ctx.beginPath();
    ctx.moveTo(pad.l, Y(0));
    ctx.lineTo(pad.l + plotW, Y(0));
    ctx.stroke();
  }
  // 枠
  ctx.strokeRect(pad.l, pad.t, plotW, plotH);

  // 目盛り (x)
  const nTicksX = 5;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i <= nTicksX; i++) {
    const xv = xMin + (i / nTicksX) * (xMax - xMin);
    const px = X(xv);
    ctx.beginPath();
    ctx.moveTo(px, pad.t + plotH);
    ctx.lineTo(px, pad.t + plotH + 4);
    ctx.stroke();
    ctx.fillText(xv.toFixed(1), px, pad.t + plotH + 6);
  }
  // 目盛り (y)
  const nTicksY = 4;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= nTicksY; i++) {
    const yv = yMin + (i / nTicksY) * (yMax - yMin);
    const py = Y(yv);
    ctx.beginPath();
    ctx.moveTo(pad.l - 4, py);
    ctx.lineTo(pad.l, py);
    ctx.stroke();
    ctx.fillText(yv.toFixed(2), pad.l - 6, py);
  }

  // データ系列
  for (const s of series) {
    ctx.beginPath();
    ctx.strokeStyle = s.color || '#6ea8fe';
    ctx.lineWidth = s.width || 2;
    if (s.dash) ctx.setLineDash(s.dash); else ctx.setLineDash([]);
    for (let i = 0; i < s.x.length; i++) {
      const px = X(s.x[i]), py = Y(s.y[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    if (s.fill) {
      ctx.lineTo(X(s.x[s.x.length - 1]), Y(0));
      ctx.lineTo(X(s.x[0]), Y(0));
      ctx.closePath();
      ctx.fillStyle = s.fill;
      ctx.fill();
    }
  }

  return { X, Y, xMin, xMax, yMin, yMax, pad, plotW, plotH };
}

// grid: Float64Array (row-major, size x size), 値は0..1に正規化されている想定
export function heatmap(canvas, grid, size, colorFn) {
  const { ctx, w, h } = clear(canvas);
  const dim = Math.min(w, h);
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const octx = off.getContext('2d');
  const img = octx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = grid[i];
    const [r, g, b] = colorFn(v);
    img.data[i * 4] = r;
    img.data[i * 4 + 1] = g;
    img.data[i * 4 + 2] = b;
    img.data[i * 4 + 3] = 255;
  }
  octx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(off, (w - dim) / 2, (h - dim) / 2, dim, dim);
}

// 0..1 -> 青(低)～黒～黄(高) のようなヒートカラー
export function heatColor(v) {
  v = Math.max(0, Math.min(1, v));
  const stops = [
    [8, 12, 24], [30, 60, 120], [80, 140, 220], [255, 210, 90], [255, 250, 230],
  ];
  const pos = v * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(pos));
  const f = pos - i;
  const a = stops[i], b = stops[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}
