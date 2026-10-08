import { useEffect, useRef } from "react";

// Nền đầu trang: biểu trưng ProFind™ lệch phải, quầng sáng và các vành quỹ đạo quay chậm; chữ cổ/ký hiệu khoa học tỏa ra từ biểu trưng
// rồi hóa thành bit 0/1 và nối thành mạng nút dữ liệu.
const ANCIENT = ["α", "β", "π", "Σ", "∫", "∞", "λ", "Ω", "Ψ", "∂", "ℏ", "√", "道", "学", "知", "Aa", "φ", "θ"];
const GOLD: [number, number, number] = [245, 200, 110], CYAN: [number, number, number] = [110, 220, 255];
type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; g: string; bit: string; s: number; ph: number };

export function HeroArt() {
  const cv = useRef<HTMLCanvasElement>(null), em = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const c = cv.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, dpr = 1, raf = 0, vis = true, last = 0, acc = 0;
    const ps: P[] = [];
    const size = () => { const r = c.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height; c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    const max = () => (W < 600 ? 12 : 40);
    const spawn = (initial = false) => {
      const r = em.current?.getBoundingClientRect(), cr = c.getBoundingClientRect();
      const cx = r ? r.left - cr.left + r.width / 2 : W * 0.75, cy = r ? r.top - cr.top + r.height / 2 : H / 2, rad = r ? r.width * 0.42 : 120;
      const ang = Math.random() * 6.283, d = rad * (0.75 + Math.random() * 0.5), max_ = 5 + Math.random() * 4;
      ps.push({ x: cx + Math.cos(ang) * d, y: cy + Math.sin(ang) * d, vx: Math.cos(ang) * (8 + Math.random() * 10), vy: Math.sin(ang) * (8 + Math.random() * 10) - (10 + Math.random() * 14), life: initial ? Math.random() * max_ : 0, max: max_, g: ANCIENT[(Math.random() * ANCIENT.length) | 0], bit: Math.random() < 0.5 ? "0" : "1", s: 13 + Math.random() * 12, ph: Math.random() * 6.28 });
    };
    const draw = (dt: number) => {
      ctx.clearRect(0, 0, W, H);
      for (let i = ps.length - 1; i >= 0; i--) { const p = ps[i]; p.life += dt; if (p.life > p.max || p.y < -20) { ps.splice(i, 1); continue; } p.y += p.vy * dt; p.x += (p.vx + Math.sin(p.life * 1.3 + p.ph) * 9) * dt; }
      const lines = ps.filter((p) => p.life / p.max > 0.55);
      ctx.lineWidth = 1;
      for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++) { const a = lines[i], b = lines[j], d = Math.hypot(a.x - b.x, a.y - b.y); if (d < 90) { ctx.strokeStyle = `rgba(110,220,255,${(1 - d / 90) * 0.28})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } }
      for (const p of ps) {
        const t = p.life / p.max, digital = t > 0.55, k = digital ? Math.min(1, (t - 0.55) / 0.15) : 0;
        const col = GOLD.map((g, n) => Math.round(g + (CYAN[n] - g) * k)), a = Math.sin(Math.PI * Math.min(1, t * 1.05)) * 0.85;
        ctx.globalAlpha = Math.max(0, a); ctx.fillStyle = `rgb(${col})`; ctx.shadowColor = `rgb(${col})`; ctx.shadowBlur = W < 600 ? 0 : 12;
        if (digital) { ctx.font = `600 ${p.s * 0.9}px ui-monospace,Menlo,Consolas,monospace`; ctx.fillText(p.bit, p.x, p.y); ctx.beginPath(); ctx.arc(p.x + 2, p.y - p.s, 1.6, 0, 6.28); ctx.fill(); }
        else { ctx.font = `500 ${p.s}px "Space Grotesk",Georgia,"Times New Roman",serif`; ctx.fillText(p.g, p.x, p.y); }
      }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    };
    const frame = (ts: number) => {
      raf = requestAnimationFrame(frame);
      if (!vis || document.hidden) { last = ts; return; }
      const dt = Math.min(0.05, (ts - last) / 1000 || 0.016); last = ts;
      acc += dt; const every = W < 600 ? 0.45 : 0.17;
      while (acc > every) { acc -= every; if (ps.length < max()) spawn(); }
      draw(dt);
    };
    size();
    const n0 = Math.floor(max() * 0.7); for (let i = 0; i < n0; i++) spawn(true);
    if (still) { draw(0); } else raf = requestAnimationFrame(frame);
    const ro = new ResizeObserver(() => { size(); if (still) draw(0); }); ro.observe(c);
    const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting; }); io.observe(c);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, []);
  return (
    <div className="heroart" aria-hidden="true">
      <canvas ref={cv} />
      <div className="emblem" ref={em}>
        <i className="em-glow" />
        <svg className="em-rings" viewBox="0 0 400 400" fill="none">
          <circle cx="200" cy="200" r="196" stroke="rgba(125,211,252,.22)" strokeDasharray="2 9" />
          <circle cx="200" cy="200" r="160" stroke="rgba(245,200,110,.18)" />
          <g className="em-orbit"><circle cx="200" cy="4" r="4.5" fill="#7dd3fc" /><circle cx="361" cy="200" r="3.5" fill="#f6d98f" /></g>
          <g className="em-orbit rev"><circle cx="74" cy="200" r="4" fill="#c4b5fd" /><circle cx="200" cy="326" r="3" fill="#7dd3fc" /></g>
        </svg>
        <img className="em-logo" src="./logo-disc.svg" alt="" width="512" height="512" decoding="async" />
      </div>
    </div>
  );
}
