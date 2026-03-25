import { validateCase, solveCase, groupEventsByStep } from '../solver/index.js';
import { renderAtlas as renderAtlasModule, renderTimeline as renderTimelineModule } from './atlas-renderer.js';

const LENSES = [
  {
    id: 'structure',
    short: 'V',
    label: 'Structure (V)',
    note: 'Shows how encoded state is arranged across the selected moment.',
  },
  {
    id: 'relations',
    short: 'H',
    label: 'Relations (H)',
    note: 'Shows who meets whom and how encounter links are routed here.',
  },
  {
    id: 'expression',
    short: 'R',
    label: 'Expression (R)',
    note: 'Shows state, face, and payload emphasis for the selected moment.',
  },
];

const state = {
  currentMode: 'open',
  actionsOpen: false,
  catalog: [],
  activeTab: 'case',
  activeSlug: null,
  activeStep: 0,
  atlasLens: 'structure',
  participantFocus: null,
  encounterFocus: null,
  caseMarkdown: '',
  encoding: null,
  readingMarkdown: '',
  validation: null,
  solved: null,
  groupedEvents: new Map(),
  notice: 'Canonical catalog is live. Package loading/import is reserved here.',
};

const $ = (id) => document.getElementById(id);
const els = {
  notice: $('notice'),
  actionsToggle: $('actions-toggle'),
  actionsPanel: $('actions-panel'),
  sidePanelTitle: $('side-panel-title'),
  sidePanelIntro: $('side-panel-intro'),
  sidePanelBody: $('side-panel-body'),
  reloadCatalog: $('reload-catalog'),
  currentSlug: $('current-slug'),
  currentTitle: $('current-title'),
  currentSubtitle: $('current-subtitle'),
  sourceBadge: $('source-badge'),
  statusBadge: $('status-badge'),
  validationBadge: $('validation-badge'),
  atlasStatusBadge: $('atlas-status-badge'),
  tabs: $('tabs'),
  tabContent: $('tab-content'),
  timestepBadge: $('timestep-badge'),
  timeline: $('timeline'),
  atlas: $('atlas'),
  clearBtn: $('clear-btn'),
  deleteBtn: $('delete-btn'),
};

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function label(value) {
  return value ? String(value).replaceAll('_', ' ') : 'Unknown';
}

function axisToken(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return 'unknown';
  if (raw === 'cfg') return 'cfg';
  if (raw === 'emb') return 'emb';
  if (raw === 'org') return 'org';
  if (raw === 'dir') return 'dir';
  if (raw === 'leg') return 'leg';
  return raw.replaceAll(/[^a-z0-9_-]/g, '-') || 'unknown';
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function setNotice(message) {
  state.notice = message;
  els.notice.textContent = message;
}

function lensMeta(id = state.atlasLens) {
  return LENSES.find((lens) => lens.id === id) || LENSES[0];
}

function setLens(id) {
  if (LENSES.some((lens) => lens.id === id)) state.atlasLens = id;
}

function getEntry() {
  return state.catalog.find((entry) => entry.slug === state.activeSlug) || null;
}

function getSourceMeta(entry = getEntry()) {
  return entry
    ? { label: 'Source', text: 'Canonical repo case', tone: 'ok' }
    : { label: 'Source', text: 'Source zone unknown', tone: 'neutral' };
}

function getReadingMeta(entry = getEntry()) {
  if (!entry) return { label: 'Reading', text: 'No case', tone: 'neutral' };
  return entry.has_reading
    ? { label: 'Reading', text: 'Reading available', tone: 'ok' }
    : { label: 'Reading', text: 'Reading missing', tone: 'warn' };
}

function getValidationMeta() {
  if (!state.validation) return { label: 'Validation', text: 'Validation unknown', tone: 'neutral' };

  const errors = state.validation.issues.filter((issue) => issue.level === 'error').length;
  const warnings = state.validation.issues.filter((issue) => issue.level === 'warning').length;

  if (errors) return { label: 'Validation', text: `Validation errors: ${errors}`, tone: 'error' };
  if (warnings) return { label: 'Validation', text: `Warnings: ${warnings}`, tone: 'warn' };
  return { label: 'Validation', text: 'Validation clean', tone: 'ok' };
}

function getCaseMeta(entry = getEntry()) {
  return entry
    ? { label: 'Case', text: entry.slug, tone: 'neutral' }
    : { label: 'Case', text: 'No case', tone: 'neutral' };
}

function getTimeline() {
  return state.solved?.timeline || state.encoding?.timeline || [];
}

function getStep(index = state.activeStep) {
  return getTimeline()[index] || null;
}

function getStepEvents(index = state.activeStep) {
  return state.groupedEvents.get(index) || [];
}

function getEncounterEvent(focus = state.encounterFocus) {
  if (!focus) return null;
  return getStepEvents(focus.stepIndex)[focus.encounterIndex] || null;
}

function selectedMomentLabel() {
  const step = getStep();
  return label(step?.timestep_label || `Step ${state.activeStep + 1}`);
}

function touchesParticipant(event, participantId) {
  return [
    event?.sourceParticipantId,
    event?.receivingParticipantId,
    event?.mediumParticipantId,
    event?.alpha_source,
    event?.alpha_receiving,
    event?.alpha_medium,
  ].includes(participantId);
}

function participantEvents(stepIndex, participantId) {
  return getStepEvents(stepIndex).filter((event) => touchesParticipant(event, participantId));
}

function roleCounts(events, participantId) {
  return events.reduce(
    (acc, event) => {
      if ([event.sourceParticipantId, event.alpha_source].includes(participantId)) acc.source += 1;
      if ([event.receivingParticipantId, event.alpha_receiving].includes(participantId)) acc.receiving += 1;
      if ([event.mediumParticipantId, event.alpha_medium].includes(participantId)) acc.medium += 1;
      return acc;
    },
    { source: 0, receiving: 0, medium: 0 },
  );
}

function countPrimitives(events = []) {
  return events.reduce(
    (sum, event) => sum + (Array.isArray(event.payload_bundle) ? event.payload_bundle.length : 0),
    0,
  );
}

function countFaces(events = []) {
  return events.filter((event) => event.face).length;
}

function encounterLabel(event) {
  if (!event) return 'No encounter selected';

  const source = label(event.sourceParticipantId || event.alpha_source || '');
  const receiving = label(event.receivingParticipantId || event.alpha_receiving || '');
  const medium = label(event.mediumParticipantId || event.alpha_medium || '');
  const axis = label(event.axis || 'axis');

  if (event.sourceParticipantId && event.receivingParticipantId) return `${source} → ${receiving} (${axis})`;
  if (event.sourceParticipantId) return `${source} emits on ${axis}`;
  if (event.receivingParticipantId) return `${receiving} receives on ${axis}`;
  if (event.mediumParticipantId) return `${medium} mediates on ${axis}`;
  return `Encounter on ${axis}`;
}

function getTimelineSummary(stepIndex, step) {
  const events = getStepEvents(stepIndex);
  const participants = Object.keys(step.participants || {});
  const primitiveCount = countPrimitives(events);
  const faceCount = countFaces(events);
  const lens = lensMeta();
  const isActive = stepIndex === state.activeStep;

  if (isActive && state.encounterFocus) {
    const event = getEncounterEvent();
    if (event) {
      if (lens.id === 'relations') {
        return {
          kicker: `${lens.short} focus`,
          text: `${encounterLabel(event)} · route in focus`,
        };
      }
      if (lens.id === 'expression') {
        return {
          kicker: `${lens.short} focus`,
          text: `${encounterLabel(event)} · ${pluralize(Array.isArray(event.payload_bundle) ? event.payload_bundle.length : 0, 'primitive')}${event.face ? ` · face ${label(event.face)}` : ''}`,
        };
      }
      return {
        kicker: `${lens.short} focus`,
        text: `${encounterLabel(event)} · ${label(event.axis || 'axis')} axis`,
      };
    }
  }

  if (isActive && state.participantFocus) {
    const participantId = state.participantFocus;
    const linkedEvents = participantEvents(stepIndex, participantId);
    const roles = roleCounts(linkedEvents, participantId);
    const axisCount = Object.keys(step.participants?.[participantId]?.axes || {}).length;

    if (lens.id === 'relations') {
      return {
        kicker: `${lens.short} focus`,
        text: `${label(participantId)} · ${pluralize(linkedEvents.length, 'linked encounter')} · S${roles.source}/R${roles.receiving}/M${roles.medium}`,
      };
    }

    if (lens.id === 'expression') {
      return {
        kicker: `${lens.short} focus`,
        text: `${label(participantId)} · ${pluralize(linkedEvents.length, 'linked expression')} · ${pluralize(countFaces(linkedEvents), 'face')}`,
      };
    }

    return {
      kicker: `${lens.short} focus`,
      text: `${label(participantId)} · ${pluralize(linkedEvents.length, 'linked action')} · ${pluralize(axisCount, 'axis')}`,
    };
  }

  if (lens.id === 'relations') {
    return {
      kicker: 'H routes',
      text: `${pluralize(events.length, 'route')} across ${pluralize(participants.length, 'actor')}`,
    };
  }

  if (lens.id === 'expression') {
    return {
      kicker: 'R signal',
      text: `${pluralize(faceCount, 'face')} · ${pluralize(primitiveCount, 'primitive')}`,
    };
  }

  return {
    kicker: 'V map',
    text: `${pluralize(participants.length, 'actor')} mapped · ${pluralize(events.length, 'linked action')}`,
  };
}

function focusSummary() {
  if (state.participantFocus) {
    return {
      kind: 'participant',
      title: label(state.participantFocus),
      note: 'Timeline and persistent-left atlas are centered on one participant inside the selected moment.',
    };
  }

  if (state.encounterFocus) {
    return {
      kind: 'encounter',
      title: encounterLabel(getEncounterEvent()),
      note: 'Timeline and persistent-left atlas are centered on one encoded encounter inside the selected moment.',
    };
  }

  return {
    kind: 'overview',
    title: selectedMomentLabel(),
    note: 'Step overview is active across the timeline and the persistent-left atlas.',
  };
}

function clearFocus() {
  state.participantFocus = null;
  state.encounterFocus = null;
}

function resetLoadedState() {
  state.activeSlug = null;
  state.activeStep = 0;
  state.activeTab = 'case';
  clearFocus();
  state.caseMarkdown = '';
  state.encoding = null;
  state.readingMarkdown = '';
  state.validation = null;
  state.solved = null;
  state.groupedEvents = new Map();
}

function setActiveStep(stepIndex) {
  state.activeStep = Number.isInteger(stepIndex) ? stepIndex : 0;
  clearFocus();
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Request failed for ${path} (${response.status})`);
  return response.json();
}

async function fetchText(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Request failed for ${path} (${response.status})`);
  return response.text();
}

function renderMarkdown(markdown) {
  if (!markdown.trim()) return '<div class="empty">Nothing to show yet.</div>';

  const lines = markdown.split(/\r?\n/);
  const html = [];
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${esc(paragraph.join(' '))}</p>`);
    paragraph = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      continue;
    }

    if (line.startsWith('### ')) {
      flushParagraph();
      html.push(`<h3>${esc(line.slice(4))}</h3>`);
      continue;
    }

    if (line.startsWith('## ')) {
      flushParagraph();
      html.push(`<h2>${esc(line.slice(3))}</h2>`);
      continue;
    }

    if (line.startsWith('- ')) {
      flushParagraph();
      html.push(`<p>• ${esc(line.slice(2))}</p>`);
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  return html.join('');
}

async function loadCatalog() {
  setNotice('Loading canonical catalog…');

  try {
    const catalogData = await fetchJson('./catalog/index.json');
    state.catalog = Array.isArray(catalogData.cases) ? catalogData.cases : [];

    if (!state.activeSlug && state.catalog.length) state.activeSlug = state.catalog[0].slug;

    renderAll();

    if (state.activeSlug) {
      await loadCase(state.activeSlug, { resetTab: true });
    } else {
      setNotice('No canonical cases are available yet.');
    }
  } catch (error) {
    els.sidePanelBody.innerHTML = `<div class="empty">${esc(error.message)}</div>`;
    setNotice('Could not load the canonical catalog.');
  }
}

async function loadCase(slug, { resetTab = true } = {}) {
  state.activeSlug = slug;
  state.activeStep = 0;
  clearFocus();
  if (resetTab) state.activeTab = 'case';

  const entry = getEntry();
  if (!entry) {
    renderAll();
    return;
  }

  setNotice(`Loading “${entry.title}”…`);
  renderAll();

  try {
    const [caseMarkdown, encoding, readingMarkdown] = await Promise.all([
      entry.paths.case ? fetchText(`.${entry.paths.case}`) : Promise.resolve(''),
      entry.paths.encoding ? fetchJson(`.${entry.paths.encoding}`) : Promise.resolve(null),
      entry.paths.reading ? fetchText(`.${entry.paths.reading}`) : Promise.resolve(''),
    ]);

    state.caseMarkdown = caseMarkdown;
    state.encoding = encoding;
    state.readingMarkdown = readingMarkdown;
    state.validation = encoding ? validateCase(encoding) : null;
    state.solved = encoding ? solveCase(encoding) : null;
    state.groupedEvents = groupEventsByStep((encoding && encoding.payload_events) || []);

    renderAll();
    setNotice(`“${entry.title}” loaded.`);
  } catch (error) {
    state.caseMarkdown = '';
    state.encoding = null;
    state.readingMarkdown = '';
    state.validation = null;
    state.solved = null;
    state.groupedEvents = new Map();

    renderAll();
    setNotice(`Could not load “${entry.title}”: ${error.message}`);
  }
}

function setMode(mode) {
  state.currentMode = mode;
  state.actionsOpen = false;

  if (mode === 'reading') {
    setNotice('Use GPT to generate reading.');
    renderAll();
    return;
  }

  if (mode === 'package') {
    setNotice('Case package support is not fully wired yet.');
    renderAll();
    return;
  }

  setNotice('Browse canonical cases from the live catalog.');
  renderAll();
}

function renderCatalogList() {
  if (!state.catalog.length) return '<div class="empty">No canonical cases in the catalog yet.</div>';

  return state.catalog.map((entry) => {
    const active = entry.slug === state.activeSlug ? ' active' : '';
    return `<button class="catalog-item${active}" data-slug="${esc(entry.slug)}">
      <div class="catalog-title">${esc(entry.title)}</div>
      <div class="catalog-meta">${entry.timesteps} steps · ${entry.participants} participants</div>
      <div class="catalog-synopsis">${esc(entry.synopsis || 'No preview yet.')}</div>
    </button>`;
  }).join('');
}

function renderPackagePlaceholder() {
  return `<section class="placeholder-card">
    <h3>Case package support</h3>
    <p>Case package support is not fully wired yet.</p>
    <p>This surface is reserved for package loading and import.</p>
    <div class="placeholder-actions">
      <button class="ghost" data-package-action="repo">Load from repo</button>
      <button class="ghost" data-package-action="import">Import files</button>
    </div>
    <p class="placeholder-note">Load/import entry is reserved here. Full package workflow is not wired yet.</p>
    <p class="placeholder-note">Save, delete, promote, and package authoring stay GPT-side for now.</p>
    <p class="placeholder-note">Use GPT for package save, delete, and promotion operations.</p>
  </section>`;
}

function renderReadingPlaceholder() {
  return `<section class="placeholder-card">
    <h3>Generate reading</h3>
    <p>Case reading generation stays GPT-side for now.</p>
    <p>Open a case, inspect the encoding, then use GPT to generate and save a case reading when needed.</p>
    <div class="placeholder-actions">
      <button class="ghost" data-reading-action="cue">Use GPT to generate reading</button>
    </div>
  </section>`;
}

function renderSidePanel() {
  if (state.currentMode === 'open') {
    els.sidePanelTitle.textContent = 'Open case';
    els.sidePanelIntro.textContent = 'Browse canonical cases from the live catalog.';
    els.reloadCatalog.classList.remove('hidden');
    els.sidePanelBody.className = 'panel-body';
    els.sidePanelBody.innerHTML = renderCatalogList();
    return;
  }

  if (state.currentMode === 'package') {
    els.sidePanelTitle.textContent = 'Open case package';
    els.sidePanelIntro.textContent = 'Load/import entry is reserved here. Full package workflow is not wired yet.';
    els.reloadCatalog.classList.add('hidden');
    els.sidePanelBody.className = 'panel-body';
    els.sidePanelBody.innerHTML = renderPackagePlaceholder();
    return;
  }

  els.sidePanelTitle.textContent = 'Generate reading';
  els.sidePanelIntro.textContent = 'Generation, save, delete, and promotion stay GPT-side.';
  els.reloadCatalog.classList.add('hidden');
  els.sidePanelBody.className = 'panel-body';
  els.sidePanelBody.innerHTML = renderReadingPlaceholder();
}

function renderHeader() {
  const entry = getEntry();
  const sourceMeta = getSourceMeta(entry);
  const readingMeta = getReadingMeta(entry);
  const validationMeta = getValidationMeta();

  if (!entry) {
    els.currentSlug.textContent = 'No case open';
    els.currentTitle.textContent = 'Open a case to begin';
    els.currentSubtitle.textContent = 'Case, case encoding, and reading will appear here.';
    els.sourceBadge.textContent = sourceMeta.text;
    els.statusBadge.textContent = readingMeta.text;
    els.validationBadge.textContent = validationMeta.text;
    return;
  }

  const step = getStep();
  els.currentSlug.textContent = entry.slug;
  els.currentTitle.textContent = entry.title;
  els.currentSubtitle.textContent = step?.timestep_label
    ? `Selected moment: ${label(step.timestep_label)}`
    : entry.has_reading
      ? 'Case, case encoding, and saved reading are available.'
      : 'Case and case encoding are available. No saved reading yet.';
  els.sourceBadge.textContent = sourceMeta.text;
  els.statusBadge.textContent = readingMeta.text;
  els.validationBadge.textContent = validationMeta.text;
}

function renderEncodingSummary() {
  if (!state.encoding) return '<div class="empty">No case encoding loaded.</div>';

  const participantCount = Array.isArray(state.encoding.participants) ? state.encoding.participants.length : 0;
  const timestepCount = Array.isArray(state.encoding.timeline) ? state.encoding.timeline.length : 0;
  const payloadCount = Array.isArray(state.encoding.payload_events) ? state.encoding.payload_events.length : 0;

  return `<section class="encoding-summary">
    <h3>Summary</h3>
    <dl class="summary-list">
      <div><dt>Case id</dt><dd>${esc(state.encoding.case_id || '—')}</dd></div>
      <div><dt>System name</dt><dd>${esc(state.encoding.system_name || '—')}</dd></div>
      <div><dt>Participants</dt><dd>${participantCount}</dd></div>
      <div><dt>Timesteps</dt><dd>${timestepCount}</dd></div>
      <div><dt>Payload events</dt><dd>${payloadCount}</dd></div>
    </dl>
    <details>
      <summary>Raw data</summary>
      <pre class="pre-json">${esc(JSON.stringify(state.encoding, null, 2))}</pre>
    </details>
  </section>`;
}

function renderContextBanner() {
  const entry = getEntry();
  const step = getStep();
  if (!entry || !step) return '';

  const parts = [`Selected moment: ${selectedMomentLabel()}`];
  if (state.participantFocus) parts.push(`Participant focus: ${label(state.participantFocus)}`);
  else if (state.encounterFocus) parts.push(`Encounter focus: ${encounterLabel(getEncounterEvent())}`);
  else parts.push('Step overview is active.');
  parts.push(`Atlas lens: ${lensMeta().label}`);

  return `<section class="context-banner">
    <div class="context-kicker">Reader context</div>
    <div class="context-copy">${esc(parts.join(' · '))}</div>
  </section>`;
}

function renderTabContent() {
  if (!state.activeSlug) {
    els.tabContent.innerHTML = '<div class="empty">Open a case to show the v3 reader.</div>';
    return;
  }

  const banner = renderContextBanner();

  if (state.activeTab === 'case') {
    els.tabContent.innerHTML = `${banner}<div class="reading-surface">${renderMarkdown(state.caseMarkdown)}</div>`;
    return;
  }

  if (state.activeTab === 'encoding') {
    els.tabContent.innerHTML = `${banner}${renderEncodingSummary()}`;
    return;
  }

  els.tabContent.innerHTML = state.readingMarkdown.trim()
    ? `${banner}<div class="reading-surface">${renderMarkdown(state.readingMarkdown)}</div>`
    : `${banner}<section class="placeholder-card"><h3>No case reading saved yet</h3><p>The canonical case and case encoding are available, but no saved case reading is attached yet.</p><p class="placeholder-note">Use GPT to generate reading.</p></section>`;
}

function atlasRendererContext() {
  return {
    state,
    els,
    esc,
    label,
    axisToken,
    pluralize,
    lensMeta,
    getEntry,
    getSourceMeta,
    getReadingMeta,
    getValidationMeta,
    getCaseMeta,
    getTimeline,
    getStep,
    getStepEvents,
    getEncounterEvent,
    selectedMomentLabel,
    touchesParticipant,
    participantEvents,
    roleCounts,
    countPrimitives,
    countFaces,
    encounterLabel,
    getTimelineSummary,
    focusSummary,
    setActiveStep,
  };
}

function renderTimeline() {
  return renderTimelineModule(atlasRendererContext());
}

function renderAtlas() {
  return renderAtlasModule(atlasRendererContext());
}

function renderActionsPanel() {
  els.actionsToggle.setAttribute('aria-expanded', String(state.actionsOpen));
  els.actionsPanel.classList.toggle('hidden', !state.actionsOpen);

  document.querySelectorAll('[data-action-mode]').forEach((button) => {
    button.classList.toggle('active', button.dataset.actionMode === state.currentMode);
  });
}

function renderAll() {
  document.querySelectorAll('.tab-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === state.activeTab);
  });

  renderActionsPanel();
  renderSidePanel();
  renderHeader();
  renderAtlas();
  renderTabContent();
  renderTimeline();
}

function handlePackageAction(action) {
  if (action === 'repo') {
    setNotice('Case package loading from repo is reserved here. Full package workflow is not wired yet.');
    return;
  }

  if (action === 'import') {
    setNotice('Case package import is reserved here. Full package workflow is not wired yet.');
  }
}

function handleReadingAction() {
  setNotice('Use GPT to generate reading.');
}

function handleClear() {
  if (!confirm('Are you sure?')) return;
  resetLoadedState();
  renderAll();
  setNotice('Current loaded items cleared.');
}

function handleDelete() {
  if (!confirm('Are you sure?')) return;
  setNotice('Delete confirmed, but repo-write delete is not wired inside v3 yet.');
}

function bindEvents() {
  els.actionsToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    state.actionsOpen = !state.actionsOpen;
    renderActionsPanel();
  });

  document.addEventListener('click', (event) => {
    const insidePanel = els.actionsPanel.contains(event.target);
    const isToggle = els.actionsToggle.contains(event.target);
    if (insidePanel || isToggle || !state.actionsOpen) return;
    state.actionsOpen = false;
    renderActionsPanel();
  });

  els.actionsPanel.addEventListener('click', (event) => {
    const modeButton = event.target.closest('[data-action-mode]');
    if (!modeButton) return;
    setMode(modeButton.dataset.actionMode);
  });

  els.reloadCatalog.addEventListener('click', loadCatalog);

  els.sidePanelBody.addEventListener('click', (event) => {
    const caseButton = event.target.closest('[data-slug]');
    if (caseButton) {
      loadCase(caseButton.dataset.slug, { resetTab: true });
      return;
    }

    const packageButton = event.target.closest('[data-package-action]');
    if (packageButton) {
      handlePackageAction(packageButton.dataset.packageAction);
      return;
    }

    const readingButton = event.target.closest('[data-reading-action]');
    if (readingButton) handleReadingAction();
  });

  els.tabs.addEventListener('click', (event) => {
    const button = event.target.closest('[data-tab]');
    if (!button) return;
    state.activeTab = button.dataset.tab;
    renderAll();
  });

  els.timeline.addEventListener('click', (event) => {
    const clearButton = event.target.closest('[data-clear-focus]');
    if (clearButton) {
      clearFocus();
      renderAll();
      return;
    }

    const participantButton = event.target.closest('[data-participant-focus]');
    if (participantButton) {
      state.participantFocus = participantButton.dataset.participantFocus;
      state.encounterFocus = null;
      renderAll();
      return;
    }

    const encounterButton = event.target.closest('[data-encounter-focus]');
    if (encounterButton) {
      const stepIndex = Number(encounterButton.dataset.stepIndex) || 0;
      const encounterIndex = Number(encounterButton.dataset.encounterFocus) || 0;
      state.activeStep = stepIndex;
      state.participantFocus = null;
      state.encounterFocus = { stepIndex, encounterIndex };
      renderAll();
      return;
    }

    const stepButton = event.target.closest('[data-step-select]');
    if (!stepButton) return;
    const nextStep = Number(stepButton.dataset.stepSelect) || 0;
    if (nextStep !== state.activeStep) setActiveStep(nextStep);
    renderAll();
  });

  els.atlas.addEventListener('click', (event) => {
    const lensButton = event.target.closest('[data-atlas-lens]');
    if (lensButton) {
      setLens(lensButton.dataset.atlasLens);
      renderAtlas();
      renderTabContent();
      renderTimeline();
      return;
    }

    const clearButton = event.target.closest('[data-clear-focus]');
    if (!clearButton) return;
    clearFocus();
    renderAll();
  });

  els.clearBtn.addEventListener('click', handleClear);
  els.deleteBtn.addEventListener('click', handleDelete);
}

bindEvents();
loadCatalog();
