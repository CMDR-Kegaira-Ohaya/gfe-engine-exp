
import { validateCase, solveCase, buildDashboardChunks } from '../solver/index.js';
import { renderAll } from './render.js';
import { applyPolish } from './polish.js';

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
    render();
  } catch (error) {
    els.repoCases.innerHTML = `<div class="empty">Could not load cases/index.json: ${error.message}</div>`;
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

function ensureSelections() {
  if (!state.solved) {
    state.selectedParticipantId = null;
    state.selectedTimestep = 0;
    return;
  }
  const timelineLength = state.solved.timeline?.length || 0;
  if (state.selectedTimestep >= timelineLength) state.selectedTimestep = 0;
  const step = state.solved.timeline?.[state.selectedTimestep] || state.solved.timeline?.[0];
  const participantIds = Object.keys(step?.participants || {});
  if (!participantIds.includes(state.selectedParticipantId)) {
    state.selectedParticipantId = participantIds[0] || null;
  }
}

function recompute() {
  state.assembled = assembleWorkspace();
  if (!state.assembled) {
    state.validation = null;
    state.solved = null;
    state.chunks = [];
    ensureSelections();
    render();
    return;
  }
  state.validation = validateCase(state.assembled);
  state.solved = solveCase(state.assembled);
  state.chunks = buildDashboardChunks(state.solved);
  ensureSelections();
  render();
}

function render() {
  renderAll({ state, els, activeSources });
  applyPolish({ state, els, activeSources, rerender: render });
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
    render();
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
    ensureSelections();
    render();
  });

  els.participantList.addEventListener('click', event => {
    const participantId = event.target.closest('[data-participant]')?.dataset?.participant;
    if (!participantId) return;
    state.selectedParticipantId = participantId;
    render();
  });
}

bindEvents();
loadRepoIndex();
render();
