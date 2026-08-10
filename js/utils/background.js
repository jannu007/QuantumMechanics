// 宇宙空間を思わせる動的背景: 視差の効いた星々の瞬き・流れ星・星座風の結線 (外部ライブラリ不使用)
export function initBackground(canvas) {
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  let stars = [];
  let shootingStars = [];
  let running = true;
  let t = 0;
  let nextShootAt = 2;

  const STAR_COLORS = ['255,255,255', '200,220,255', '180,200,255', '255,235,200'];

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.min(260, Math.round((w * h) / 6500));
    stars = Array.from({ length: count }, () => {
      const layer = 1 + Math.floor(Math.random() * 3); // 1=奥(遅い) 3=手前(速い)
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        layer,
        r: 0.4 + layer * 0.35 + Math.random() * 0.6,
        baseAlpha: 0.35 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.4 + Math.random() * 1.2,
        drift: (0.015 + layer * 0.018) * (Math.random() < 0.5 ? -1 : 1),
        color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      };
    });
  }

  function spawnShootingStar() {
    const fromLeft = Math.random() < 0.5;
    const y0 = Math.random() * h * 0.5;
    const x0 = fromLeft ? -40 : w + 40;
    const speed = 9 + Math.random() * 6;
    const angle = fromLeft ? (Math.PI / 7) * (0.6 + Math.random() * 0.6) : Math.PI - (Math.PI / 7) * (0.6 + Math.random() * 0.6);
    shootingStars.push({
      x: x0, y: y0,
      vx: Math.cos(angle) * speed * (fromLeft ? 1 : -1),
      vy: Math.sin(angle) * speed,
      life: 1,
      trail: [],
    });
  }

  function step() {
    t += 0.016;
    ctx.clearRect(0, 0, w, h);

    // 星の位置更新 (ごくゆっくり流れる視差効果)
    for (const s of stars) {
      s.x += s.drift * 0.06;
      if (s.x < -5) s.x = w + 5;
      else if (s.x > w + 5) s.x = -5;
    }

    // 星座風の結線 (手前の層のみ、控えめに)
    const near = stars.filter(s => s.layer === 3);
    const maxDist = Math.min(130, w / 9);
    for (let i = 0; i < near.length; i++) {
      for (let j = i + 1; j < near.length; j++) {
        const a = near[i], b = near[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.12;
          ctx.strokeStyle = `rgba(150, 190, 255, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // 星の描画 (瞬き)
    for (const s of stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.phase);
      const alpha = s.baseAlpha * (0.55 + 0.45 * twinkle);
      ctx.beginPath();
      ctx.fillStyle = `rgba(${s.color}, ${alpha})`;
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      if (s.layer === 3 && twinkle > 0.85) {
        ctx.beginPath();
        ctx.fillStyle = `rgba(${s.color}, ${alpha * 0.25})`;
        ctx.arc(s.x, s.y, s.r * 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 流れ星の生成
    if (!reduceMotion && t >= nextShootAt) {
      spawnShootingStar();
      nextShootAt = t + 3 + Math.random() * 5;
    }

    // 流れ星の更新・描画
    shootingStars = shootingStars.filter(m => m.life > 0);
    for (const m of shootingStars) {
      m.trail.push({ x: m.x, y: m.y });
      if (m.trail.length > 14) m.trail.shift();
      m.x += m.vx;
      m.y += m.vy;
      m.life -= 0.012;

      for (let i = 0; i < m.trail.length - 1; i++) {
        const p0 = m.trail[i], p1 = m.trail[i + 1];
        const a = (i / m.trail.length) * m.life * 0.8;
        ctx.strokeStyle = `rgba(255, 255, 255, ${a})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(m.life, 0)})`;
      ctx.arc(m.x, m.y, 1.8, 0, Math.PI * 2);
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
