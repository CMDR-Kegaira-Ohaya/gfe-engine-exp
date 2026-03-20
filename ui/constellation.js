import { AXES, SIGMA_COLORS, state, esc, findParticipant } from './state.js';

export function renderConstellation(session) {
  const canvas = document.getElementById('constellation-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth;
  const H = 200;
  canvas.width = W;
  canvas.height = H;
  ctx.clearRect(0, 0, W, H);

  const t = (session.timeline || [])[state.currentT];
  if (!t) return;

  let participants = session.participants || [];
  const curZoom = state.zoomStack[state.zoomStack.length - 1];
  if (curZoom) {
    const parent = findParticipant(session, curZoom);
    if (parent?.sub_participants?.length) participants = parent.sub_participants;
  }

  const cx = W / 2;
  const cy = H / 2 + 8;
  const r = Math.min(W, H) * 0.3;

  state.cNodes = participants.map((p, i) => {
    const angle = participants.length === 1 ? -Math.PI / 2 : (i / participants.length) * 2 * Math.PI - Math.PI / 2;
    const x = participants.length === 1 ? cx : cx + r * Math.cos(angle);
    const y = participants.length === 1 ? cy : cy + r * Math.sin(angle);
    const pdata = t.participants?.[p.id] || {};
    const axes = pdata.axes || {};
    const getA = d => (axes[d]?.A || 0);
    const totalA = AXES.reduce((sum, d) => sum + getA(d), 0) / 5;
    const orgA = getA('Org');
    const cfgA = getA('Cfg');
    const embA = getA('Emb');
    const env = Math.min(cfgA, embA, orgA);
    const prev = pdata.prevalence;
    const theta = pdata.theta;
    const comp = pdata.compensation;
    return {
      p, x, y, totalA, env, orgA, comp,
      prevFamily: prev?.family || 'L',
      thetaActive: theta?.active || false
    };
  });

  const events = (session.payload_events || []).filter(pe => pe.timestep_idx === state.currentT);
  const agg = new Map();

  for (const pe of events) {
    const srcId = (pe.alpha_source || pe.alpha_from || '').split('.')[0];
    const rcvId = (pe.alpha_receiving || pe.alpha_to || '').split('.')[0];
    const medId = (pe.alpha_medium || '').split('.')[0] || '';
    if (!srcId || !rcvId || srcId === rcvId) continue;

    const unfolding = pe.unfolding === 'accumulated' ? 'accumulated' : 'acute';
    const mode = (pe.mode || pe.mu || '').toString().replaceAll('_','-');
    const key = `${srcId}|${medId}|${rcvId}|${unfolding}|${mode}`;

    const mag = Number(pe.magnitude || 3);
    const prev = agg.get(key) || { srcId, rcvId, medId, unfolding, mode, count: 0, sumMag: 0, maxMag: 0 };
    prev.count += 1;
    prev.sumMag += mag;
    prev.maxMag = Math.max(prev.maxMag, mag);
    agg.set(key, prev);
  }

  for (const a of agg.values()) {
    const from = state.cNodes.find(n => n.p.id === a.srcId);
    const to = state.cNodes.find(n => n.p.id === a.rcvId);
    const med = a.medId ? state.cNodes.find(n => n.p.id === a.medId) : null;
    if (!from || !to) continue;

    const baseW = Math.max(1, a.maxMag * 0.35);
    const bumpW = Math.min(2.0, Math.log2(a.count + 1) * 0.45);
    const lineW = baseW + bumpW;

    const baseA = 0.18;
    const bumpA = Math.min(0.22, Math.log2(a.count + 1) * 0.06);
    const alpha = baseA + bumpA;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.setLineDash(a.unfolding === 'accumulated' ? [4,4] : []);
    ctx.strokeStyle = a.unfolding === 'acute' ? '#c9a84c' : '#3a7a7a';
    ctx.lineWidth = lineW;

    if (med && med !== from && med !== to) {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(med.x, med.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  state.cNodes.forEach(n => {
    const { x, y, totalA, prevFamily, thetaActive, env, p, orgA } = n;
    const isFocus = state.focusedPid === p.id;
    const radius = 14 + (totalA / 100) * 12;
    const sc = SIGMA_COLORS[prevFamily] || SIGMA_COLORS.L;

    if (thetaActive) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, radius + 9, 0, Math.PI * 2);
      ctx.strokeStyle = '#a03030';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3,3]);
      ctx.globalAlpha = 0.5;
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
    ctx.strokeStyle = sc.barBright;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.restore();

    const fillCol = env < 20 ? '#a03030' : env < 45 ? '#c07040' : sc.barBright;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = fillCol;
    ctx.globalAlpha = 0.15;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = isFocus ? '#c9a84c' : '#4a4640';
    ctx.lineWidth = isFocus ? 2 : 1.5;
    ctx.globalAlpha = isFocus ? 1 : 0.6;
    ctx.stroke();
    ctx.restore();

    if (orgA > 60) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#3a7a7a';
      ctx.globalAlpha = 0.5;
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.font = `${isFocus ? '500 ' : ''}12px "Cormorant Garamond", serif`;
    ctx.fillStyle = '#d4cfc4';
    ctx.globalAlpha = 0.9;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lbl = p.name?.length > 11 ? p.name.slice(0, 10) + '…' : (p.name || p.id);
    ctx.fillText(lbl, x, y);
    ctx.restore();

    if (p.sub_participants?.length) {
      ctx.save();
      ctx.font = '8px "DM Mono", monospace';
      ctx.fillStyle = '#3a7a7a';
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.7;
      ctx.fillText('⊕' + p.sub_participants.length, x, y + radius + 13);
      ctx.restore();
    }
  });

  renderBreadcrumb(session);
}

export function renderBreadcrumb(session) {
  const el = document.getElementById('breadcrumb');
  if (!el) return;
  if (!state.zoomStack.length) {
    el.innerHTML = '';
    return;
  }
  const parts = [`<span class="bc-item" onclick="zoomTo(-1)">System</span>`];
  state.zoomStack.forEach((pid, i) => {
    const p = findParticipant(session, pid);
    parts.push(`<span class="bc-sep">›</span>`);
    parts.push(`<span class="bc-item" onclick="zoomTo(${i})">${esc(p?.name || pid)}</span>`);
  });
  el.innerHTML = parts.join('');
}

export function onConstellationClick(e, renderAll) {
  const canvas = document.getElementById('constellation-canvas');
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const my = (e.clientY - rect.top) * (canvas.height / rect.height);
  let hit = null;
  let minD = Infinity;

  state.cNodes.forEach(n => {
    const d = Math.hypot(mx - n.x, my - n.y);
    if (d < 32 && d < minD) {
      minD = d;
      hit = n;
    }
  });

  if (hit) {
    if (state.focusedPid === hit.p.id && hit.p.sub_participants?.length) {
      state.zoomStack.push(hit.p.id);
      state.focusedPid = null;
    } else {
      state.focusedPid = state.focusedPid === hit.p.id ? null : hit.p.id;
    }
  } else {
    state.focusedPid = null;
  }
  renderAll();
}

export function zoomTo(i, renderAll) {
  state.zoomStack = i < 0 ? [] : [...state.zoomStack.slice(0, i + 1)];
  state.focusedPid = null;
  renderAll();
}

export function zoomToSub(pid, renderAll) {
  state.zoomStack.push(pid);
  state.focusedPid = null;
  renderAll();
}
