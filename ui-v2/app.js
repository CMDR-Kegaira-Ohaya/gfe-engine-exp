import { validateCase, solveCase, buildDashboardChunks } from '../solver/index.js';

const state = {
  mode: 'single',
  panel: 'overview',
  themeFilter: '',
  repoCases: [],
  sources: [],
  assembled: null,
  validation: null,
  solved: null,
  chunks: [],
  selectedParticipantId: null,
  selectedTimestep: 0,
};

const $ = id => document.getElementById(id);
const els = {
  modeGrid: $('mode-grid'),
  themeFilter: $('theme-filter'),
  pasteArea: $('paste-area'),
  fileInput: $('file-input'),
  loadPaste: $('load-paste'),
  clearWorkspace: $('clear-workspace'),
  reloadIndex: $('reload-index'),
  repoCases: $('repo-cases'),
  workspaceSources: $('workspace-sources'),
  timelineList: $('timeline-list'),
  participantList: $('participant-list'),
  sourceCount: $('source-count'),
  timestepCount: $('timestep-count'),
  participantCount: $('participant-count'),
  summaryGrid: $('summary-grid'),
  workspaceTitle: $('workspace-title'),
  workspaceSubtitle: $('workspace-subtitle'),
  tabContent: $('tab-content'),
  resolveBtn: $('resolve-btn'),
  exportAssembled: $('export-assembled'),
  exportDashboard: $('export-dashboard'),
};

const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const uid = () => Math.random().toString(36).slice(2, 10);

function normalizeSource(raw, meta = {}) {
  return {
    id: meta.id || uid(),
    title: meta.title || raw.system_name || raw.case_id || 'Untitled case',
    origin: meta.origin || 'local',
    filename: meta.filename || '',
    theme: meta.theme || '',
    order: Number.isFinite(meta.order) ? meta.order : state.sources.length + 1,
    enabled: meta.enabled !== false,
    data: raw,
  };
}

function activeSources() {
  let list = state.sources.filter(source => source.enabled);
  if (state.mode === 'themes' && state.themeFilter.trim()) {
    const query = state.themeFilter.trim().toLowerCase();
    list = list.filter(source => (source.theme || '').toLowerCase().includes(query));
  }
  return [...list].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

async function loadRepoIndex() {
  els.repoCases.textContent = 'Loading cases index…';
  try {
    const response = await fetch('./cases/index.json', { cache: 'no-store' });
    const index = await response.json();
    state.repoCases = Array.isArray(index.cases) ? index.cases : [];
    renderRepoCases();
  } catch (error) {
    els.repoCases.innerHTML = `<div class="empty">Could not load cases/index.json: ${escapeHtml(error.message)}</div>`;
  }
}

async function addRepoCase(filename) {
  const response = await fetch(`./cases/${filename}`, { cache: 'no-store' });
  const data = await response.json();
  const record = state.repoCases.find(item => item.filename === filename) || {};
  state.sources.push(normalizeSource(data, {
    origin: 'repo',
    filename,
    title: record.system_name || record.case_id || filename,
    theme: record.theme || '',
  }));
  recompute();
}

function addTimelineSource(assembly, source, mergeByLabel) {
  const stepIndexMap = new Map();
  const timeline = Array.isArray(source.data.timeline) ? source.data.timeline : [];
  timeline.forEach((step, localIndex) => {
    const label = step.timestep_label || `${source.title} · T${localIndex}`;
    let targetIndex = assembly.timeline.length;
    if (mergeByLabel) {
      const existingIndex = assembly.timeline.findIndex(item => item.timestep_label === label);
      if (existingIndex >= 0) targetIndex = existingIndex;
    }
    if (!assembly.timeline[targetIndex]) {
      assembly.timeline[targetIndex] = { timestep_label: label, participants: {}, source_refs: [] };
    }
    for (const [participantId, participantData] of Object.entries(step.participants || {})) {
      assembly.timeline[targetIndex].participants[participantId] = {
        ...(assembly.timeline[targetIndex].participants[participantId] || {}),
        ...clone(participantData),
      };
    }
    assembly.timeline[targetIndex].source_refs.push(source.title);
    stepIndexMap.set(localIndex, targetIndex);
  });

  for (const event of source.data.payload_events || []) {
    const mappedIndex = stepIndexMap.get(event.timestep_idx ?? 0) ?? 0;
    assembly.payload_events.push({ ...clone(event), timestep_idx: mappedIndex, workspace_source: source.title });
  }
}

function assembleWorkspace() {
  const sources = activeSources();
  if (!sources.length) return null;
  if (state.mode === 'single') return clone(sources[0].data);

  const assembly = {
    system_name: `Workspace · ${state.mode}`,
    case_id: `workspace-${state.mode}`,
    participants: [],
    timeline: [],
    payload_events: [],
    analysis: { workspace_mode: state.mode, sources: sources.map(source => source.title) },
  };

  const participantMap = new Map();
  for (const source of sources) {
    for (const participant of source.data.participants || []) {
      if (!participantMap.has(participant.id)) participantMap.set(participant.id, clone(participant));
    }
    addTimelineSource(assembly, source, state.mode === 'parts');
  }
  assembly.participants = Array.from(participantMap.values());
  if (state.mode === 'themes' && state.themeFilter.trim()) {
    assembly.analysis.theme_filter = state.themeFilter.trim();
  }
  return assembly;
}

function recompute() {
  state.assembled = assembleWorkspace();
  if (!state.assembled) {
    state.validation = null;
    state.solved = null;
    state.chunks = [];
    state.selectedParticipantId = null;
    state.selectedTimestep = 0;
    renderAll();
    return;
  }
  state.validation = validateCase(state.assembled);
  state.solved = solveCase(state.assembled);
  state.chunks = buildDashboardChunks(state.solved);
  if (state.selectedTimestep >= (state.solved.timeline?.length || 0)) state.selectedTimestep = 0;
  const step = state.solved.timeline?.[state.selectedTimestep] || state.solved.timeline?.[0];
  const participantIds = Object.keys(step?.participants || {});
  if (!participantIds.includes(state.selectedParticipantId)) state.selectedParticipantId = participantIds[0] || null;
  renderAll();
}

function renderRepoCases() {
  if (!state.repoCases.length) {
    els.repoCases.innerHTML = '<div class="empty">No repo cases found.</div>';
    return;
  }
  els.repoCases.innerHTML = state.repoCases.map(item => `
    <div class="repo-item">
      <div class="title">${escapeHtml(item.system_name || item.case_id || item.filename)}</div>
      <div class="repo-meta">${escapeHtml(item.filename)} · ${item.timesteps || 0} steps · ${item.participants || 0} participants</div>
      <div class="row"><button data-add-repo="${escapeHtml(item.filename)}">Add to workspace</button></div>
    </div>`).join('');
}

function renderSummary() {
  const e = state.validation?.issues?.filter(issue => issue.level === 'error').length || 0;
  const w = state.validation?.issues?.filter(issue => issue.level === 'warning').length || 0;
  const cards = [
    ['Mode', state.mode],
    ['Sources', activeSources().length],
    ['Timesteps', state.solved?.timeline?.length || 0],
    ['Participants', state.solved?.participants?.length || Object.keys(state.solved?.timeline?.[0]?.participants || {}).length || 0],
    ['Payload events', state.solved?.payload_events?.length || 0],
    ['Validation', `${e}E / ${w}W`],
  ];
  els.summaryGrid.innerHTML = cards.map(([label, value]) => `
    <div class="summary-card"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value)}</div></div>`).join('');
  els.workspaceTitle.textContent = state.assembled?.system_name || 'No workspace loaded';
  els.workspaceSubtitle.textContent = state.assembled
    ? `${activeSources().length} source(s) assembled in ${state.mode} mode`
    : 'Add one or more case sources to begin.';
}

function renderWorkspaceSources() {
  els.sourceCount.textContent = String(state.sources.length);
  if (!state.sources.length) {
    els.workspaceSources.innerHTML = '<div class="empty">No sources loaded.</div>';
    return;
  }
  els.workspaceSources.innerHTML = state.sources.map(source => `
    <div class="source-item ${source.enabled ? 'active' : ''}">
      <div class="title">${escapeHtml(source.title)}</div>
      <div class="source-meta">${escapeHtml(source.origin)}${source.filename ? ` · ${escapeHtml(source.filename)}` : ''}</div>
      <div class="source-controls">
        <input type="number" min="1" value="${source.order}" data-order="${source.id}" />
        <input type="text" value="${escapeHtml(source.theme)}" placeholder="Theme" data-theme="${source.id}" />
        <button data-toggle="${source.id}">${source.enabled ? 'On' : 'Off'}</button>
        <button data-remove="${source.id}">Remove</button>
      </div>
    </div>`).join('');
}

function renderTimelineList() {
  const timeline = state.solved?.timeline || [];
  els.timestepCount.textContent = String(timeline.length);
  if (!timeline.length) {
    els.timelineList.innerHTML = '<div class="empty">No solved timeline yet.</div>';
    return;
  }
  els.timelineList.innerHTML = timeline.map((step, index) => `
    <button class="timeline-item ${index === state.selectedTimestep ? 'active' : ''}" data-step="${index}">
      <div class="title">${escapeHtml(step.timestep_label || `T${index}`)}</div>
      <div class="timeline-meta">${Object.keys(step.participants || {}).length} participants · ${(step.source_refs || []).length} source refs</div>
    </button>`).join('');
}

function renderParticipantList() {
  const step = state.solved?.timeline?.[state.selectedTimestep];
  const participants = Object.entries(step?.participants || {});
  els.participantCount.textContent = String(participants.length);
  if (!participants.length) {
    els.participantList.innerHTML = '<div class="empty">No participants at this timestep.</div>';
    return;
  }
  els.participantList.innerHTML = participants.map(([participantId, participant]) => `
    <button class="participant-item ${participantId === state.selectedParticipantId ? 'active' : ''}" data-participant="${participantId}">
      <div class="title">${escapeHtml(participant.name || participantId)}</div>
      <div class="timeline-meta">${escapeHtml(participant.prevalence?.family || '—')} · Θ ${participant.theta?.active ? 'on' : 'off'} · ${escapeHtml(participant.compensation?.type || 'none')}</div>
    </button>`).join('');
}

function selectedContext() {
  const step = state.solved?.timeline?.[state.selectedTimestep] || null;
  const participant = step?.participants?.[state.selectedParticipantId] || null;
  return { step, participant };
}

function buildOverview() {
  const { step, participant } = selectedContext();
  const manifest = {
    mode: state.mode,
    theme_filter: state.themeFilter || '',
    sources: activeSources().map(source => ({ title: source.title, origin: source.origin, order: source.order, theme: source.theme || '' })),
  };
  return `<div class="tab-pane">
    <div class="overview-grid">
      <div class="kv-grid">
        <div class="kv-card"><div class="label">Selected timestep</div><div>${escapeHtml(step?.timestep_label || '—')}</div></div>
        <div class="kv-card"><div class="label">Selected participant</div><div>${escapeHtml(participant?.name || state.selectedParticipantId || '—')}</div></div>
        <div class="kv-card"><div class="label">Prevalence</div><div>${escapeHtml(participant?.prevalence?.family || '—')}</div></div>
        <div class="kv-card"><div class="label">Theta</div><div>${participant?.theta?.active ? 'Active' : 'Inactive'}</div></div>
      </div>
      <div><div class="label muted">Workspace manifest</div><pre>${escapeHtml(JSON.stringify(manifest, null, 2))}</pre></div>
    </div>
  </div>`;
}

function buildPayload() {
  const stepIndex = state.selectedTimestep;
  const events = (state.solved?.payload_events || []).filter(event => (event.timestep_idx || 0) === stepIndex);
  if (!events.length) return '<div class="tab-pane"><div class="empty">No payload events at this timestep.</div></div>';
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
  return `<div class="tab-pane"><div class="table-wrap"><table>
    <thead><tr><th>#</th><th>Source</th><th>Medium</th><th>Receiving</th><th>Axis</th><th>σ</th><th>Unfolding</th><th>Register</th><th>μ</th><th>Magnitude</th></tr></thead>
    <tbody>${rows}</tbody></table></div></div>`;
}

function buildDerived() {
  const { participant } = selectedContext();
  if (!participant) return '<div class="tab-pane"><div class="empty">Select a participant to inspect derived layers.</div></div>';
  const axisCards = Object.entries(participant.axes || {}).map(([axis, axisState]) => `
    <div class="axis-card">
      <div class="label">${escapeHtml(axis)}</div>
      <div class="pill-row">
        <span class="pill">σ ${escapeHtml(axisState.sigma || '—')}</span>
        <span class="pill">A ${escapeHtml(axisState.A ?? '—')}</span>
        <span class="pill">R ${escapeHtml(axisState.R ?? '—')}</span>
        <span class="pill">I ${escapeHtml(axisState.I ?? '—')}</span>
      </div>
    </div>`).join('');
  const layers = [
    ['Prevalence', participant.prevalence?.family || '—', participant.prevalence?.note || ''],
    ['Theta', participant.theta?.active ? 'active' : 'inactive', participant.theta?.note || ''],
    ['Compensation', participant.compensation?.type || '—', participant.compensation?.note || ''],
    ['Envelope', participant.envelope ? `${Math.round((participant.envelope.floor || 0) * 100)}` : '—', participant.envelope?.note || ''],
    ['Cascade', participant.cascade?.active ? 'active' : 'inactive', participant.cascade?.note || ''],
    ['Cfg gate', participant.solver_debug?.cfg_gate ?? '—', 'solver debug'],
  ].map(([label, value, note]) => `
    <div class="layer-card">
      <div class="label">${escapeHtml(label)}</div>
      <div>${escapeHtml(value)}</div>
      <div class="muted">${escapeHtml(note || '')}</div>
    </div>`).join('');
  return `<div class="tab-pane"><div class="derived-grid">
    <div><div class="label muted">Axes</div><div class="axis-grid">${axisCards}</div></div>
    <div><div class="label muted">Derived layers</div><div class="layer-grid">${layers}</div></div>
  </div></div>`;
}

function buildDashboard() {
  const links = state.chunks.map((chunk, index) => {
    const encoded = btoa(encodeURIComponent(JSON.stringify(chunk)));
    const href = `https://cmdr-kegaira-ohaya.github.io/gfe-engine-exp/?case=${encoded}`;
    return `<a href="${href}" target="_blank" rel="noreferrer">Chunk ${index + 1} · ${escapeHtml(chunk.participant || 'participant')}</a>`;
  }).join('');
  return `<div class="tab-pane"><div class="link-list">${links || '<div class="empty">No dashboard chunks yet.</div>'}</div><pre>${escapeHtml(JSON.stringify(state.chunks, null, 2))}</pre></div>`;
}

function buildValidation() {
  const issues = state.validation?.issues || [];
  if (!issues.length) return '<div class="tab-pane"><div class="empty">No validation issues.</div></div>';
  return `<div class="tab-pane">${issues.map(issue => `
    <div class="issue ${escapeHtml(issue.level)}">
      <strong>${escapeHtml(issue.level.toUpperCase())}</strong> · ${escapeHtml(issue.path || 'root')}<br />
      ${escapeHtml(issue.message)}
    </div>`).join('')}</div>`;
}

function buildRaw() {
  return `<div class="tab-pane"><pre>${escapeHtml(JSON.stringify({ assembled: state.assembled, solved: state.solved }, null, 2))}</pre></div>`;
}

function renderTab() {
  const builders = {
    overview: buildOverview,
    payload: buildPayload,
    derived: buildDerived,
    dashboard: buildDashboard,
    validation: buildValidation,
    raw: buildRaw,
  };
  els.tabContent.innerHTML = builders[state.panel]();
}

function renderAll() {
  renderSummary();
  renderWorkspaceSources();
  renderTimelineList();
  renderParticipantList();
  renderTab();
}

function readFiles(files) {
  [...files].forEach(file => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        state.sources.push(normalizeSource(data, { title: file.name, origin: 'file', filename: file.name }));
        recompute();
      } catch (error) {
        alert(`Could not parse ${file.name}: ${error.message}`);
      }
    };
    reader.readAsText(file);
  });
}

function copyJson(value) {
  navigator.clipboard.writeText(JSON.stringify(value, null, 2));
}

function bindEvents() {
  els.modeGrid.addEventListener('click', event => {
    const mode = event.target?.dataset?.mode;
    if (!mode) return;
    state.mode = mode;
    [...els.modeGrid.querySelectorAll('.mode-btn')].forEach(button => {
      button.classList.toggle('active', button.dataset.mode === mode);
    });
    recompute();
  });

  document.querySelector('.tabs').addEventListener('click', event => {
    const tab = event.target?.dataset?.tab;
    if (!tab) return;
    state.panel = tab;
    document.querySelectorAll('.tab-btn').forEach(button => {
      button.classList.toggle('active', button.dataset.tab === tab);
    });
    renderTab();
  });

  els.themeFilter.addEventListener('input', () => {
    state.themeFilter = els.themeFilter.value;
    recompute();
  });

  els.loadPaste.addEventListener('click', () => {
    try {
      const data = JSON.parse(els.pasteArea.value);
      state.sources.push(normalizeSource(data, { origin: 'paste' }));
      els.pasteArea.value = '';
      recompute();
    } catch (error) {
      alert(`Could not parse pasted JSON: ${error.message}`);
    }
  });

  els.fileInput.addEventListener('change', event => readFiles(event.target.files));
  els.clearWorkspace.addEventListener('click', () => {
    state.sources = [];
    recompute();
  });
  els.reloadIndex.addEventListener('click', loadRepoIndex);
  els.resolveBtn.addEventListener('click', recompute);
  els.exportAssembled.addEventListener('click', () => copyJson(state.assembled || {}));
  els.exportDashboard.addEventListener('click', () => copyJson(state.chunks || []));

  els.repoCases.addEventListener('click', event => {
    const filename = event.target?.dataset?.addRepo;
    if (filename) addRepoCase(filename);
  });

  els.workspaceSources.addEventListener('click', event => {
    const toggleId = event.target?.dataset?.toggle;
    if (toggleId) {
      const source = state.sources.find(item => item.id === toggleId);
      if (source) source.enabled = !source.enabled;
      recompute();
      return;
    }
    const removeId = event.target?.dataset?.remove;
    if (removeId) {
      state.sources = state.sources.filter(item => item.id !== removeId);
      recompute();
    }
  });

  els.workspaceSources.addEventListener('input', event => {
    const orderId = event.target?.dataset?.order;
    if (orderId) {
      const source = state.sources.find(item => item.id === orderId);
      if (source) source.order = Number(event.target.value) || source.order;
    }
    const themeId = event.target?.dataset?.theme;
    if (themeId) {
      const source = state.sources.find(item => item.id === themeId);
      if (source) source.theme = event.target.value;
    }
    recompute();
  });

  els.timelineList.addEventListener('click', event => {
    const step = event.target.closest('[data-step]')?.dataset?.step;
    if (step == null) return;
    state.selectedTimestep = Number(step);
    renderTimelineList();
    renderParticipantList();
    renderTab();
  });

  els.participantList.addEventListener('click', event => {
    const participantId = event.target.closest('[data-participant]')?.dataset?.participant;
    if (!participantId) return;
    state.selectedParticipantId = participantId;
    renderParticipantList();
    renderTab();
  });
}

bindEvents();
loadRepoIndex();
renderAll();
