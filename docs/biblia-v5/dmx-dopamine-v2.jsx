import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════
// DMX SPATIAL — DOPAMINE EDITION 🔥
// Full light · Vibrant · 3D · Alive
// ═══════════════════════════════════════════════════════════════

const T = {
  bg: "#F5F3F0",
  bgCream: "#FAF8F5",
  bgLavender: "#F0EEFF",
  bgMint: "#EDFAF5",
  bgPeach: "#FFF3ED",
  bgSlate: "#F0F2F7",
  white: "#FFFFFF",
  text: "#111118",
  textSoft: "#44445A",
  textMuted: "#8888A0",
  indigo: "#6366F1",
  violet: "#8B5CF6",
  pink: "#E946A8",
  coral: "#F97316",
  emerald: "#10B981",
  sky: "#0EA5E9",
  amber: "#EAB308",
  rose: "#F43F5E",
  border: "#E6E4DF",
  gradP: "linear-gradient(135deg, #6366F1, #EC4899)",
  gradWarm: "linear-gradient(135deg, #F97316, #EC4899)",
  gradCool: "linear-gradient(135deg, #6366F1, #0EA5E9)",
  gradFresh: "linear-gradient(135deg, #10B981, #0EA5E9)",
  gradSunset: "linear-gradient(135deg, #F97316, #EAB308)",
};

function useInView(t = 0.1) {
  const ref = useRef(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); o.disconnect(); } }, { threshold: t });
    o.observe(el); return () => o.disconnect();
  }, [t]);
  return [ref, v];
}

function useMouse(i = 0.02) {
  const [o, setO] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const h = (e) => { setO({ x: (e.clientX / window.innerWidth - 0.5) * i * 100, y: (e.clientY / window.innerHeight - 0.5) * i * 100 }); };
    window.addEventListener("mousemove", h); return () => window.removeEventListener("mousemove", h);
  }, [i]);
  return o;
}

function AnimNum({ target, suffix = "", dur = 1800 }) {
  const [v, setV] = useState(0);
  const [ref, vis] = useInView(0.3);
  useEffect(() => {
    if (!vis) return; const s = performance.now();
    const step = (n) => { const p = Math.min((n - s) / dur, 1); setV(Math.round((1 - Math.pow(1 - p, 4)) * target)); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }, [vis, target, dur]);
  return <span ref={ref}>{v.toLocaleString()}{suffix}</span>;
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Outfit:wght@400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;-webkit-font-smoothing:antialiased}
body{font-family:'DM Sans',sans-serif;color:#111118;background:#F5F3F0;overflow-x:hidden}
::selection{background:#6366F1;color:#fff}
button{cursor:pointer;border:none;background:none;font-family:inherit}

@keyframes floatSlow{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-20px) rotate(2deg)}}
@keyframes floatMed{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-14px) rotate(-1.5deg)}}
@keyframes floatFast{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes spinSlow{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.15);opacity:1}}
@keyframes scoreBar{from{width:0}}
@keyframes barGrow{from{transform:scaleY(0)}}
@keyframes slideIn{from{opacity:0;transform:translateX(60px)}to{opacity:1;transform:translateX(0)}}
@keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes gradShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes shimmer{0%{left:-100%}100%{left:200%}}
@keyframes popIn{from{opacity:0;transform:scale(0.7) translateY(30px)}to{opacity:1;transform:scale(1) translateY(0)}}
@keyframes cardFloat{0%,100%{transform:translateY(0) rotateX(0) rotateY(0)}25%{transform:translateY(-6px) rotateX(1deg) rotateY(-1deg)}75%{transform:translateY(-3px) rotateX(-0.5deg) rotateY(0.5deg)}}
@keyframes glowPulse{0%,100%{box-shadow:0 0 20px rgba(99,102,241,0.1)}50%{box-shadow:0 0 40px rgba(99,102,241,0.2),0 0 80px rgba(236,72,153,0.08)}}
@keyframes carousel{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes orbit{from{transform:rotate(0deg) translateX(130px) rotate(0deg)}to{transform:rotate(360deg) translateX(130px) rotate(-360deg)}}
@keyframes spinReverse{from{transform:rotate(360deg)}to{transform:rotate(0deg)}}
@keyframes morphBlob{0%{border-radius:40% 60% 60% 40%/60% 30% 70% 40%}33%{border-radius:50% 40% 55% 45%/45% 55% 35% 65%}66%{border-radius:35% 65% 45% 55%/55% 40% 60% 40%}100%{border-radius:40% 60% 60% 40%/60% 30% 70% 40%}}
@keyframes breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
@keyframes staggerUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
@keyframes gridPulse{0%,100%{opacity:.3}50%{opacity:.55}}

::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-thumb{background:linear-gradient(#6366F1,#EC4899);border-radius:3px}
`;

const Arrow = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;

const PHOTOS = [
  "https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=800&q=80",
  "https://images.unsplash.com/photo-1585464231875-d9ef1f5ad396?w=800&q=80",
  "https://images.unsplash.com/photo-1573108037329-37aa135a142e?w=800&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
  "https://images.unsplash.com/photo-1582407947092-50af52e82325?w=800&q=80",
];

// ─── INTERACTIVE PARTICLE FIELD ─────────────────────────────
function ParticleField() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    let w = c.width = c.parentElement.offsetWidth, h = c.height = c.parentElement.offsetHeight;
    let mouse = { x: w/2, y: h/2 }, ps = [], anim;
    class P {
      constructor() { this.x = Math.random()*w; this.y = Math.random()*h; this.s = Math.random()*2.2+0.5; this.vx = (Math.random()-0.5)*0.35; this.vy = (Math.random()-0.5)*0.35; this.o = Math.random()*0.4+0.1; this.h = Math.random()>0.5?240:320; }
      update() { this.x+=this.vx; this.y+=this.vy; const dx=mouse.x-this.x,dy=mouse.y-this.y,d=Math.sqrt(dx*dx+dy*dy); if(d<140){this.x-=dx*0.006;this.y-=dy*0.006;this.o=Math.min(this.o+0.015,0.7);}else{this.o=Math.max(this.o-0.003,0.1);} if(this.x<0||this.x>w)this.vx*=-1;if(this.y<0||this.y>h)this.vy*=-1; }
      draw() { ctx.beginPath(); ctx.arc(this.x,this.y,this.s,0,Math.PI*2); ctx.fillStyle=`hsla(${this.h},80%,65%,${this.o})`; ctx.fill(); }
    }
    for(let i=0;i<70;i++) ps.push(new P());
    function lines(){for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){const dx=ps[i].x-ps[j].x,dy=ps[i].y-ps[j].y,d=Math.sqrt(dx*dx+dy*dy);if(d<110){ctx.beginPath();ctx.strokeStyle=`rgba(99,102,241,${0.05*(1-d/110)})`;ctx.lineWidth=0.5;ctx.moveTo(ps[i].x,ps[i].y);ctx.lineTo(ps[j].x,ps[j].y);ctx.stroke();}}}
    function loop(){ctx.clearRect(0,0,w,h);ps.forEach(p=>{p.update();p.draw();});lines();anim=requestAnimationFrame(loop);}
    const hm=(e)=>{const r=c.getBoundingClientRect();mouse.x=e.clientX-r.left;mouse.y=e.clientY-r.top;};
    const hr=()=>{w=c.width=c.parentElement.offsetWidth;h=c.height=c.parentElement.offsetHeight;};
    c.addEventListener("mousemove",hm);window.addEventListener("resize",hr);loop();
    return()=>{cancelAnimationFrame(anim);c.removeEventListener("mousemove",hm);window.removeEventListener("resize",hr);};
  }, []);
  return <canvas ref={ref} style={{ position:"absolute", inset:0, zIndex:1, pointerEvents:"auto" }} />;
}

// ─── FLOATING SHAPES (reusable per section) ─────────────────
function FloatingShapes({ colors = [T.indigo, T.pink], mouse }) {
  const pv = "#C84BCC"; // pink-violet intermediate
  return <>
    {/* Gradient mesh — ambient color washes like hero */}
    <div style={{ position:"absolute", inset:0, pointerEvents:"none",
      background:`
        radial-gradient(ellipse 70% 55% at 12% 30%, ${colors[0]}0C 0%, transparent 60%),
        radial-gradient(ellipse 60% 45% at 82% 60%, ${pv}09 0%, transparent 55%),
        radial-gradient(ellipse 45% 40% at 55% 85%, ${colors[0]}07 0%, transparent 50%),
        radial-gradient(ellipse 50% 35% at 40% 15%, ${pv}06 0%, transparent 45%)
      `
    }} />
    {/* Subtle dot grid with pulse */}
    <div style={{ position:"absolute", inset:0, opacity:0.22, animation:"gridPulse 12s ease-in-out infinite",
      backgroundImage:`radial-gradient(circle, ${colors[0]}14 1px, transparent 1px)`, backgroundSize:"32px 32px", pointerEvents:"none"
    }} />
    {/* Floating shapes */}
    <div style={{ position:"absolute", top:"8%", right:"10%", width:90, height:90, background:`linear-gradient(135deg,${colors[0]},${pv})`, borderRadius:24, opacity:0.06, animation:"floatSlow 9s ease-in-out infinite", transform:`translate(${mouse.x*2}px,${mouse.y*2}px) rotate(20deg)`, transition:"transform 0.5s ease-out", pointerEvents:"none" }} />
    <div style={{ position:"absolute", bottom:"15%", left:"6%", width:60, height:60, background:`linear-gradient(135deg,${pv},${colors[0]})`, borderRadius:"50%", opacity:0.05, animation:"floatMed 7s ease-in-out infinite 1s", transform:`translate(${-mouse.x*1.5}px,${-mouse.y*1.5}px)`, transition:"transform 0.5s ease-out", pointerEvents:"none" }} />
    <div style={{ position:"absolute", top:"50%", left:"80%", width:40, height:40, background:`linear-gradient(135deg,${colors[0]},${pv})`, opacity:0.04, animation:"floatFast 5s ease-in-out infinite 2s, morphBlob 12s ease-in-out infinite", transform:`translate(${mouse.x}px,${-mouse.y}px)`, transition:"transform 0.5s ease-out", pointerEvents:"none" }} />
    <div style={{ position:"absolute", top:"25%", left:"65%", width:160, height:160, borderRadius:"50%", border:`1.5px dashed ${colors[0]}08`, animation:"spinSlow 35s linear infinite", pointerEvents:"none" }} />
    <div style={{ position:"absolute", bottom:"30%", right:"25%", width:110, height:110, borderRadius:"50%", border:`1px dashed ${pv}06`, animation:"spinReverse 28s linear infinite", pointerEvents:"none" }} />
  </>;
}

// ─── SECTION WRAPPER ────────────────────────────────────────
function Sec({ children, bg, style = {}, id }) {
  const [ref, vis] = useInView(0.05);
  return (
    <section ref={ref} id={id} style={{
      padding: "110px 24px", background: bg || "transparent", position: "relative", overflow: "hidden",
      opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(60px)",
      transition: "opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1)",
      ...style,
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 2 }}>{children}</div>
    </section>
  );
}

function Label({ children }) {
  return <span style={{
    fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase",
    background: T.gradP, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
    display: "inline-block", marginBottom: 14,
  }}>{children}</span>;
}

function Title({ pre, title, sub, align = "center" }) {
  return (
    <div style={{ textAlign: align, marginBottom: 60, maxWidth: align === "center" ? 750 : "none", margin: align === "center" ? "0 auto 60px" : "0 0 60px" }}>
      {pre && <Label>{pre}</Label>}
      <h2 style={{ fontFamily: "'Outfit'", fontSize: "clamp(32px,5vw,52px)", fontWeight: 800, color: T.text, lineHeight: 1.08, letterSpacing: "-0.035em", margin: 0 }}>{title}</h2>
      {sub && <p style={{ fontSize: 17, color: T.textSoft, lineHeight: 1.7, marginTop: 18, maxWidth: 620, margin: align === "center" ? "18px auto 0" : "18px 0 0" }}>{sub}</p>}
    </div>
  );
}

function Btn({ children, v = "primary", sz = "md", onClick, style = {} }) {
  const [h, setH] = useState(false);
  const sizes = { sm: { padding: "10px 24px", fontSize: 13 }, md: { padding: "14px 34px", fontSize: 15 }, lg: { padding: "18px 42px", fontSize: 16 } };
  const base = v === "primary" ? {
    background: h ? T.gradWarm : T.gradP, color: "#fff",
    boxShadow: h ? "0 12px 40px rgba(99,102,241,0.35), 0 4px 12px rgba(236,72,153,0.2)" : "0 6px 24px rgba(99,102,241,0.2)",
  } : v === "white" ? {
    background: h ? T.bg : "#fff", color: T.text,
    boxShadow: h ? "0 12px 40px rgba(0,0,0,0.12)" : "0 4px 16px rgba(0,0,0,0.06)",
  } : {
    background: h ? "rgba(99,102,241,0.08)" : "transparent", color: T.indigo,
    border: `2px solid ${h ? T.indigo : "#D4D3F8"}`,
  };
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ ...sizes[sz], ...base, fontFamily: "'DM Sans'", fontWeight: 700, borderRadius: 999,
        display: "inline-flex", alignItems: "center", gap: 10, transition: "all 0.35s cubic-bezier(0.16,1,0.3,1)",
        transform: h ? "translateY(-3px) scale(1.02)" : "translateY(0) scale(1)",
        position: "relative", overflow: "hidden", ...style,
      }}>
      {v === "primary" && <div style={{
        position: "absolute", top: 0, width: "40%", height: "100%",
        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)",
        animation: h ? "shimmer 0.8s ease" : "none", left: "-100%",
      }} />}
      <span style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 10 }}>{children}</span>
    </button>
  );
}

// ─── 3D FLOATING CARD COMPONENT ─────────────────────────────
function Card3D({ children, style = {}, glowColor = T.indigo }) {
  const [rot, setRot] = useState({ x: 0, y: 0 });
  const [hov, setHov] = useState(false);
  const ref = useRef(null);

  const handleMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setRot({ x: y * -12, y: x * 12 });
  };

  return (
    <div ref={ref}
      onMouseMove={handleMove}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setRot({ x: 0, y: 0 }); }}
      style={{
        perspective: 800, transformStyle: "preserve-3d",
        ...style,
      }}>
      <div style={{
        transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg) ${hov ? "translateZ(12px)" : "translateZ(0)"}`,
        transition: hov ? "transform 0.1s ease-out" : "transform 0.5s cubic-bezier(0.16,1,0.3,1)",
        background: "#fff",
        borderRadius: 24,
        border: `1px solid ${hov ? glowColor + "40" : T.border}`,
        boxShadow: hov
          ? `0 24px 48px rgba(0,0,0,0.08), 0 0 0 1px ${glowColor}15, 0 0 40px ${glowColor}10`
          : "0 2px 8px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)",
        overflow: "hidden",
        position: "relative",
      }}>
        {hov && <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${glowColor}, ${T.pink})`,
        }} />}
        {children}
      </div>
    </div>
  );
}

// ─── NAVBAR ─────────────────────────────────────────────────
function Navbar() {
  const [sc, setSc] = useState(false);
  useEffect(() => { const h = () => setSc(window.scrollY > 40); window.addEventListener("scroll", h); return () => window.removeEventListener("scroll", h); }, []);
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
      background: sc ? "rgba(245,243,240,0.88)" : "rgba(245,243,240,0.5)",
      backdropFilter: "blur(20px) saturate(1.5)",
      borderBottom: `1px solid ${sc ? T.border : "transparent"}`,
      transition: "all 0.4s", padding: "0 24px",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 70 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 14, background: T.gradP,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
            animation: "glowPulse 4s ease-in-out infinite, breathe 4s ease-in-out infinite",
          }}>
            <span style={{ fontFamily: "'Outfit'", fontWeight: 900, color: "#fff", fontSize: 17 }}>D</span>
          </div>
          <span style={{ fontFamily: "'Outfit'", fontWeight: 800, fontSize: 22, color: T.text, letterSpacing: -0.5 }}>
            Desarrollos<span style={{ background: T.gradP, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>MX</span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {["Explorar", "Desarrollos", "Inteligencia", "Asesores"].map(l => (
            <button key={l} style={{ padding: "8px 18px", borderRadius: 999, fontSize: 14, fontWeight: 600, color: T.textSoft, transition: "all 0.2s" }}
              onMouseEnter={e => { e.target.style.color = T.indigo; e.target.style.background = T.bgLavender; }}
              onMouseLeave={e => { e.target.style.color = T.textSoft; e.target.style.background = "transparent"; }}
            >{l}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button style={{ padding: "9px 22px", borderRadius: 999, fontSize: 14, fontWeight: 600, color: T.textSoft, border: `1.5px solid ${T.border}`, transition: "all 0.2s" }}
            onMouseEnter={e => { e.target.style.borderColor = T.indigo; e.target.style.color = T.indigo; }}
            onMouseLeave={e => { e.target.style.borderColor = T.border; e.target.style.color = T.textSoft; }}
          >Iniciar sesión</button>
          <Btn sz="sm">Explorar mapa</Btn>
        </div>
      </div>
    </nav>
  );
}

// ─── HERO ───────────────────────────────────────────────────
function Hero() {
  const m = useMouse(0.012);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setTimeout(() => setLoaded(true), 150); }, []);

  return (
    <section style={{
      minHeight: "100vh", background: T.bg, position: "relative", overflow: "hidden",
      display: "flex", alignItems: "center", padding: "100px 24px 60px",
    }}>
      {/* Interactive particles */}
      <ParticleField />

      {/* Gradient mesh background */}
      <div style={{ position: "absolute", inset: 0, background: `
        radial-gradient(ellipse 80% 60% at 15% 40%, rgba(99,102,241,0.1) 0%, transparent 60%),
        radial-gradient(ellipse 60% 50% at 85% 25%, rgba(236,72,153,0.07) 0%, transparent 55%),
        radial-gradient(ellipse 50% 40% at 50% 80%, rgba(249,115,22,0.05) 0%, transparent 50%)
      ` }} />

      {/* Animated grid dots */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.35, animation: "gridPulse 10s ease-in-out infinite",
        backgroundImage: "radial-gradient(circle, rgba(99,102,241,0.2) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }} />

      {/* 3D Floating shapes */}
      <div style={{
        position: "absolute", top: "12%", right: "8%", width: 120, height: 120,
        background: T.gradP, borderRadius: "28px", opacity: 0.12,
        animation: "floatSlow 8s ease-in-out infinite", transform: `translate(${m.x * 3}px, ${m.y * 3}px) rotate(25deg)`,
        transition: "transform 0.4s ease-out",
      }} />
      <div style={{
        position: "absolute", bottom: "18%", left: "5%", width: 80, height: 80,
        background: T.gradFresh, borderRadius: "50%", opacity: 0.15,
        animation: "floatMed 6s ease-in-out infinite 1s", transform: `translate(${-m.x * 2}px, ${-m.y * 2}px)`,
        transition: "transform 0.4s ease-out",
      }} />
      <div style={{
        position: "absolute", top: "55%", right: "22%", width: 60, height: 60,
        background: T.gradSunset, borderRadius: "16px", opacity: 0.1,
        animation: "floatFast 5s ease-in-out infinite 2s", transform: `translate(${m.x * 1.5}px, ${-m.y * 1.5}px) rotate(-15deg)`,
        transition: "transform 0.4s ease-out",
      }} />
      {/* Spinning ring */}
      <div style={{
        position: "absolute", top: "20%", left: "55%", width: 200, height: 200,
        border: "2px dashed rgba(99,102,241,0.08)", borderRadius: "50%",
        animation: "spinSlow 30s linear infinite",
      }} />
      {/* Counter-spinning ring */}
      <div style={{
        position: "absolute", bottom: "25%", right: "30%", width: 140, height: 140,
        border: "1px dashed rgba(236,72,153,0.06)", borderRadius: "50%",
        animation: "spinReverse 25s linear infinite",
      }} />
      {/* Orbiting dot */}
      <div style={{
        position: "absolute", top: "30%", left: "50%", width: 8, height: 8, borderRadius: "50%",
        background: T.indigo, opacity: 0.15, animation: "orbit 22s linear infinite",
      }} />
      {/* Morphing blob */}
      <div style={{
        position: "absolute", top: "60%", left: "12%", width: 100, height: 100,
        background: T.gradSunset, opacity: 0.04,
        animation: "morphBlob 14s ease-in-out infinite, floatMed 8s ease-in-out infinite",
      }} />

      <div style={{
        maxWidth: 1200, margin: "0 auto", width: "100%",
        display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 60,
        alignItems: "center", position: "relative", zIndex: 2,
      }}>
        {/* Left */}
        <div style={{
          opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(50px)",
          transition: "all 1s cubic-bezier(0.16,1,0.3,1)",
        }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            background: T.bgLavender, border: "1px solid rgba(99,102,241,0.15)",
            borderRadius: 999, padding: "8px 20px", marginBottom: 30,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.emerald, animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: T.indigo, letterSpacing: 1.2 }}>SPATIAL DECISION INTELLIGENCE</span>
          </div>

          <h1 style={{
            fontFamily: "'Outfit'", fontSize: "clamp(44px,6vw,72px)", fontWeight: 900,
            color: T.text, lineHeight: 1.02, letterSpacing: "-0.045em", margin: "0 0 28px",
          }}>
            La inteligencia{" "}
            <span style={{
              background: T.gradP, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              position: "relative", display: "inline-block",
            }}>
              detrás
              <svg style={{ position: "absolute", bottom: -2, left: 0, width: "100%", overflow: "visible" }} height="12" viewBox="0 0 200 12">
                <path d="M0 8 C30 2, 60 2, 100 7 S170 12, 200 6" stroke="url(#hl)" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.5">
                  <animate attributeName="d" dur="3s" repeatCount="indefinite" values="M0 8 C30 2,60 2,100 7 S170 12,200 6; M0 6 C30 10,70 4,100 8 S160 4,200 8; M0 8 C30 2,60 2,100 7 S170 12,200 6"/>
                </path>
                <defs><linearGradient id="hl"><stop offset="0%" stopColor="#6366F1"/><stop offset="100%" stopColor="#EC4899"/></linearGradient></defs>
              </svg>
            </span>
            <br />de cada metro².
          </h1>

          <p style={{ fontSize: 19, color: T.textSoft, lineHeight: 1.75, maxWidth: 520, margin: "0 0 40px" }}>
            <strong style={{ color: T.text }}>50+ fuentes de datos</strong> cruzadas en tiempo real.{" "}
            <strong style={{ color: T.text }}>108 scores</strong> por zona.{" "}
            <strong style={{ color: T.text }}>7 índices propietarios</strong> que no existen en ningún otro lugar del planeta.
          </p>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Btn sz="lg">Explorar el mapa <Arrow /></Btn>
            <Btn v="outline" sz="lg">Ver demo en vivo</Btn>
          </div>
        </div>

        {/* Right — 3D Floating Dashboard */}
        <div style={{
          opacity: loaded ? 1 : 0,
          transform: loaded ? "translateY(0)" : "translateY(70px) scale(0.95)",
          transition: "all 1.1s cubic-bezier(0.16,1,0.3,1) 0.2s",
          perspective: 1000,
        }}>
          <div style={{
            transform: `rotateY(${m.x * -0.2}deg) rotateX(${m.y * 0.12}deg)`,
            transition: "transform 0.15s ease-out", transformStyle: "preserve-3d",
          }}>
            <div style={{
              background: "#fff", borderRadius: 28, overflow: "hidden",
              border: "1px solid rgba(99,102,241,0.12)",
              boxShadow: "0 40px 80px rgba(99,102,241,0.1), 0 16px 32px rgba(0,0,0,0.06), 0 0 0 1px rgba(99,102,241,0.05)",
              animation: "glowPulse 5s ease-in-out infinite",
            }}>
              {/* Top bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", borderBottom: `1px solid ${T.border}`, background: T.bgCream }}>
                {["#F43F5E", "#EAB308", "#10B981"].map((c, i) => (
                  <div key={i} style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />
                ))}
                <div style={{ flex: 1, marginLeft: 10, background: T.bg, borderRadius: 10, height: 30, display: "flex", alignItems: "center", paddingLeft: 14, border: `1px solid ${T.border}` }}>
                  <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 500 }}>🔒 app.desarrollosmx.com/inteligencia</span>
                </div>
              </div>

              <div style={{ padding: 20 }}>
                {/* KPI Row with colored accents */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                  {[
                    { label: "DMX Score", value: "8.4", bg: T.bgMint, color: T.emerald, trend: "↑ 0.3" },
                    { label: "Absorción", value: "2.1x", bg: T.bgLavender, color: T.indigo, trend: "↑ 12%" },
                    { label: "Momentum", value: "+0.8σ", bg: T.bgPeach, color: T.coral, trend: "Positivo" },
                  ].map((k, i) => (
                    <div key={i} style={{
                      background: k.bg, borderRadius: 16, padding: "16px 14px",
                      border: `1px solid ${k.color}15`,
                    }}>
                      <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 8, fontWeight: 600 }}>{k.label}</div>
                      <div style={{ fontFamily: "'Outfit'", fontSize: 28, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
                      <div style={{ fontSize: 10, color: T.emerald, fontWeight: 600, marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 14, height: 14, borderRadius: "50%", background: `${T.emerald}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8 }}>✓</span>
                        {k.trend}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chart */}
                <div style={{ background: T.bgCream, borderRadius: 16, padding: 18, marginBottom: 14, border: `1px solid ${T.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>Momentum por zona</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {["6M", "1A", "3A"].map((p, i) => (
                        <span key={p} style={{ fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: i === 0 ? T.bgLavender : "transparent", color: i === 0 ? T.indigo : T.textMuted }}>{p}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 75 }}>
                    {[30, 45, 38, 62, 55, 70, 65, 78, 72, 85, 80, 92].map((h, i) => (
                      <div key={i} style={{
                        flex: 1, height: `${h}%`, borderRadius: 5,
                        background: i >= 10 ? T.gradP : `rgba(99,102,241,${0.12 + i * 0.05})`,
                        transformOrigin: "bottom", animation: loaded ? `barGrow 0.6s ease ${0.3 + i * 0.04}s both` : "none",
                      }} />
                    ))}
                  </div>
                </div>

                {/* Zone scores */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { z: "Del Valle", s: 8.7, c: T.emerald },
                    { z: "Roma Norte", s: 7.9, c: T.indigo },
                    { z: "Nápoles", s: 8.2, c: T.emerald },
                    { z: "Condesa", s: 7.6, c: T.violet },
                  ].map((z, i) => (
                    <div key={i} style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", border: `1px solid ${T.border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: T.textSoft }}>{z.z}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: z.c, fontFamily: "'Outfit'" }}>{z.s}</span>
                      </div>
                      <div style={{ height: 4, background: T.bg, borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${z.s * 10}%`, borderRadius: 2, background: z.c === T.emerald ? T.gradFresh : T.gradP, animation: loaded ? `scoreBar 1s ease ${0.8 + i * 0.12}s both` : "none" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10,
        background: "rgba(255,255,255,0.7)", backdropFilter: "blur(16px)",
        borderTop: `1px solid ${T.border}`, padding: "0 24px",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "center", gap: 80, padding: "28px 0" }}>
          {[
            { n: 108, s: "+", l: "Scores de zona", c: T.indigo },
            { n: 7, s: "", l: "Índices propietarios", c: T.violet },
            { n: 50, s: "+", l: "Fuentes de datos", c: T.pink },
            { n: 16, s: "", l: "Alcaldías CDMX", c: T.coral },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Outfit'", fontSize: 38, fontWeight: 900, color: s.c, letterSpacing: "-0.02em" }}>
                <AnimNum target={s.n} suffix={s.s} />
              </div>
              <div style={{ fontSize: 13, color: T.textMuted, fontWeight: 500, marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── PHOTO CAROUSEL ─────────────────────────────────────────
function PhotoCarousel() {
  return (
    <div style={{ background: T.white, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, padding: "28px 0", overflow: "hidden", position: "relative" }}>
      <div style={{ display: "flex", animation: "carousel 55s linear infinite", width: "fit-content" }}>
        {[...PHOTOS, ...PHOTOS].map((src, i) => (
          <div key={i} style={{ width: 300, height: 190, borderRadius: 20, overflow: "hidden", margin: "0 10px", flexShrink: 0, position: "relative" }}>
            <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 35%, rgba(0,0,0,0.55))" }} />
            <div style={{ position: "absolute", bottom: 14, left: 16, color: "#fff" }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{["Del Valle", "Roma Norte", "Nápoles", "Condesa", "Polanco", "Reforma", "Santa Fe", "Coyoacán"][i % 8]}</div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>CDMX</div>
            </div>
            <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", borderRadius: 99, padding: "5px 12px", fontSize: 11, fontWeight: 700, color: T.indigo }}>
              {["8.7", "7.9", "8.2", "7.6", "8.9", "8.1", "7.4", "8.0"][i % 8]} DMX
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TICKER ─────────────────────────────────────────────────
function Ticker() {
  const items = ["INEGI", "DENUE", "Banxico", "SHF", "FGJ CDMX", "SIGED", "DGIS", "SACMEX", "INFONAVIT", "Atlas Riesgos", "CONAVI", "GTFS Metro"];
  return (
    <div style={{ background: T.white, borderBottom: `1px solid ${T.border}`, padding: "18px 0", overflow: "hidden" }}>
      <div style={{ display: "flex", animation: "ticker 35s linear infinite", width: "fit-content" }}>
        {[...items, ...items, ...items].map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 30px", whiteSpace: "nowrap" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.gradP }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, letterSpacing: 1.5, textTransform: "uppercase" }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PILLARS (3D Cards) ─────────────────────────────────────
function Pillars() {
  const m = useMouse(0.008);
  const data = [
    { icon: "🧠", title: "108 Scores de Zona", desc: "Seguridad, ecosistema, walkability, riesgo sísmico. Cada colonia con ADN cuantificado en tiempo real.", color: T.indigo, bg: T.bgLavender },
    { icon: "📊", title: "7 Índices Propietarios", desc: "DMX-IPV, DMX-IAB, DMX-IDS, DMX-IRE, DMX-ICO, DMX-MOM, DMX-LIV. Métricas que nadie más tiene.", color: T.violet, bg: "#F5EEFF" },
    { icon: "🛡️", title: "Risk Intelligence", desc: "Sísmico + hídrico + legal + financiero + criminal. El primer risk score integral para residencial en México.", color: T.pink, bg: T.bgPeach },
    { icon: "⚡", title: "Temporal Momentum", desc: "No son scores estáticos. Sabemos dirección y velocidad: si una zona sube, baja o se estanca.", color: T.coral, bg: "#FFF7ED" },
  ];
  return (
    <Sec bg={T.bg}>
      <FloatingShapes colors={[T.violet, T.pink]} mouse={m} />
      <Title pre="¿QUÉ ES DESARROLLOSMX?" title="El sistema operativo de inteligencia urbana de México" sub="Spatial Decision Intelligence — cada metro cuadrado convertido en información financieramente accionable." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
        {data.map((p, i) => (
          <Card3D key={i} glowColor={p.color}>
            <div style={{ padding: "32px 28px" }}>
              <div style={{
                width: 56, height: 56, borderRadius: 18, background: p.bg,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26, marginBottom: 22,
                boxShadow: `0 4px 12px ${p.color}12`,
              }}>{p.icon}</div>
              <h3 style={{ fontFamily: "'Outfit'", fontSize: 21, fontWeight: 700, color: T.text, margin: "0 0 10px" }}>{p.title}</h3>
              <p style={{ fontSize: 14, color: T.textSoft, lineHeight: 1.7, margin: 0 }}>{p.desc}</p>
            </div>
          </Card3D>
        ))}
      </div>
    </Sec>
  );
}

// ─── ZONE EXPLORER (Interactive map + carousel) ─────────────
function ZoneExplorer() {
  const [active, setActive] = useState(0);
  const m = useMouse(0.008);
  const zones = [
    { name: "Del Valle", score: 8.7, momentum: "+0.8σ", risk: "Bajo", absorption: "2.3x", eco: "Alto", price: "$48,200/m²", trend: "+12%", color: T.emerald, emoji: "🏙️" },
    { name: "Nápoles", score: 8.2, momentum: "+0.5σ", risk: "Bajo", absorption: "1.9x", eco: "Alto", price: "$52,100/m²", trend: "+8%", color: T.emerald, emoji: "🌿" },
    { name: "Roma Norte", score: 7.9, momentum: "+1.2σ", risk: "Medio", absorption: "2.7x", eco: "Muy Alto", price: "$58,900/m²", trend: "+18%", color: T.indigo, emoji: "🎭" },
    { name: "Condesa", score: 7.6, momentum: "+0.3σ", risk: "Medio", absorption: "1.6x", eco: "Alto", price: "$62,400/m²", trend: "+5%", color: T.violet, emoji: "🌳" },
    { name: "Polanco", score: 8.9, momentum: "-0.1σ", risk: "Bajo", absorption: "1.2x", eco: "Muy Alto", price: "$89,000/m²", trend: "-2%", color: T.amber, emoji: "💎" },
  ];
  const z = zones[active];

  return (
    <Sec bg={T.white}>
      <FloatingShapes colors={[T.emerald, T.indigo]} mouse={m} />
      <Title pre="INTELIGENCIA DE ZONA" title="Explora el ADN de cada colonia" sub="Haz clic en cualquier zona para ver sus 108 scores en tiempo real." />
      
      {/* Zone selector carousel */}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 48, flexWrap: "wrap" }}>
        {zones.map((zo, i) => (
          <button key={i} onClick={() => setActive(i)} style={{
            padding: "12px 24px", borderRadius: 999,
            background: active === i ? `${zo.color}12` : T.bg,
            border: `2px solid ${active === i ? zo.color : T.border}`,
            color: active === i ? zo.color : T.textSoft,
            fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8,
            transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
            transform: active === i ? "scale(1.05)" : "scale(1)",
            boxShadow: active === i ? `0 4px 16px ${zo.color}18` : "none",
          }}>
            <span style={{ fontSize: 18 }}>{zo.emoji}</span>
            {zo.name}
          </button>
        ))}
      </div>

      {/* Zone detail — large card */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32,
        animation: "slideIn 0.5s ease",
        key: active,
      }}>
        {/* Score visual */}
        <div style={{
          background: `linear-gradient(135deg, ${z.color}08, ${z.color}04)`,
          borderRadius: 28, padding: 48, textAlign: "center",
          border: `1px solid ${z.color}20`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          position: "relative", overflow: "hidden",
        }}>
          {/* Animated rings */}
          <div style={{
            position: "absolute", width: 280, height: 280, borderRadius: "50%",
            border: `2px dashed ${z.color}15`, animation: "spinSlow 20s linear infinite",
          }} />
          <div style={{
            position: "absolute", width: 220, height: 220, borderRadius: "50%",
            border: `1px dashed ${z.color}10`, animation: "spinSlow 15s linear infinite reverse",
          }} />
          
          <div style={{ fontSize: 40, marginBottom: 16 }}>{z.emoji}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>DMX SCORE</div>
          <div style={{
            fontFamily: "'Outfit'", fontSize: 96, fontWeight: 900,
            background: `linear-gradient(135deg, ${z.color}, ${T.pink})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            lineHeight: 1, marginBottom: 8,
          }}>{z.score}</div>
          <div style={{ fontSize: 14, color: T.textMuted }}>de 10.0</div>
          <div style={{
            marginTop: 20, padding: "6px 16px", borderRadius: 999,
            background: z.momentum.includes("+") ? `${T.emerald}12` : `${T.rose}12`,
            color: z.momentum.includes("+") ? T.emerald : T.rose,
            fontSize: 13, fontWeight: 700,
          }}>Momentum {z.momentum}</div>
        </div>

        {/* Metrics grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignContent: "start" }}>
          {[
            { label: "Precio promedio", value: z.price, icon: "💰", bg: T.bgPeach, color: T.coral },
            { label: "Tendencia anual", value: z.trend, icon: "📈", bg: T.bgMint, color: T.emerald },
            { label: "Absorción", value: z.absorption, icon: "⚡", bg: T.bgLavender, color: T.indigo },
            { label: "Riesgo", value: z.risk, icon: "🛡️", bg: "#FFF5F5", color: z.risk === "Bajo" ? T.emerald : T.amber },
            { label: "Ecosistema", value: z.eco, icon: "🏙️", bg: T.bgSlate, color: T.violet },
            { label: "Momentum", value: z.momentum, icon: "🔥", bg: z.momentum.includes("+") ? T.bgMint : "#FFF5F5", color: z.momentum.includes("+") ? T.emerald : T.rose },
          ].map((m, i) => (
            <Card3D key={i} glowColor={m.color} style={{ height: "auto" }}>
              <div style={{ padding: "22px 20px" }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, background: m.bg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, marginBottom: 14,
                }}>{m.icon}</div>
                <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontFamily: "'Outfit'", fontSize: 22, fontWeight: 800, color: m.color }}>{m.value}</div>
              </div>
            </Card3D>
          ))}
          <div style={{ gridColumn: "1 / -1" }}>
            <Btn sz="md" style={{ width: "100%", justifyContent: "center" }}>Ver análisis completo de {z.name} <Arrow /></Btn>
          </div>
        </div>
      </div>
    </Sec>
  );
}

// ─── HOW IT WORKS ───────────────────────────────────────────
function HowItWorks() {
  const m = useMouse(0.008);
  const steps = [
    { n: "01", title: "Ingestamos la ciudad", desc: "50+ fuentes procesadas diariamente: INEGI, DENUE, catastro, criminalidad, transporte.", color: T.indigo, bg: T.bgLavender, icon: "🌐" },
    { n: "02", title: "Cruzamos todo", desc: "Cross-references propietarias: Catastro × DENUE × FGJ × SIGED. El cruce ES el IP.", color: T.violet, bg: "#F5EEFF", icon: "🔗" },
    { n: "03", title: "108 Scores", desc: "5 niveles de cálculo, desde fundamentales hasta AI predictivo con calibración real.", color: T.pink, bg: T.bgPeach, icon: "📊" },
    { n: "04", title: "Tú decides mejor", desc: "Intelligence Cards, alertas, absorption forecast, DMX Estimate. Datos → Decisiones.", color: T.coral, bg: "#FFF7ED", icon: "🎯" },
  ];
  return (
    <Sec bg={T.bgCream}>
      <FloatingShapes colors={[T.coral, T.pink]} mouse={m} />
      <Title pre="CÓMO FUNCIONA" title="De datos públicos a ventaja competitiva" sub="El pipeline que convierte información abierta en inteligencia propietaria imposible de replicar." />
      <div style={{ position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
          {steps.map((s, i) => {
            const [h, setH] = useState(false);
            return (
              <div key={i} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
                style={{ textAlign: "center", position: "relative" }}>
                {i < 3 && <div style={{
                  position: "absolute", top: 44, left: "60%", width: "80%", height: 2,
                  background: T.gradP, opacity: 0.1, zIndex: 0,
                }} />}
                <div style={{
                  width: 88, height: 88, borderRadius: 28, position: "relative", zIndex: 1,
                  background: h ? `linear-gradient(135deg, ${s.color}, ${T.pink})` : s.bg,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 24px",
                  transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
                  boxShadow: h ? `0 12px 32px ${s.color}25` : `0 4px 12px ${s.color}08`,
                  transform: h ? "scale(1.12) translateY(-4px) rotate(-5deg)" : "scale(1)",
                  border: `2px solid ${h ? s.color : s.color + "20"}`,
                }}>
                  <span style={{ fontSize: h ? 32 : 28, transition: "all 0.3s", filter: h ? "none" : "none" }}>{s.icon}</span>
                </div>
                <div style={{
                  fontFamily: "'Outfit'", fontSize: 12, fontWeight: 800, color: s.color,
                  letterSpacing: 2, marginBottom: 8,
                }}>{s.n}</div>
                <h4 style={{ fontFamily: "'Outfit'", fontSize: 18, fontWeight: 700, color: T.text, margin: "0 0 10px" }}>{s.title}</h4>
                <p style={{ fontSize: 13, color: T.textSoft, lineHeight: 1.65, margin: 0, padding: "0 4px" }}>{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </Sec>
  );
}

// ─── COMPETITIVE MOAT ───────────────────────────────────────
function Moat() {
  const m = useMouse(0.008);
  const rows = [
    { name: "CoStar", val: "$35B", has: "CRE transactions", miss: "No location intel, no residential, no LATAM", color: T.textMuted },
    { name: "Local Logic", val: "Series B", has: "18 scores US/CA", miss: "No temporalidad, no crimen, no LATAM", color: T.textMuted },
    { name: "Walk Score", val: "Redfin", has: "3 scores estáticos", miss: "Sin updates desde 2007", color: T.textMuted },
    { name: "Habi", val: "LATAM", has: "iBuyer model", miss: "Cero intelligence layer", color: T.textMuted },
  ];
  return (
    <Sec bg={T.bg}>
      <FloatingShapes colors={[T.indigo, T.emerald]} mouse={m} />
      <Title pre="VENTAJA COMPETITIVA" title="Lo que nadie más puede replicar" sub="Cada transacción calibra los modelos. Cada búsqueda revela demanda. El flywheel se amplía cada día." />
      <div style={{ background: T.white, borderRadius: 28, overflow: "hidden", border: `1px solid ${T.border}`, boxShadow: "0 4px 24px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr 2fr 0.5fr", padding: "16px 32px", background: T.bgCream, borderBottom: `1px solid ${T.border}` }}>
          {["Competidor", "Qué tienen", "Qué les falta", ""].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: 1.5 }}>{h}</span>
          ))}
        </div>
        {rows.map((r, i) => {
          const [h, setH] = useState(false);
          return (
            <div key={i} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
              style={{
                display: "grid", gridTemplateColumns: "1.2fr 1.2fr 2fr 0.5fr",
                padding: "20px 32px", alignItems: "center",
                borderBottom: i < rows.length - 1 ? `1px solid ${T.border}` : "none",
                background: h ? T.bgLavender : "transparent",
                transition: "background 0.25s",
              }}>
              <div>
                <span style={{ fontFamily: "'Outfit'", fontSize: 16, fontWeight: 700, color: T.text }}>{r.name}</span>
                <span style={{ fontSize: 11, color: T.textMuted, marginLeft: 10, fontWeight: 500 }}>{r.val}</span>
              </div>
              <span style={{ fontSize: 13, color: T.textSoft }}>{r.has}</span>
              <span style={{ fontSize: 13, color: T.textMuted }}>{r.miss}</span>
              <div style={{
                width: 30, height: 30, borderRadius: 10,
                background: T.bgMint, display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: h ? `0 0 12px ${T.emerald}20` : "none", transition: "all 0.3s",
                transform: h ? "scale(1.15)" : "scale(1)",
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.emerald} strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
            </div>
          );
        })}
      </div>
    </Sec>
  );
}

// ─── CTA ────────────────────────────────────────────────────
function CTA() {
  const m = useMouse(0.008);
  return (
    <Sec bg={T.white} style={{ padding: "120px 24px" }}>
      <div style={{
        background: T.gradP, borderRadius: 36, padding: "80px 60px",
        position: "relative", overflow: "hidden", textAlign: "center",
        boxShadow: "0 32px 64px rgba(99,102,241,0.2), 0 0 0 1px rgba(99,102,241,0.1)",
      }}>
        {/* Floating shapes */}
        <div style={{ position: "absolute", top: "10%", left: "5%", width: 100, height: 100, borderRadius: 24, background: "rgba(255,255,255,0.08)", animation: "floatSlow 7s ease-in-out infinite", transform: `translate(${m.x}px, ${m.y}px) rotate(20deg)` }} />
        <div style={{ position: "absolute", bottom: "10%", right: "8%", width: 70, height: 70, borderRadius: "50%", background: "rgba(255,255,255,0.06)", animation: "floatMed 5s ease-in-out infinite 1s", transform: `translate(${-m.x}px, ${-m.y}px)` }} />
        <div style={{ position: "absolute", top: "40%", right: "20%", width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.05)", animation: "floatFast 4s ease-in-out infinite 2s", transform: `rotate(-15deg)` }} />
        {/* Spinning ring */}
        <div style={{ position: "absolute", top: "15%", left: "25%", width: 180, height: 180, borderRadius: "50%", border: "1.5px dashed rgba(255,255,255,0.08)", animation: "spinSlow 25s linear infinite", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "20%", right: "15%", width: 120, height: 120, borderRadius: "50%", border: "1px dashed rgba(255,255,255,0.05)", animation: "spinReverse 20s linear infinite", pointerEvents: "none" }} />
        {/* Morphing blob */}
        <div style={{ position: "absolute", top: "30%", right: "35%", width: 60, height: 60, background: "rgba(255,255,255,0.03)", animation: "morphBlob 10s ease-in-out infinite, floatFast 6s ease-in-out infinite", pointerEvents: "none" }} />
        
        <div style={{ position: "relative", zIndex: 2 }}>
          <h2 style={{
            fontFamily: "'Outfit'", fontSize: "clamp(36px, 5vw, 58px)",
            fontWeight: 900, color: "#fff", lineHeight: 1.08, letterSpacing: "-0.04em",
            margin: "0 0 24px",
          }}>
            Transforma datos en decisiones
          </h2>
          <p style={{ fontSize: 18, color: "rgba(255,255,255,0.75)", lineHeight: 1.75, margin: "0 auto 40px", maxWidth: 600 }}>
            Únete a los primeros desarrolladores y asesores que usan inteligencia territorial para ganar.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Btn v="white" sz="lg">Acceder a la plataforma <Arrow /></Btn>
            <Btn v="outlineWhite" sz="lg" style={{ background: "transparent", color: "#fff", border: "2px solid rgba(255,255,255,0.3)" }}>Solicitar demo</Btn>
          </div>
        </div>
      </div>
    </Sec>
  );
}

// ─── FOOTER ─────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background: T.text, padding: "60px 24px 32px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1fr", gap: 40, marginBottom: 48 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <div style={{ width: 34, height: 34, borderRadius: 11, background: T.gradP, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Outfit'", fontWeight: 900, color: "#fff", fontSize: 15 }}>D</div>
              <span style={{ fontFamily: "'Outfit'", fontWeight: 800, fontSize: 19, color: "#fff" }}>DesarrollosMX</span>
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.7, maxWidth: 300 }}>
              Spatial Decision Intelligence para el mercado inmobiliario residencial de México.
            </p>
          </div>
          {[
            { t: "Plataforma", l: ["Explorar mapa", "Scores", "Índices DMX", "API"] },
            { t: "Para quién", l: ["Desarrolladores", "Asesores", "Compradores"] },
            { t: "Legal", l: ["Términos", "Privacidad", "Metodología"] },
          ].map(c => (
            <div key={c.t}>
              <h4 style={{ fontFamily: "'Outfit'", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 18 }}>{c.t}</h4>
              {c.l.map(l => <button key={l} style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.3)", padding: "5px 0", textAlign: "left", transition: "color 0.2s" }}
                onMouseEnter={e => e.target.style.color = "#fff"} onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.3)"}>{l}</button>)}
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>© 2026 DesarrollosMX</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.04)", padding: "4px 12px", borderRadius: 999 }}>🇲🇽 CDMX</span>
        </div>
      </div>
    </footer>
  );
}

// ═══════════════════════════════════════════════════════════════
export default function DMXDopamine() {
  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", color: T.text, overflowX: "hidden" }}>
      <style>{css}</style>
      <Navbar />
      <Hero />
      <PhotoCarousel />
      <Ticker />
      <Pillars />
      <ZoneExplorer />
      <HowItWorks />
      <Moat />
      <CTA />
      <Footer />
    </div>
  );
}
