
const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

const formatNumber = value => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
};

function chipTone(kind, value) {
  const normalized = String(value || '').toLowerCase();
  if (kind === 'sigma') {
    if (normalized === 'l') return 'good';
    if (normalized === 'm') return 'warn';
    if (normalized === 'dst') return 'bad';
  }
  if (kind === 'theta' || kind === 'cascade') {
    return normalized === 'active' || normalized === 'on' ? 'warn' : 'good';
  }
  if (kind === 'compensation') {
    if (normalized === 'adaptive') return 'good';
    if (normalized === 'maladaptive') return 'bad';
  }
  if (kind === 'validation') {
    if (normalized.includes('0e') && normalized.includes('/ 0w')) return 'good';
    if (normalized.includes('0e')) return 'warn';
    return 'bad';
  }
  return '';
}

function renderChip(label, value, kind = '') {
  const tone = chipTone(kind, value);
  return `<span class="chip ${tone}">${escapeHtml(label)} ${escapeHtml(value)}</span>`;
}

function participantChipRow(participant) {
  if (!participant) {
    return '<div class="chip-row"><span class="chip">No participant</span></div>';
  }
  const sigma = participant.axes?.Cfg?.sigma || '—';
  const prevalence = participant.prevalence?.family || '—';
  const theta = participant.theta?.active ? 'active' : 'inactive';
  const compensation = participant.compensation?.type || 'none';
  const cascade = participant.cascade?.active ? 'active' : 'inactive';
  return `<div class="chip-row">
    ${renderChip('Cfg Σ', sigma, 'sigma')}
    ${renderChip('Prev', prevalence)}
    ${renderChip('Θ', theta, 'theta')}
    ${renderChip('Comp', compensation, 'compensation')}
    ${renderChip('Cascade', cascade, 'cascade')}
  </div>`;
}

function sourceMetrics(source) {
  return {
    timesteps: Array.isArray(source.data?.timeline) ? source.data.timeline.length : 0,
    participants: Array.isArray(source.data?.participants) ? source.data.participants.length : 0,
    events: Array.isArray(source.data?.payload_events) ? source.data.payload_events.length : 0,
  };
}

function selectedContext(state) {
  const step = state.solved?.timeline?.[state.selectedTimestep] || null;
  const participant = step?.participants?.[state.selectedParticipantId] || null;
  return { step, participant };
}

function workspaceManifest(state, activeSources) {
  const currentStep = state.solved?.timeline?.[state.selectedTimestep] || null;
  return {
    mode: state.mode,
    rule:
      state.mode === 'serial'
        ? 'append by source order'
        : state.mode === 'parts'
          ? 'merge steps by timestep label'
          : state.mode === 'themes'
            ? 'filter enabled sources by theme'
            : 'use first enabled source',
    theme_filter: state.themeFilter || '',
    source_count: activeSources().length,
    selected_timestep: currentStep?.timestep_label || '—',
    selected_participant: state.selectedParticipantId || '—',
    sources: activeSources().map(source => ({
      title: source.title,
      origin: source.origin,
      order: source.order,
      theme: source.theme || '',
    })),
  };
}

function renderRepoCases(state, els) {
  if (!state.repoCases.length) {
    els.repoCases.innerHTML = '<div class="empty">No repo cases found.</div>';
    return;
  }
  els.repoCases.innerHTML = state.repoCases.map(item => `
    <div class="repo-item">
      <div class="item-head">
        <div class="title">${escapeHtml(item.system_name || item.case_id || item.filename)}</div>
        <div class="chip-row compact">${renderChip('Repo', 'case')}</div>
      </div>
      <div class="repo-meta">${escapeHtml(item.filename)} · ${item.timesteps || 0} steps · ${item.participants || 0} participants</div>
      <div class="row"><button data-add-repo="${escapeHtml(item.filename)}">Add to workspace</button></div>
    </div>`).join('');
}

function renderSummary(state, els, activeSources) {
  const errors = state.validation?.issues?.filter(issue => issue.level === 'error').length || 0;
  const warnings = state.validation?.issues?.filter(issue => issue.level === 'warning').length || 0;
  const validationText = `${errors}E / ${warnings}W`;
  const currentStep = state.solved?.timeline?.[state.selectedTimestep];
  const cards = [
    ['Mode', state.mode, ''],
    ['Sources', activeSources().length, ''],
    ['Timesteps', state.solved?.timeline?.length || 0, ''],
    ['Participants', state.solved?.participants?.length || Object.keys(state.solved?.timeline?.[0]?.participants || {}).length || 0, ''],
    ['Selected', currentStep?.timestep_label || '—', ''],
    ['Validation', validationText, 'validation'],
  ];
  els.summaryGrid.innerHTML = cards.map(([label, value, kind]) => `
    <div class="summary-card">
      <div class="label">${escapeHtml(label)}</div>
      <div class="value">${escapeHtml(value)}</div>
      ${kind ? `<div class="summary-chip-row">${renderChip(label, value, kind)}</div>` : ''}
    </div>`).join('');

  els.workspaceTitle.textContent = state.assembled?.system_name || 'No workspace loaded';
  els.workspaceSubtitle.innerHTML = state.assembled
    ? escapeHtml(`${activeSources().length} source(s) assembled in ${state.mode} mode`)
    : 'Add one or more case sources to begin.';

  const { participant } = selectedContext(state);
  if (participant) {
    els.workspaceSubtitle.innerHTML += `<br />${participantChipRow(participant)}`;
  }
}

function renderWorkspaceSources(state, els) {
  els.sourceCount.textContent = String(state.sources.length);
  if (!state.sources.length) {
    els.workspaceSources.innerHTML = '<div class="empty">No sources loaded.</div>';
    return;
  }
  els.workspaceSources.innerHTML = state.sources.map(source => {
    const metrics = sourceMetrics(source);
    return `
      <div class="source-item ${source.enabled ? 'active' : ''}">
        <div class="item-head">
          <div class="title">${escapeHtml(source.title)}</div>
          <div class="chip-row compact">
            ${renderChip('Order', source.order)}
            ${renderChip('Origin', source.origin)}
            ${source.enabled ? renderChip('State', 'enabled', 'theta') : renderChip('State', 'disabled')}
          </div>
        </div>
        <div class="source-meta">${source.filename ? escapeHtml(source.filename) : 'Inline source'}</div>
        <div class="chip-row compact">
          ${renderChip('Steps', metrics.timesteps)}
          ${renderChip('Parts', metrics.participants)}
          ${renderChip('Events', metrics.events)}
          ${source.theme ? renderChip('Theme', source.theme) : renderChip('Theme', '—')}
        </div>
        <div class="source-controls">
          <input type="number" min="1" value="${source.order}" data-order="${source.id}" />
          <input type="text" value="${escapeHtml(source.theme)}" placeholder="Theme" data-theme="${source.id}" />
          <button data-toggle="${source.id}">${source.enabled ? 'On' : 'Off'}</button>
          <button data-remove="${source.id}">Remove</button>
        </div>
      </div>`;
  }).join('');
}

function renderTimelineList(state, els) {
  const timeline = state.solved?.timeline || [];
  els.timestepCount.textContent = String(timeline.length);
  if (!timeline.length) {
    els.timelineList.innerHTML = '<div class="empty">No solved timeline yet.</div>';
    return;
  }
  els.timelineList.innerHTML = timeline.map((step, index) => {
    const sourceRefs = step.source_refs || [];
    return `
      <button class="timeline-item ${index === state.selectedTimestep ? 'active' : ''}" data-step="${index}">
        <div class="item-head">
          <div class="title">${escapeHtml(step.timestep_label || `T${index}`)}</div>
          <div class="chip-row compact">
            ${renderChip('Step', index + 1)}
            ${renderChip('Refs', sourceRefs.length)}
          </div>
        </div>
        <div class="timeline-meta">${Object.keys(step.participants || {}).length} participants · ${sourceRefs.slice(0, 2).map(escapeHtml).join(' · ') || 'No provenance labels'}</div>
      </button>`;
  }).join('');
}

function renderParticipantList(state, els) {
  const step = state.solved?.timeline?.[state.selectedTimestep];
  const participants = Object.entries(step?.participants || {});
  els.participantCount.textContent = String(participants.length);
  if (!participants.length) {
    els.participantList.innerHTML = '<div class="empty">No participants at this timestep.</div>';
    return;
  }
  els.participantList.innerHTML = participants.map(([participantId, participant]) => `
    <button class="participant-item ${participantId === state.selectedParticipantId ? 'active' : ''}" data-participant="${participantId}">
      <div class="item-head">
        <div class="title">${escapeHtml(participant.name || participantId)}</div>
        <div class="chip-row compact">
          ${renderChip('Cfg Σ', participant.axes?.Cfg?.sigma || '—', 'sigma')}
          ${renderChip('Prev', participant.prevalence?.family || '—')}
        </div>
      </div>
      ${participantChipRow(participant)}
    </button>`).join('');
}

function buildOverview(state, activeSources) {
  const { step, participant } = selectedContext(state);
  const manifest = workspaceManifest(state, activeSources);
  const activeSourceCards = activeSources().map(source => {
    const metrics = sourceMetrics(source);
    return `
      <div class="manifest-card">
        <div class="title">${escapeHtml(source.title)}</div>
        <div class="chip-row compact">
          ${renderChip('Order', source.order)}
          ${renderChip('Origin', source.origin)}
          ${source.theme ? renderChip('Theme', source.theme) : ''}
        </div>
        <div class="manifest-meta">${metrics.timesteps} steps · ${metrics.participants} participants · ${metrics.events} events</div>
      </div>`;
  }).join('') || '<div class="empty">No active sources.</div>';

  return `<div class="tab-pane">
    <div class="focus-banner">
      <div class="focus-title">${escapeHtml(step?.timestep_label || 'No timestep selected')}</div>
      <div class="focus-subtitle">${escapeHtml(participant?.name || state.selectedParticipantId || 'No participant selected')}</div>
      ${participantChipRow(participant)}
    </div>
    <div class="overview-grid">
      <div>
        <div class="section-title">Workspace manifest</div>
        <pre>${escapeHtml(JSON.stringify(manifest, null, 2))}</pre>
      </div>
      <div>
        <div class="section-title">Active source deck</div>
        <div class="manifest-grid">${activeSourceCards}</div>
      </div>
    </div>
  </div>`;
}

function buildPayload(state) {
  const stepIndex = state.selectedTimestep;
  const events = (state.solved?.payload_events || []).filter(event => (event.timestep_idx || 0) === stepIndex);
  if (!events.length) {
    return '<div class="tab-pane"><div class="empty">No payload events at this timestep.</div></div>';
  }
  const rows = events.flatMap((event, eventIndex) => (event.payload_bundle || [event]).map((primitive, primitiveIndex) => `
    <tr>
      <td>${eventIndex + 1}.${primitiveIndex + 1}</td>
      <td>${escapeHtml(event.alpha_source || '—')}</td>
      <td>${escapeHtml(event.alpha_medium || '—')}</td>
      <td>${escapeHtml(event.alpha_receiving || '—')}</td>
      <td>${escapeHtml(primitive.axis || primitive.d || '—')}</td>
      <td>${escapeHtml(primitive.sigma || '—')}</td>
      <td>${escapeHtml(primitive.unfolding || '—')}</td>
      <td>${escapeHtml(primitive.register || '—')}</td>
      <td>${escapeHtml(primitive.mode || primitive.mu || '—')}</td>
      <td>${escapeHtml(primitive.magnitude ?? '—')}</td>
    </tr>`)).join('');

  return `<div class="tab-pane">
    <div class="focus-banner compact">
      <div class="focus-title">Payload at ${escapeHtml(state.solved?.timeline?.[stepIndex]?.timestep_label || `T${stepIndex}`)}</div>
      <div class="focus-subtitle">${events.length} event(s)</div>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>#</th><th>Source</th><th>Medium</th><th>Receiving</th><th>Axis</th><th>σ</th><th>Unfolding</th><th>Register</th><th>μ</th><th>Magnitude</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  </div>`;
}

function buildDerived(state) {
  const { participant } = selectedContext(state);
  if (!participant) {
    return '<div class="tab-pane"><div class="empty">Select a participant to inspect derived layers.</div></div>';
  }
  const axisCards = Object.entries(participant.axes || {}).map(([axis, axisState]) => `
    <div class="axis-card">
      <div class="label">${escapeHtml(axis)}</div>
      <div class="chip-row compact">
        ${renderChip('σ', axisState.sigma || '—', 'sigma')}
        ${renderChip('A', axisState.A ?? '—')}
        ${renderChip('R', axisState.R ?? '—')}
        ${renderChip('I', axisState.I ?? '—')}
      </div>
    </div>`).join('');

  const layers = [
    ['Prevalence', participant.prevalence?.family || '—', participant.prevalence?.note || '', ''],
    ['Theta', participant.theta?.active ? 'active' : 'inactive', participant.theta?.note || '', 'theta'],
    ['Compensation', participant.compensation?.type || '—', participant.compensation?.note || '', 'compensation'],
    ['Envelope', participant.envelope ? `${Math.round((participant.envelope.floor || 0) * 100)}` : '—', participant.envelope?.note || '', ''],
    ['Cascade', participant.cascade?.active ? 'active' : 'inactive', participant.cascade?.note || '', 'cascade'],
    ['Cfg gate', formatNumber(participant.solver_debug?.cfg_gate), 'solver debug', ''],
  ].map(([label, value, note, kind]) => `
    <div class="layer-card">
      <div class="label">${escapeHtml(label)}</div>
      <div class="chip-row">${renderChip(label, value, kind)}</div>
      <div class="muted">${escapeHtml(note || '')}</div>
    </div>`).join('');

  return `<div class="tab-pane">
    <div class="focus-banner compact">
      <div class="focus-title">Derived state</div>
      <div class="focus-subtitle">${escapeHtml(participant.name || state.selectedParticipantId || 'Participant')}</div>
      ${participantChipRow(participant)}
    </div>
    <div class="derived-grid">
      <div><div class="section-title">Axes</div><div class="axis-grid">${axisCards}</div></div>
      <div><div class="section-title">Derived layers</div><div class="layer-grid">${layers}</div></div>
    </div>
  </div>`;
}

function buildDashboard(state) {
  const links = state.chunks.map((chunk, index) => {
    const encoded = btoa(encodeURIComponent(JSON.stringify(chunk)));
    const href = `https://cmdr-kegaira-ohaya.github.io/gfe-engine-exp/?case=${encoded}`;
    return `<a href="${href}" target="_blank" rel="noreferrer">Chunk ${index + 1} · ${escapeHtml(chunk.participant || 'participant')}</a>`;
  }).join('');

  return `<div class="tab-pane">
    <div class="focus-banner compact">
      <div class="focus-title">Dashboard export</div>
      <div class="focus-subtitle">${state.chunks.length} chunk(s)</div>
    </div>
    <div class="link-list">${links || '<div class="empty">No dashboard chunks yet.</div>'}</div>
    <pre>${escapeHtml(JSON.stringify(state.chunks, null, 2))}</pre>
  </div>`;
}

function buildValidation(state) {
  const issues = state.validation?.issues || [];
  const errors = issues.filter(issue => issue.level === 'error').length;
  const warnings = issues.filter(issue => issue.level === 'warning').length;

  if (!issues.length) {
    return '<div class="tab-pane"><div class="focus-banner compact"><div class="focus-title">Validation</div><div class="focus-subtitle">No issues</div></div><div class="empty">No validation issues.</div></div>';
  }

  return `<div class="tab-pane">
    <div class="focus-banner compact">
      <div class="focus-title">Validation</div>
      <div class="focus-subtitle">${errors} error(s) · ${warnings} warning(s)</div>
      <div class="chip-row">
        ${renderChip('Errors', errors, errors ? 'compensation' : 'theta')}
        ${renderChip('Warnings', warnings, warnings ? 'theta' : '')}
      </div>
    </div>
    ${issues.map(issue => `
      <div class="issue ${escapeHtml(issue.level)}">
        <strong>${escapeHtml(issue.level.toUpperCase())}</strong> · ${escapeHtml(issue.path || 'root')}<br />
        ${escapeHtml(issue.message)}
      </div>`).join('')}
  </div>`;
}

function buildRaw(state) {
  return `<div class="tab-pane">
    <div class="focus-banner compact">
      <div class="focus-title">Raw + solved snapshot</div>
      <div class="focus-subtitle">Assembled input and current derived output</div>
    </div>
    <pre>${escapeHtml(JSON.stringify({ assembled: state.assembled, solved: state.solved }, null, 2))}</pre>
  </div>`;
}

function renderTab(state, els, activeSources) {
  const builders = {
    overview: () => buildOverview(state, activeSources),
    payload: () => buildPayload(state),
    derived: () => buildDerived(state),
    dashboard: () => buildDashboard(state),
    validation: () => buildValidation(state),
    raw: () => buildRaw(state),
  };
  els.tabContent.innerHTML = builders[state.panel]();
}

export function renderAll({ state, els, activeSources }) {
  renderSummary(state, els, activeSources);
  renderRepoCases(state, els);
  renderWorkspaceSources(state, els);
  renderTimelineList(state, els);
  renderParticipantList(state, els);
  renderTab(state, els, activeSources);
}
