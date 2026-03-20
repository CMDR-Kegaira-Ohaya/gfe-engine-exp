import { AXES, GLOSSES, ZONES, SIGMA_COLORS, state, esc, findParticipant } from './state.js';

export function renderRight(session) {
  const t = (session.timeline || [])[state.currentT];
  if (!t) return;
  const el = document.getElementById('right-content');
  if (!state.focusedPid) renderSystemView(session, t, el);
  else renderParticipantView(session, t, findParticipant(session, state.focusedPid), el);
}

export function renderSystemView(session, t, el) {
  let html = `<div class="reading-header">
    <div class="reading-name">${esc(session.system_name || 'System')}</div>
    <div class="reading-meta">${esc(t.timestep_label || '')}</div>
  </div>`;

  if (t.narrative_note) {
    html += `<p style="font-size:14px;font-style:italic;color:var(--text2);line-height:1.7;margin-bottom:16px;">${esc(t.narrative_note)}</p>`;
  }
  if (t.pressure_notes) {
    html += `<div class="pressure-note"><span class="pn-label">Pressure · system</span>${esc(t.pressure_notes)}</div>`;
  }
  if (t.pressure_dynamics) {
    html += `<div class="pressure-dynamics"><span class="pd-label">Pressure dynamics</span>${esc(t.pressure_dynamics)}</div>`;
  }

  const events = (session.payload_events || []).filter(pe => pe.timestep_idx === state.currentT);
  if (events.length) {
    html += `<div class="sec-label collapsible-header" onclick="toggleC('sys-ev')">Payload Events <span class="collapsible-arr open" id="arr-sys-ev">▶</span></div>
    <div class="collapsible-body" id="sys-ev"><div style="margin-bottom:16px;">${renderEventsHtml(events)}</div></div>`;
  }

  const isLast = state.currentT === ((session.timeline?.length || 1) - 1);
  if (session.analysis && isLast) html += renderAnalysisHtml(session.analysis);

  if (!t.narrative_note && !events.length && !session.analysis) {
    html += `<div style="opacity:0.4;margin-top:40px;text-align:center;font-style:italic;color:var(--text2);">Select a participant to read their state.</div>`;
  }

  el.innerHTML = html;
}

export function renderParticipantView(session, t, p, el) {
  const pdata = t?.participants?.[p?.id] || {};
  const axes = pdata.axes || {};
  const pr = pdata.payload_register;
  const pNote = pdata.pressure_note;
  const prev = pdata.prevalence;
  const theta = pdata.theta;
  const comp = pdata.compensation;

  const tabs = `<div class="tabs">
    <div class="tab ${state.rightTab === 'axes' ? 'active' : ''}" onclick="setTab('axes')">Axes</div>
    <div class="tab ${state.rightTab === 'events' ? 'active' : ''}" onclick="setTab('events')">Events</div>
    <div class="tab ${state.rightTab === 'analysis' ? 'active' : ''}" onclick="setTab('analysis')">Analysis</div>
  </div>`;

  let body = '';

  if (state.rightTab === 'axes') {
    if (prev) {
      const prevSc = SIGMA_COLORS[prev.family] || SIGMA_COLORS.L;
      body += `<div class="prevalence-bar">
        <span class="prev-label">Prevalence</span>
        <span class="prev-family" style="background:${prevSc.bg};color:${prevSc.fg};">${esc(prev.family)}</span>
        ${prev.note ? `<span class="prev-note">${esc(prev.note)}</span>` : ''}
      </div>`;
    }

    if (theta && theta.active) {
      body += `<div class="theta-bar">
        <span class="theta-label">Θ ACTIVE</span>
        ${theta.blocked_family ? `<span class="theta-blocked">${esc(theta.blocked_family)} blocked</span>` : ''}
        ${theta.note ? `<span class="theta-note">${esc(theta.note)}</span>` : ''}
      </div>`;
    }

    if (comp && comp.active) {
      const compCls = comp.type === 'maladaptive' ? 'comp-maladaptive' : 'comp-adaptive';
      body += `<div class="comp-bar">
        <span class="comp-label">Compensation</span>
        <span class="comp-type ${compCls}">${esc(comp.type || 'active')}</span>
        ${comp.note ? `<span class="comp-note">${esc(comp.note)}</span>` : ''}
      </div>`;
    }

    if (pr) {
      body += `<div class="register-panel">
        <div><div class="reg-col-label">Retained</div>
          <div class="reg-note">${esc(pr.retained?.note || '—')}</div>
        </div>
        <div><div class="reg-col-label emitted">Emitted</div>
          <div class="reg-note">${esc(pr.emitted?.note || '—')}</div>
        </div>
        ${pr.retained?.note && pr.emitted?.note && pr.retained.note !== pr.emitted.note
          ? `<div class="reg-gap-note">Register gap: retained ≠ emitted — payload register divergence active</div>`
          : ''}
      </div>`;
    }

    if (pNote) body += `<div class="pressure-note"><span class="pn-label">Pressure</span>${esc(pNote)}</div>`;

    ['foundation','bridge','articulation'].forEach(zone => {
      const zm = ZONES[zone];
      const inZone = zm.dims.filter(d => axes[d]);
      if (!inZone.length) return;
      body += `<div class="zone-block">
        <div class="zone-header">
          <div class="zone-pip" style="background:${zm.pip}"></div>
          <div class="zone-label" style="color:${zm.color}">${zm.label}</div>
          <div class="zone-rule"></div>
        </div>
        ${inZone.map(d => renderAxisCard(d, axes[d])).join('')}
      </div>`;
    });
  } else if (state.rightTab === 'events') {
    const all = (session.payload_events || []).filter(pe => pe.timestep_idx === state.currentT);
    const rel = all.filter(pe => {
      const srcId = (pe.alpha_source || pe.alpha_from || '').split('.')[0];
      const rcvId = (pe.alpha_receiving || pe.alpha_to || '').split('.')[0];
      const medId = (pe.alpha_medium || '').split('.')[0];
      return srcId === p?.id || rcvId === p?.id || medId === p?.id;
    });
    const events = rel.length > 0 ? rel : all;
    body = events.length
      ? `<div style="margin-top:4px;">${renderEventsHtml(events)}</div>`
      : `<p style="font-style:italic;color:var(--text3);font-size:13px;margin-top:20px;">No events at this timestep.</p>`;
  } else {
    body = session.analysis
      ? renderAnalysisHtml(session.analysis)
      : `<p style="font-style:italic;color:var(--text3);font-size:13px;margin-top:20px;">Analysis appears at the final timestep.</p>`;
  }

  let subHtml = '';
  if (p?.sub_participants?.length) {
    subHtml = `<div class="sub-prompt">
      <span>⊕ ${p.sub_participants.length} sub-participants</span>
      <button class="sub-btn" onclick="zoomToSub('${p.id}')">Zoom in</button>
    </div>`;
  }

  el.innerHTML = `<div class="reading-header">
    <div class="reading-name">${esc(p?.name || state.focusedPid || '')}</div>
    <div class="reading-meta">${esc(p?.address || p?.locus || 'local')} · ${esc(p?.description || '')}</div>
  </div>${tabs}<div>${body}</div>${subHtml}`;
}

export function renderAxisCard(d, ax) {
  const A = ax.A || 0;
  const R = ax.R || 0;
  const I = ax.I || 0;
  const sigma = ax.sigma || 'L';
  const sc = SIGMA_COLORS[sigma] || SIGMA_COLORS.L;
  const isEq = Math.abs(A - R) <= 5 && Math.abs(A - I) <= 5 && A > 0;
  const valence = ax.valence || '';

  return `<div class="axis-card">
    <div class="axis-head">
      <span class="axis-name">${d}</span>
      <span class="axis-gloss">${GLOSSES[d] || ''}</span>
      <span class="sigma-badge sigma-${sigma}">σ ${sigma}</span>
    </div>
    <div class="axis-vals">
      <div class="axis-val"><div class="axis-val-num val-A">${A}</div><span class="axis-val-label">A · availability</span></div>
      <div class="axis-val"><div class="axis-val-num val-R">${R}</div><span class="axis-val-label">R · retention</span></div>
      <div class="axis-val"><div class="axis-val-num val-I">${I}</div><span class="axis-val-label">I · intensity</span></div>
    </div>
    <div class="ari-bar">
      <div class="ari-bar-a" style="width:${A}%;background:${sc.bar};"></div>
      <div class="ari-bar-r" style="width:${R}%;background:${sc.barBright};"></div>
      <div class="ari-bar-i" style="left:${Math.min(I,99)}%;background:var(--gold-bright);"></div>
    </div>
    <div class="ari-bar-legend">
      <div class="ari-legend-item"><div class="ari-legend-pip" style="background:${sc.bar}"></div>A</div>
      <div class="ari-legend-item"><div class="ari-legend-pip" style="background:${sc.barBright}"></div>R</div>
      <div class="ari-legend-item"><div class="ari-legend-pip" style="background:var(--gold-bright)"></div>I</div>
      <div class="ari-legend-item" style="margin-left:auto;">
        ${isEq ? '<span class="eq-indicator eq-yes">≈ equilibrium</span>' : '<span class="eq-indicator eq-no">≠ disequilibrium</span>'}
      </div>
    </div>
    ${valence ? `<div class="valence-row"><span class="valence-label">α_d_valence ·</span><span class="valence-text">${esc(valence)}</span></div>` : ''}
  </div>`;
}

export function renderEventsHtml(events) {
  if (!events.length) return '';
  return events.map(pe => {
    const unfTag = pe.unfolding === 'acute' ? 'tag-acute' : 'tag-accumulated';
    const unfLabel = pe.unfolding === 'acute' ? '↓ acute' : '↑ accum';
    const regTag = pe.register === 'emitted' ? 'tag-emitted' : 'tag-retained';
    const sigBadge = pe.sigma ? `<span class="sigma-badge sigma-${pe.sigma}" style="font-size:7px;">${pe.sigma}</span>` : '';
    const src = esc(pe.alpha_source || pe.alpha_from || '?');
    const med = pe.alpha_medium ? esc(pe.alpha_medium) : null;
    const rcv = esc(pe.alpha_receiving || pe.alpha_to || '?');
    const flowStr = med ? `${src} → <span style="color:var(--teal)">${med}</span> → ${rcv}` : `${src} → ${rcv}`;
    const faceBadge = pe.face ? `<span class="face-badge face-${pe.face}">${pe.face}</span>` : '';
    const intNote = pe.interference ? `<span class="interference-note">${esc(pe.interference)}</span>` : '';
    const bearNote = pe.bearing ? `<span class="tag-mode" title="payload_bearing">${esc(pe.bearing)}</span>` : '';
    return `<div class="event-row">
      <span class="ev-flow">${flowStr}</span>
      ${sigBadge}${faceBadge}
      <span class="ev-tag ${unfTag}">${unfLabel}</span>
      <span class="ev-tag ${regTag}">${pe.register || 'retained'}</span>
      ${pe.mode ? `<span class="tag-mode">${esc(pe.mode)}</span>` : ''}
      ${bearNote}
      <span class="ev-desc">${esc(pe.effect || '')}</span>
      ${intNote}
      ${pe.magnitude ? `<span class="ev-mag">×${pe.magnitude}</span>` : ''}
    </div>`;
  }).join('');
}

export function renderAnalysisHtml(a) {
  const invHtml = a.invariants_tested
    ? Object.entries(a.invariants_tested).map(([k,v]) =>
        `<span class="inv-chip ${v ? 'held' : 'failed'}">${k}</span>`).join('')
    : '';

  return `<div class="analysis-card">
    <div class="sec-label" style="margin-bottom:10px;">Structural Analysis</div>
    ${a.cascade_type ? `<div class="a-row"><span class="a-key">Cascade</span><span class="a-val">${esc(a.cascade_type)}</span></div>` : ''}
    ${a.starting_axis ? `<div class="a-row"><span class="a-key">Starts at</span><span class="a-val">${esc(a.starting_axis)}</span></div>` : ''}
    ${a.failure_grammar ? `<div class="a-row"><span class="a-key">Failure</span><span class="a-val">${esc(a.failure_grammar)}</span></div>` : ''}
    ${a.recovery_type ? `<div class="a-row"><span class="a-key">Recovery</span><span class="a-val">${esc(a.recovery_type)}</span></div>` : ''}
    ${invHtml ? `<div class="a-row"><span class="a-key">Invariants</span><div class="inv-chips">${invHtml}</div></div>` : ''}
    ${a.key_finding ? `<div class="key-finding">"${esc(a.key_finding)}"</div>` : ''}
  </div>`;
}
