import React, { useState, useEffect, useCallback } from 'react';

/* ─────────────────────────────────────────────────────────────────────────────
   STYLES — all inlined to avoid OneDrive file-lock issues with Vite
───────────────────────────────────────────────────────────────────────────── */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

/* ── Reset & base ── */
.db-root *,
.db-root *::before,
.db-root *::after { box-sizing: border-box; margin: 0; padding: 0; }
.db-root { min-height: 100vh; font-family: 'Inter', system-ui, sans-serif;
  background: #1C1108;
  color: #F5E6C8;
  display: flex; flex-direction: column; }

/* ── Honeycomb background ── */
.db-root::before {
  content: '';
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background-image:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34zM28 100L0 84V66l28 16 28-16v18z' fill='none' stroke='rgba(255,184,0,0.06)' stroke-width='1'/%3E%3C/svg%3E");
  background-size: 56px 100px;
}

/* ── Navbar ── */
.db-nav {
  position: sticky; top: 0; z-index: 200;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 40px; height: 64px;
  background: rgba(28, 17, 8, 0.85);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 184, 0, 0.15);
}
.db-nav-left { display: flex; align-items: center; gap: 20px; }
.db-nav-logo { font-size: 1.35rem; font-weight: 900; color: #F5E6C8; letter-spacing: -0.5px; line-height: 1; }
.db-nav-logo span { color: #FFB800; }
.db-nav-divider { width: 1px; height: 22px; background: rgba(255,184,0,0.25); }
.db-nav-title { font-size: 0.88rem; font-weight: 600; color: rgba(245,230,200,0.5); letter-spacing: 0.05em; text-transform: uppercase; }
.db-nav-right { display: flex; align-items: center; gap: 12px; }
.db-chip {
  display: flex; align-items: center; gap: 7px;
  background: rgba(255,184,0,0.1); border: 1px solid rgba(255,184,0,0.2);
  border-radius: 100px; padding: 6px 14px;
  font-size: 0.78rem; font-weight: 600; color: #FFD875;
  max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.db-nav-btn {
  display: flex; align-items: center; gap: 6px;
  background: transparent; border: 1px solid rgba(255,184,0,0.3);
  border-radius: 10px; padding: 7px 16px;
  font-size: 0.82rem; font-weight: 700; color: #FFB800;
  cursor: pointer; transition: all 0.2s;
}
.db-nav-btn:hover { background: rgba(255,184,0,0.1); border-color: #FFB800; transform: translateY(-1px); }
.db-back-btn {
  display: flex; align-items: center; gap: 6px;
  background: rgba(245,230,200,0.06); border: 1px solid rgba(245,230,200,0.15);
  border-radius: 10px; padding: 7px 14px;
  font-size: 0.82rem; font-weight: 600; color: rgba(245,230,200,0.7);
  cursor: pointer; transition: all 0.2s;
}
.db-back-btn:hover { background: rgba(245,230,200,0.1); color: #F5E6C8; transform: translateX(-2px); }

/* ── Page content ── */
.db-page { flex: 1; position: relative; z-index: 1; padding: 36px 40px 60px; max-width: 1240px; margin: 0 auto; width: 100%; }

/* ── Hero row ── */
.db-hero { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 36px; flex-wrap: wrap; }
.db-hero-text {}
.db-hero-eyebrow { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #FFB800; margin-bottom: 8px; }
.db-hero-h1 { font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 900; color: #F5E6C8; letter-spacing: -1px; line-height: 1.1; }
.db-hero-h1 span { color: #FFB800; }
.db-hero-sub { margin-top: 8px; font-size: 0.9rem; color: rgba(245,230,200,0.5); font-weight: 400; }
.db-hero-badge {
  display: flex; align-items: center; gap: 8px;
  background: rgba(255,184,0,0.08); border: 1px solid rgba(255,184,0,0.2);
  border-radius: 14px; padding: 10px 18px;
  font-size: 0.82rem; font-weight: 600; color: #FFD875;
}
.db-live-dot { width: 7px; height: 7px; background: #22c55e; border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(34,197,94,0.3); animation: db-pulse 2s infinite; }
@keyframes db-pulse { 0%,100%{box-shadow:0 0 0 2px rgba(34,197,94,0.3)} 50%{box-shadow:0 0 0 5px rgba(34,197,94,0)} }

/* ── Stat cards grid ── */
.db-cards { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-bottom: 28px; }
@media(max-width:1080px){.db-cards{grid-template-columns:repeat(2,1fr)}}
@media(max-width:560px){.db-cards{grid-template-columns:1fr}}

.db-card {
  position: relative; overflow: hidden;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,184,0,0.12);
  border-radius: 20px; padding: 24px 22px;
  backdrop-filter: blur(12px);
  transition: transform 0.28s cubic-bezier(.34,1.56,.64,1), border-color 0.2s, box-shadow 0.2s;
  cursor: default;
}
.db-card:hover { transform: translateY(-6px); border-color: rgba(255,184,0,0.35); box-shadow: 0 20px 60px rgba(255,184,0,0.1); }
.db-card::before {
  content:''; position:absolute; inset:0; z-index:0;
  background: radial-gradient(circle at top left, rgba(255,184,0,0.07), transparent 70%);
}
.db-card-inner { position: relative; z-index: 1; }
.db-card-icon { font-size: 1.6rem; margin-bottom: 14px; display: inline-flex;
  width: 48px; height: 48px; align-items: center; justify-content: center;
  background: rgba(255,184,0,0.1); border-radius: 14px; }
.db-card-value { font-size: clamp(1.6rem,3.5vw,2.2rem); font-weight: 900; color: #F5E6C8; line-height: 1; margin-bottom: 4px; }
.db-card-label { font-size: 0.82rem; font-weight: 700; color: rgba(245,230,200,0.6); text-transform: uppercase; letter-spacing: 0.06em; }
.db-card-sub { font-size: 0.72rem; color: rgba(245,230,200,0.35); margin-top: 4px; }
.db-card-accent { position: absolute; bottom: -12px; right: -12px; font-size: 4rem; opacity: 0.06; user-select: none; pointer-events: none; z-index: 0; }
/* individual card tints */
.db-card-gold .db-card-icon  { background: rgba(255,184,0,0.15); }
.db-card-fire .db-card-icon  { background: rgba(239,68,68,0.12); }
.db-card-green .db-card-icon { background: rgba(34,197,94,0.1); }
.db-card-blue .db-card-icon  { background: rgba(96,165,250,0.1); }
.db-card-gold .db-card-value  { color: #FFD875; }
.db-card-fire .db-card-value  { color: #FCA5A5; }
.db-card-green .db-card-value { color: #86EFAC; }
.db-card-blue .db-card-value  { color: #93C5FD; }

/* ── Accuracy ring ── */
.db-ring-wrap { position: absolute; bottom: 18px; right: 18px; opacity: 0.9; }
.db-ring-svg { width: 72px; height: 72px; }
.db-ring-track { fill: none; stroke: rgba(255,255,255,0.07); stroke-width: 7; }
.db-ring-fill { fill: none; stroke-width: 7; stroke-linecap: round; transform: rotate(-90deg); transform-origin: 50% 50%; transition: stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1); }
.db-ring-text { font-family: 'Inter',sans-serif; font-weight: 900; font-size: 13px; fill: #FFD875; }
.db-ring-sub  { font-family: 'Inter',sans-serif; font-size: 8px;  fill: rgba(245,230,200,0.4); }

/* ── Section panel ── */
.db-panel {
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,184,0,0.1);
  border-radius: 20px; padding: 28px; backdrop-filter: blur(12px);
}
.db-panel-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 8px; }
.db-panel-title { font-size: 1rem; font-weight: 800; color: #F5E6C8; display: flex; align-items: center; gap: 8px; }
.db-panel-badge {
  font-size: 0.7rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  padding: 3px 10px; border-radius: 100px;
  background: rgba(255,184,0,0.12); color: #FFB800; border: 1px solid rgba(255,184,0,0.2);
}

/* ── Two-column grid ── */
.db-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media(max-width:820px){.db-grid-2{grid-template-columns:1fr}}

/* ── Tabs ── */
.db-tabs { display: flex; gap: 6px; margin-bottom: 22px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,184,0,0.1); border-radius: 14px; padding: 5px; width: fit-content; }
.db-tab {
  padding: 9px 22px; border-radius: 10px;
  font-size: 0.85rem; font-weight: 700; cursor: pointer;
  border: none; background: transparent; color: rgba(245,230,200,0.45);
  transition: all 0.2s; white-space: nowrap;
}
.db-tab:hover { color: rgba(245,230,200,0.75); }
.db-tab.active { background: linear-gradient(135deg,#FFB800,#FF8C00); color: #1C1108; box-shadow: 0 4px 14px rgba(255,140,0,0.35); }

/* ── Bar chart ── */
.db-bar-chart { display: flex; align-items: flex-end; gap: 10px; height: 120px; padding: 0 4px; }
.db-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; position: relative; }
.db-bar-col:hover .db-bar-tip { opacity: 1; transform: translateX(-50%) translateY(0); }
.db-bar-tip {
  position: absolute; top: -40px; left: 50%; transform: translateX(-50%) translateY(4px);
  background: #1C1108; border: 1px solid rgba(255,184,0,0.3);
  color: #FFD875; padding: 4px 10px; border-radius: 8px;
  font-size: 0.68rem; font-weight: 700; white-space: nowrap;
  pointer-events: none; opacity: 0; transition: all 0.18s; z-index: 20;
}
.db-bar-track { flex: 1; width: 100%; background: rgba(255,255,255,0.05); border-radius: 8px 8px 4px 4px; display: flex; align-items: flex-end; overflow: hidden; }
.db-bar-fill { width: 100%; min-height: 3px; border-radius: 8px 8px 4px 4px; background: linear-gradient(180deg,#FFD875,#FF8C00); transition: height 0.9s cubic-bezier(.34,1.56,.64,1); }
.db-bar-lbl { font-size: 0.65rem; color: rgba(245,230,200,0.35); font-weight: 700; margin-top: 6px; letter-spacing: 0.03em; }
.db-bar-0 { opacity: 0.3; }

/* ── Accuracy circles ── */
.db-circles { display: flex; gap: 10px; justify-content: space-between; flex-wrap: wrap; }
.db-circle-item { display: flex; flex-direction: column; align-items: center; gap: 5px; flex: 1; min-width: 52px; }
.db-circle {
  width: 54px; height: 54px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.72rem; font-weight: 800;
  transition: transform 0.2s; cursor: default;
  border: 2px solid transparent;
}
.db-circle:hover { transform: scale(1.12); }
.db-circle-none { background: rgba(255,255,255,0.05); color: rgba(245,230,200,0.3); border-color: rgba(255,255,255,0.08); }
.db-circle-high { background: linear-gradient(135deg,#16a34a,#22c55e); color: #fff; border-color: rgba(34,197,94,0.4); box-shadow: 0 4px 14px rgba(34,197,94,0.25); }
.db-circle-mid  { background: linear-gradient(135deg,#d97706,#f59e0b); color: #fff; border-color: rgba(245,158,11,0.4); box-shadow: 0 4px 14px rgba(245,158,11,0.2); }
.db-circle-low  { background: linear-gradient(135deg,#dc2626,#ef4444); color: #fff; border-color: rgba(239,68,68,0.4); box-shadow: 0 4px 14px rgba(239,68,68,0.2); }
.db-circle-lbl { font-size: 0.65rem; color: rgba(245,230,200,0.4); font-weight: 700; letter-spacing: 0.03em; }
.db-circle-quiz { font-size: 0.6rem; color: #FFB800; font-weight: 700; }

/* ── Weak topics ── */
.db-weak-list { display: flex; flex-direction: column; gap: 14px; }
.db-weak-row { display: flex; align-items: center; gap: 14px; }
.db-weak-info { flex: 1; min-width: 0; }
.db-weak-name { font-size: 0.88rem; font-weight: 700; color: #F5E6C8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.db-weak-meta { font-size: 0.7rem; color: rgba(245,230,200,0.35); margin-top: 2px; }
.db-weak-meter { flex: 1.5; display: flex; align-items: center; gap: 10px; min-width: 100px; }
.db-weak-track { flex: 1; height: 6px; background: rgba(255,255,255,0.07); border-radius: 3px; overflow: hidden; }
.db-weak-fill { height: 100%; border-radius: 3px; transition: width 0.9s ease; }
.db-weak-pct { font-size: 0.78rem; font-weight: 800; color: rgba(245,230,200,0.7); min-width: 34px; text-align: right; }

/* ── Recommendations ── */
.db-rec-list { display: flex; flex-direction: column; gap: 12px; list-style: none; }
.db-rec-item {
  display: flex; align-items: flex-start; gap: 14px;
  padding: 18px 20px;
  background: rgba(255,184,0,0.04); border: 1px solid rgba(255,184,0,0.12);
  border-radius: 16px;
  transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
}
.db-rec-item:hover { transform: translateX(5px); border-color: rgba(255,184,0,0.3); box-shadow: 0 4px 20px rgba(255,184,0,0.08); }
.db-rec-num {
  width: 28px; height: 28px; flex-shrink: 0; border-radius: 50%;
  background: linear-gradient(135deg,#FFB800,#FF8C00);
  color: #1C1108; font-weight: 900; font-size: 0.82rem;
  display: flex; align-items: center; justify-content: center;
}
.db-rec-emoji { font-size: 1.4rem; flex-shrink: 0; }
.db-rec-body { flex: 1; }
.db-rec-title { font-size: 0.92rem; font-weight: 800; color: #F5E6C8; margin-bottom: 4px; }
.db-rec-desc { font-size: 0.8rem; color: rgba(245,230,200,0.5); line-height: 1.55; }
.db-badge-high { background: rgba(239,68,68,0.12); color: #FCA5A5; border: 1px solid rgba(239,68,68,0.25); border-radius: 100px; padding: 3px 11px; font-size: 0.68rem; font-weight: 800; white-space: nowrap; align-self: flex-start; }
.db-badge-med  { background: rgba(245,158,11,0.12); color: #FCD34D; border: 1px solid rgba(245,158,11,0.25); border-radius: 100px; padding: 3px 11px; font-size: 0.68rem; font-weight: 800; white-space: nowrap; align-self: flex-start; }
.db-badge-low  { background: rgba(34,197,94,0.1);  color: #86EFAC; border: 1px solid rgba(34,197,94,0.2);  border-radius: 100px; padding: 3px 11px; font-size: 0.68rem; font-weight: 800; white-space: nowrap; align-self: flex-start; }

/* ── History table ── */
.db-table-wrap { overflow-x: auto; }
.db-table { width: 100%; border-collapse: collapse; font-size: 0.86rem; }
.db-table thead tr { border-bottom: 1px solid rgba(255,184,0,0.15); }
.db-table th { padding: 10px 16px; text-align: left; font-size: 0.68rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(245,230,200,0.35); }
.db-table td { padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); color: rgba(245,230,200,0.7); vertical-align: middle; }
.db-table tr:last-child td { border-bottom: none; }
.db-table tbody tr { transition: background 0.15s; }
.db-table tbody tr:hover td { background: rgba(255,184,0,0.04); color: #F5E6C8; }
.db-t-num { color: rgba(245,230,200,0.25) !important; font-size: 0.78rem; width: 32px; }
.db-t-topic { font-weight: 700; color: #F5E6C8 !important; }
.db-t-score { font-variant-numeric: tabular-nums; }
.db-t-date { font-size: 0.75rem; color: rgba(245,230,200,0.3) !important; }
.db-acc-green { color: #86EFAC !important; font-weight: 800; }
.db-acc-amber { color: #FCD34D !important; font-weight: 800; }
.db-acc-red   { color: #FCA5A5 !important; font-weight: 800; }

/* ── Divider ── */
.db-divider { height: 1px; background: rgba(255,184,0,0.1); margin: 24px 0; }

/* ── Empty state ── */
.db-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; gap: 10px; text-align: center; }
.db-empty-icon { font-size: 2.8rem; }
.db-empty-title { font-size: 0.95rem; font-weight: 700; color: rgba(245,230,200,0.6); }
.db-empty-sub { font-size: 0.78rem; color: rgba(245,230,200,0.3); }

/* ── Loading ── */
.db-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 100px 20px; }
.db-loading-bee { font-size: 3rem; animation: db-bee-fly 1.6s ease-in-out infinite; }
@keyframes db-bee-fly { 0%,100%{transform:translateY(0) rotate(-8deg)} 50%{transform:translateY(-14px) rotate(8deg)} }
.db-loading-text { font-size: 0.9rem; font-weight: 600; color: rgba(245,230,200,0.45); letter-spacing: 0.03em; }
.db-loading-bar { width: 160px; height: 3px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; }
.db-loading-fill { height: 100%; border-radius: 2px; background: linear-gradient(90deg,#FFB800,#FF8C00); animation: db-shimmer 1.2s ease-in-out infinite; }
@keyframes db-shimmer { 0%{width:0%} 60%{width:100%} 100%{width:100%;opacity:0} }

/* ── Error ── */
.db-error { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25); border-radius: 14px; padding: 16px 22px; display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
.db-error-text { flex: 1; font-size: 0.85rem; color: #FCA5A5; font-weight: 500; }
.db-error-retry { background: rgba(239,68,68,0.2); border: 1px solid rgba(239,68,68,0.3); color: #FCA5A5; border-radius: 8px; padding: 6px 14px; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
.db-error-retry:hover { background: rgba(239,68,68,0.3); }

/* ── Scrollbar ── */
.db-root ::-webkit-scrollbar { width: 6px; }
.db-root ::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
.db-root ::-webkit-scrollbar-thumb { background: rgba(255,184,0,0.2); border-radius: 3px; }

/* ── Responsive ── */
@media(max-width:900px){ .db-page{padding:24px 20px 48px} .db-nav{padding:0 20px} }
@media(max-width:640px){ .db-tabs{width:100%} .db-tab{flex:1;text-align:center;padding:9px 12px} }
`;

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */
async function apiFetch(path, userEmail) {
  const res = await fetch(path, { headers: { 'x-user-email': userEmail } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ─────────────────────────────────────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────────────────────────────────────── */

/** Animated SVG accuracy ring */
function AccuracyRing({ pct }) {
  const r = 26, circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const stroke = pct >= 75 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="db-ring-wrap">
      <svg className="db-ring-svg" viewBox="0 0 60 60">
        <circle className="db-ring-track" cx="30" cy="30" r={r} />
        <circle className="db-ring-fill" cx="30" cy="30" r={r}
          stroke={stroke} strokeDasharray={circ} strokeDashoffset={offset} />
        <text className="db-ring-text" x="30" y="28" textAnchor="middle" dominantBaseline="middle">{pct}%</text>
        <text className="db-ring-sub" x="30" y="40" textAnchor="middle">accuracy</text>
      </svg>
    </div>
  );
}

/** Weekly bar chart */
function BarChart({ days }) {
  if (!days?.length) return null;
  const max = Math.max(...days.map(d => d.studyMinutes), 1);
  return (
    <div className="db-bar-chart">
      {days.map((d, i) => {
        const pct = Math.max((d.studyMinutes / max) * 100, d.studyMinutes > 0 ? 5 : 0);
        return (
          <div key={i} className={`db-bar-col ${d.studyMinutes === 0 ? 'db-bar-0' : ''}`}>
            <div className="db-bar-tip">
              {d.studyMinutes > 0 ? `${d.studyMinutes}m` : 'No data'}
              {d.accuracy !== null ? ` · ${d.accuracy}%` : ''}
              {d.quizzesCompleted > 0 ? ` · ${d.quizzesCompleted}q` : ''}
            </div>
            <div className="db-bar-track">
              <div className="db-bar-fill" style={{ height: `${pct}%` }} />
            </div>
            <span className="db-bar-lbl">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Daily accuracy circles */
function AccuracyCircles({ days }) {
  if (!days?.length) return null;
  return (
    <div className="db-circles">
      {days.map((d, i) => {
        const cls = d.accuracy === null ? 'db-circle-none'
          : d.accuracy >= 75 ? 'db-circle-high'
          : d.accuracy >= 50 ? 'db-circle-mid' : 'db-circle-low';
        return (
          <div key={i} className="db-circle-item">
            <div className={`db-circle ${cls}`}>
              {d.accuracy !== null ? `${d.accuracy}%` : '—'}
            </div>
            <span className="db-circle-lbl">{d.label}</span>
            {d.quizzesCompleted > 0 && <span className="db-circle-quiz">{d.quizzesCompleted} quiz</span>}
          </div>
        );
      })}
    </div>
  );
}

/** Weak topic bar */
function WeakTopics({ topics }) {
  if (!topics?.length) return (
    <div className="db-empty">
      <div className="db-empty-icon">🌟</div>
      <div className="db-empty-title">No weak topics detected</div>
      <div className="db-empty-sub">Complete more quizzes for personalised insights.</div>
    </div>
  );
  return (
    <div className="db-weak-list">
      {topics.map((t, i) => {
        const fill = t.accuracy < 40 ? '#ef4444' : t.accuracy < 60 ? '#f97316' : '#f59e0b';
        return (
          <div key={i} className="db-weak-row">
            <div className="db-weak-info">
              <div className="db-weak-name">{t.topic}</div>
              <div className="db-weak-meta">{t.attempts} attempt{t.attempts !== 1 ? 's' : ''} · {new Date(t.lastStudiedAt).toLocaleDateString()}</div>
            </div>
            <div className="db-weak-meter">
              <div className="db-weak-track">
                <div className="db-weak-fill" style={{ width: `${t.accuracy}%`, background: fill }} />
              </div>
              <span className="db-weak-pct">{t.accuracy}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Priority badge */
function Badge({ priority }) {
  const cls = { High: 'db-badge-high', Medium: 'db-badge-med', Low: 'db-badge-low' }[priority] || 'db-badge-low';
  return <span className={cls}>{priority}</span>;
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────────── */
const ProgressDashboard = ({ onBack, userEmail }) => {
  const [overview, setOverview]           = useState(null);
  const [weekly, setWeekly]               = useState(null);
  const [weakTopics, setWeakTopics]       = useState([]);
  const [recommendations, setRecs]        = useState([]);
  const [history, setHistory]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [tab, setTab]                     = useState('overview');

  const loadAll = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [ov, wk, wt, rec, hist] = await Promise.all([
        apiFetch('/api/dashboard/overview', userEmail),
        apiFetch('/api/dashboard/weekly-progress', userEmail),
        apiFetch('/api/dashboard/weak-topics', userEmail),
        apiFetch('/api/dashboard/recommendations', userEmail),
        apiFetch('/api/dashboard/quiz-history', userEmail),
      ]);
      setOverview(ov); setWeekly(wk);
      setWeakTopics(wt.weakTopics || []);
      setRecs(rec.recommendations || []);
      setHistory(hist.history || []);
    } catch {
      setError('Could not reach the server. Make sure the backend is running on port 5000.');
    } finally { setLoading(false); }
  }, [userEmail]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const acc = overview?.overallAccuracy ?? 0;

  return (
    <div className="db-root">
      <style>{STYLES}</style>

      {/* ── Navbar ── */}
      <nav className="db-nav">
        <div className="db-nav-left">
          <button className="db-back-btn" onClick={onBack}>← Home</button>
          <div className="db-nav-divider" />
          <div className="db-nav-logo">Study<span>Bee</span></div>
          <div className="db-nav-divider" />
          <span className="db-nav-title">Learning Dashboard</span>
        </div>
        <div className="db-nav-right">
          <div className="db-chip">🐝 {userEmail}</div>
          <button className="db-nav-btn" onClick={loadAll}>↺ Refresh</button>
        </div>
      </nav>

      <div className="db-page">
        {/* ── Hero ── */}
        <div className="db-hero">
          <div className="db-hero-text">
            <div className="db-hero-eyebrow">🍯 Your Hive Intelligence Report</div>
            <h1 className="db-hero-h1">My <span>Learning</span> Dashboard</h1>
            <p className="db-hero-sub">Track your progress · Spot weak spots · Know what to study next</p>
          </div>
          <div className="db-hero-badge">
            <div className="db-live-dot" />
            Connected to MongoDB Atlas
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="db-error">
            <span>⚠️</span>
            <span className="db-error-text">{error}</span>
            <button className="db-error-retry" onClick={loadAll}>Retry</button>
          </div>
        )}

        {/* ── Loading ── */}
        {loading ? (
          <div className="db-loading">
            <div className="db-loading-bee">🐝</div>
            <div className="db-loading-text">Fetching your hive data…</div>
            <div className="db-loading-bar"><div className="db-loading-fill" /></div>
          </div>
        ) : (
          <>
            {/* ── Stat cards ── */}
            <div className="db-cards">
              {/* Accuracy */}
              <div className="db-card db-card-gold">
                <div className="db-card-inner">
                  <div className="db-card-icon">🎯</div>
                  <div className="db-card-value">{acc}%</div>
                  <div className="db-card-label">Quiz Accuracy</div>
                  <div className="db-card-sub">All-time average</div>
                </div>
                <AccuracyRing pct={acc} />
                <div className="db-card-accent">🎯</div>
              </div>

              {/* Streak */}
              <div className="db-card db-card-fire">
                <div className="db-card-inner">
                  <div className="db-card-icon">🔥</div>
                  <div className="db-card-value">{overview?.studyStreak ?? 0}</div>
                  <div className="db-card-label">Day Streak</div>
                  <div className="db-card-sub">Consecutive study days</div>
                </div>
                <div className="db-card-accent">🔥</div>
              </div>

              {/* Quizzes */}
              <div className="db-card db-card-green">
                <div className="db-card-inner">
                  <div className="db-card-icon">📝</div>
                  <div className="db-card-value">{overview?.totalQuizzes ?? 0}</div>
                  <div className="db-card-label">Quizzes Done</div>
                  <div className="db-card-sub">All-time total</div>
                </div>
                <div className="db-card-accent">🏆</div>
              </div>

              {/* Study time */}
              <div className="db-card db-card-blue">
                <div className="db-card-inner">
                  <div className="db-card-icon">⏱️</div>
                  <div className="db-card-value">{overview?.studyTimeThisWeek ?? '0m'}</div>
                  <div className="db-card-label">Study Time</div>
                  <div className="db-card-sub">This week</div>
                </div>
                <div className="db-card-accent">📚</div>
              </div>
            </div>

            {/* ── Tabs ── */}
            <div className="db-tabs">
              {[
                { id: 'overview', label: '📊 Overview' },
                { id: 'recommendations', label: '💡 Recommendations' },
                { id: 'history', label: '📋 History' },
              ].map(t => (
                <button key={t.id} className={`db-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── Overview Tab ── */}
            {tab === 'overview' && (
              <>
                <div className="db-grid-2" style={{ marginBottom: 16 }}>
                  {/* Weekly study activity */}
                  <div className="db-panel">
                    <div className="db-panel-hd">
                      <div className="db-panel-title">📈 Weekly Study Activity</div>
                      <span className="db-panel-badge">Last 7 days</span>
                    </div>
                    <BarChart days={weekly?.days} />
                    {weekly?.days?.every(d => d.studyMinutes === 0) && (
                      <div style={{ marginTop: 10, fontSize: '0.78rem', color: 'rgba(245,230,200,0.3)', textAlign: 'center' }}>
                        No sessions recorded yet — start using StudyBee to populate this chart!
                      </div>
                    )}
                  </div>

                  {/* Weak topics */}
                  <div className="db-panel">
                    <div className="db-panel-hd">
                      <div className="db-panel-title">⚠️ Topics Needing Work</div>
                      <span className="db-panel-badge">Accuracy &lt; 70%</span>
                    </div>
                    <WeakTopics topics={weakTopics} />
                  </div>
                </div>

                {/* Daily accuracy circles */}
                <div className="db-panel">
                  <div className="db-panel-hd">
                    <div className="db-panel-title">🎯 Daily Accuracy</div>
                    <span className="db-panel-badge">Last 7 days</span>
                  </div>
                  <AccuracyCircles days={weekly?.days} />
                </div>
              </>
            )}

            {/* ── Recommendations Tab ── */}
            {tab === 'recommendations' && (
              <div className="db-panel">
                <div className="db-panel-hd">
                  <div className="db-panel-title">💡 Recommended for You</div>
                  <span className="db-panel-badge">Based on your history</span>
                </div>
                {recommendations.length === 0 ? (
                  <div className="db-empty">
                    <div className="db-empty-icon">🐝</div>
                    <div className="db-empty-title">The hive is still thinking…</div>
                    <div className="db-empty-sub">Complete a few quizzes to unlock personalised recommendations!</div>
                  </div>
                ) : (
                  <ol className="db-rec-list">
                    {recommendations.map((r, i) => (
                      <li key={i} className="db-rec-item">
                        <div className="db-rec-num">{i + 1}</div>
                        <div className="db-rec-emoji">{r.icon}</div>
                        <div className="db-rec-body">
                          <div className="db-rec-title">{r.title}</div>
                          <div className="db-rec-desc">{r.description}</div>
                        </div>
                        <Badge priority={r.priority} />
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}

            {/* ── History Tab ── */}
            {tab === 'history' && (
              <div className="db-panel">
                <div className="db-panel-hd">
                  <div className="db-panel-title">📋 Recent Quiz Attempts</div>
                  <span className="db-panel-badge">Last 10</span>
                </div>
                {history.length === 0 ? (
                  <div className="db-empty">
                    <div className="db-empty-icon">📝</div>
                    <div className="db-empty-title">No quiz attempts yet</div>
                    <div className="db-empty-sub">Generate a quiz and submit your answers — results appear here.</div>
                  </div>
                ) : (
                  <div className="db-table-wrap">
                    <table className="db-table">
                      <thead>
                        <tr><th>#</th><th>Topic</th><th>Score</th><th>Accuracy</th><th>Date</th></tr>
                      </thead>
                      <tbody>
                        {history.map((h, i) => {
                          const accCls = h.accuracy >= 75 ? 'db-acc-green' : h.accuracy >= 50 ? 'db-acc-amber' : 'db-acc-red';
                          return (
                            <tr key={h.id}>
                              <td className="db-t-num">{i + 1}</td>
                              <td className="db-t-topic">{h.topic}</td>
                              <td className="db-t-score">{h.score}</td>
                              <td><span className={accCls}>{h.accuracy}%</span></td>
                              <td className="db-t-date">{new Date(h.date).toLocaleDateString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProgressDashboard;
