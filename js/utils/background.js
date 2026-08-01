// 背景の動的モーショングラフィックス: 漂う粒子と量子的な波紋 (外部ライブラリ不使用)
export function initBackground(canvas) {
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  let particles = [];
  let running = true;
  let t = 0;

  function accentRGB() {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim();
    return raw || '94, 234, 212';
  }

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(80, Math.round((w * h) / 22000));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: 1 + Math.random() * 1.8,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  function step() {
    t += 0.016;
    ctx.clearRect(0, 0, w, h);
    const rgb = accentRGB();

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -20) p.x = w + 20; else if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20; else if (p.y > h + 20) p.y = -20;
    }

    // 近い粒子同士を線でつなぐ (量子もつれ風の演出)
    const maxDist = Math.min(160, w / 8);
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.15;
          ctx.strokeStyle = `rgba(${rgb}, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    for (const p of particles) {
      const pulse = 0.55 + 0.45 * Math.sin(t * 1.2 + p.phase);
      ctx.beginPath();
      ctx.fillStyle = `rgba(${rgb}, ${0.25 + 0.35 * pulse})`;
      ctx.arc(p.x, p.y, p.r * (0.8 + 0.3 * pulse), 0, Math.PI * 2);
      ctx.fill();
    }

    if (running && !reduceMotion) requestAnimationFrame(step);
  }

  resize();
  window.addEventListener('resize', resize);
  if (!reduceMotion) requestAnimationFrame(step);
  else step(); // 静止画として一度だけ描画

  return {
    stop() { running = false; window.removeEventListener('resize', resize); },
  };
}
