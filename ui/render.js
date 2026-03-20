import { AXES, SIGMA_COLORS, state, show, esc } from './state.js';
import { saveToStorage } from './storage.js';
import { renderConstellation } from './constellation.js';
import { renderRight } from './right-panel.js';

export function renderAll() {
  const hasData = state.sessions.length > 0;
  const s = state.sessions[state.currentIdx];

  const dot = document.getElementById('status-dot');
  const label = document.getElementById('status-label');

  if (hasData && s) {
    dot?.classList.add('active');
    if (label) label.textContent = (s.system_name || 'Case') + ' · T' + state.currentT;
  } else {
    dot?.classList.remove('active');
    if (label) label.textContent = 'No case loaded';
  }

  show('right-empty', !hasData);
  show('right-content', hasData);

  ['sessions-section','envelope-section','constellation-section','timeline-section','strips-section']
    .forEach(id => show(id, hasData));

  if (!hasData) return;

  renderSessions();
  renderEnvelope(s);
  renderTimeline(s);
  renderStrips(s);
  renderConstellation(s);
  renderRight(s);
}

export function renderSessions() {
  const el = document.getElementById('session-list');
  if (!el) return;
  el.innerHTML = state.sessions.map((s, i) => `
    <div class="session-item ${i === state.currentIdx ? 'active' : ''}" onclick="switchSession(${i})">
      <span class="session-badge badge-${s._type || 'new'}">${s._type || 'new'}</span>
      <span class="session-name">${esc(s.system_name || s.case_id || 'Case')}</span>
      <span class="session-remove" onclick="removeSession(event,${i})">×</span>
    </div>`).join('');
}

export function getEnvelope(s) {
  const t = (s.timeline || [])[state.currentT];
  if (!t) return null;
  const pids = state.focusedPid ? [state.focusedPid] : (s.participants || []).map(p => p.id);
  let cfgA = 0, embA = 0, orgA = 0, n = 0;

  pids.forEach(pid => {
    const ax = t.participants?.[pid]?.axes || {};
    cfgA += ax.Cfg?.A || 0;
    embA += ax.Emb?.A || 0;
    orgA += ax.Org?.A || 0;
    n++;
  });

  if (!n) return null;
  cfgA = Math.round(cfgA / n);
  embA = Math.round(embA / n);
  orgA = Math.round(orgA / n);
  const env = Math.min(cfgA, embA, orgA);
  return { env, adm: cfgA, bear: embA, coh: orgA };
}

export function renderEnvelope(s) {
  const ev = getEnvelope(s);
  if (!ev) return;
  const score = document.getElementById('env-score');
  const status = document.getElementById('env-status');
  const comps = document.getElementById('env-components');

  if (score) {
    score.textContent = ev.env;
    score.className = 'env-score ' + (ev.env < 10 ? 'collapsed' : ev.env < 30 ? 'critical' : ev.env < 60 ? 'strained' : 'ok');
  }

  if (status) {
    status.textContent = ev.env < 10 ? '⬛ COLLAPSE' : ev.env < 30 ? '⚠ CRITICAL' : ev.env < 60 ? '◈ STRAINED' : '◉ HOLDING';
    status.style.color = ev.env < 30 ? 'var(--dst)' : ev.env < 60 ? 'var(--mis)' : 'var(--al)';
  }

  if (comps) {
    comps.innerHTML = `
      <div class="env-comp"><div class="env-comp-val" style="color:var(--gold)">${ev.adm}</div><span class="env-comp-label">Adm·Cfg</span></div>
      <div class="env-comp"><div class="env-comp-val" style="color:var(--gold)">${ev.bear}</div><span class="env-comp-label">Bear·Emb</span></div>
      <div class="env-comp"><div class="env-comp-val" style="color:var(--teal)">${ev.coh}</div><span class="env-comp-label">Coh·Org</span></div>`;
  }
}

export function renderTimeline(s) {
  const tl = s.timeline || [];
  const slider = document.getElementById('tl-slider');
  if (!slider) return;
  slider.max = Math.max(0, tl.length - 1);
  slider.value = state.currentT;
  slider.oninput = () => {
    state.currentT = parseInt(slider.value, 10);
    renderAll();
  };

  const stops = document.getElementById('tl-stops');
  if (stops) {
    stops.innerHTML = tl.map((t, i) => `
      <div class="tl-stop ${i === state.currentT ? 'active' : ''} ${t._boundary ? 'boundary' : ''}" onclick="jumpTo(${i})">
        <div class="tl-dot"></div>
        <div class="tl-label">${esc(t.timestep_label || 'T' + i)}</div>
      </div>`).join('');
  }
}

export function jumpTo(i) {
  state.currentT = i;
  const slider = document.getElementById('tl-slider');
  if (slider) slider.value = i;
  renderAll();
}

export function renderStrips(s) {
  const t = (s.timeline || [])[state.currentT];
  const el = document.getElementById('strips');
  if (!el) return;

  el.innerHTML = (s.participants || []).map(p => {
    const pdata = t?.participants?.[p.id] || {};
    const axes = pdata.axes || {};
    const prev = pdata.prevalence;
    const theta = pdata.theta;
    const comp = pdata.compensation;

    const miniAxes = AXES.map(d => {
      const ax = axes[d] || { A:0, R:0, I:0, sigma:'L' };
      const sc = SIGMA_COLORS[ax.sigma] || SIGMA_COLORS.L;
      return `<div>
        <div class="mini-axis-label">${d}</div>
        <div class="mini-bar">
          <div class="mini-bar-a" style="width:${ax.A}%;background:${sc.bar};"></div>
          <div class="mini-bar-r" style="width:${ax.R}%;background:${sc.barBright};"></div>
        </div>
      </div>`;
    }).join('');

    let indicators = '';
    if (prev || theta?.active || comp?.active) {
      const inds = [];
      if (prev) {
        const psc = SIGMA_COLORS[prev.family] || SIGMA_COLORS.L;
        inds.push(`<span class="strip-ind" style="background:${psc.bg};color:${psc.fg};">prev:${prev.family}</span>`);
      }
      if (theta?.active) inds.push(`<span class="strip-ind" style="background:var(--dst-pale);color:var(--dst);">Θ</span>`);
      if (comp?.active) {
        const cc = comp.type === 'maladaptive'
          ? 'background:var(--mis-pale);color:var(--mis)'
          : 'background:var(--al-pale);color:var(--al)';
        inds.push(`<span class="strip-ind" style="${cc}">comp</span>`);
      }
      indicators = `<div class="strip-indicators">${inds.join('')}</div>`;
    }

    return `<div class="strip ${state.focusedPid === p.id ? 'focused' : ''}" onclick="focusP('${p.id}')">
      <div class="strip-header">
        <span class="strip-name">${esc(p.name || p.id)}</span>
        <span class="strip-locus">${esc(p.address || p.locus || 'local')}</span>
      </div>
      <div class="mini-axes">${miniAxes}</div>
      ${indicators}
    </div>`;
  }).join('');
}

export function focusP(id) {
  state.focusedPid = state.focusedPid === id ? null : id;
  renderAll();
}

export function switchSession(i) {
  state.currentIdx = i;
  state.currentT = 0;
  state.focusedPid = null;
  state.zoomStack = [];
  renderAll();
}

export function removeSession(e, i) {
  e.stopPropagation();
  state.sessions.splice(i, 1);
  if (state.currentIdx >= state.sessions.length) {
    state.currentIdx = Math.max(0, state.sessions.length - 1);
  }
  saveToStorage();
  renderAll();
}
