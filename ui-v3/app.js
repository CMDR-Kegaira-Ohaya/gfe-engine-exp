
import { validateCase, solveCase, groupEventsByStep } from '../solver/index.js';

const ATLAS_LENSES = [
  {
    id: 'structure',
    short: 'V',
    label: 'Structure (V)',
    note: 'Where this sits in the selected moment.',
  },
  {
    id: 'relations',
    short: 'H',
    label: 'Relations (H)',
    note: 'Who meets whom and how links are routed here.',
  },
  {
    id: 'expression',
    short: 'R',
    label: 'Expression (R)',
    note: 'What is surfaced here as state, face, and payload.',
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

function setNotice(message) {
  state.notice = message;
  els.notice.textContent = message;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function prettyLabel(value) {
  if (!value) return 'Unknown';
  return String(value).replaceAll('_', ' ');
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getAtlasLensMeta(lens = state.atlasLens) {
  return ATLAS_LENSES.find((item) => item.id === lens) || ATLAS_LENSES[0];
}

function setAtlasLens(lens) {
  if (ATLAS_LENSES.some((item) => item.id === lens)) {
    state.atlasLens = lens;
  }
}

function renderMarkdown(markdown) {
  if (!markdown.trim()) {
    return '<div class="empty">Nothing to show yet.</div>';
  }

  const lines = markdown.split(/\r?\n/);
  const html = [];
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${escapeHtml(paragraph.join(' '))}</p>`);
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
      html.push(`<3h3>${escapeHtml(line.slice(4))}</h3>`);
      continue;
    }

    if (line.startsWith('## ')) {
      flushParagraph();
      html.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
      continue;
    }

    if (line.startsWith('- ')) {
      flushParagraph();
      html.push(`<p>• ${escapeHtml(line.slice(2))}</p>`);
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  return html.join('');
}

function getActiveCaseEntry() {
  return state.catalog.find((entry) => entry.slug === state.activeSlug) || null;
}

function getTimeline() {
  return state.solved?.timeline || state.encoding?.timeline || [];
}

function getStep(stepIndex = state.activeStep) {
  return getTimeline()[stepIndex] || null;
}

function getStepEvents(stepIndex = state.activeStep) {
  return state.groupedEvents.get(stepIndex) || [];
}

function getEncounterEvent(focus = state.encounterFocus) {
  if (!focus) return null;
  const events = getStepEvents(focus.stepIndex);
  return events[focus.encounterIndex] || null;
}

function eventTouchesParticipant(event, participantId) {
  return (
    event?.sourceParticipantId === participantId
    || event?.receivingParticipantId === participantId
    || event?.mediumParticipantId === participantId
    || event?.alpha_source === participantId
    || event?.alpha_receiving === participantId
    || event?.alpha_medium === participantId
  );
}

function getParticipantEvents(stepIndex, participantId) {
  return getStepEvents(stepIndex).filter((event) => eventTouchesParticipant(event, participantId));
}

function getRoleCounts(events, participantId) {
  return events.reduce(
    (acc, event) => {
      if (event.sourceParticipantId === participantId || event.alpha_source === participantId) acc.source += 1;
      if (event.receivingParticipantId === participantId || event.alpha_receiving === participantId) acc.receiving += 1;
      if (event.mediumParticipantId === participantId || event.alpha_medium === participantId) acc.medium += 1;
      return acc;
    },
    { source: 0, receiving: 0, medium: 0 },
  );
}

function buildAxisSignature(axisData = {}) {
  return [`A:${axisData.A ?? '—'}`, `R:${axisData.R ?? '—'}`, `I:${axisData.I ?? '—'}`];
}

function buildExpressionSummary(event) {
  const parts = [];
  if (event?.face) parts.push(`Face ${prettyLabel(event.face)}`);
  if (event?.interference) parts.push(`Interference ${event.interference}`);
  const primitiveCount = Array.isArray(event?.payload_bundle) ? event.payload_bundle.length : 0;
  parts.push(pluralize(primitiveCount, 'primitive'));
  return parts;
}

function clearFocus() {
  state.participantFocus = null;
  state.encounterFocus = null;
}

function resetLoadedState() {
  state.activeSlug = null;
  state.activeStep = 0;
  clearFocus();
  state.caseMarkdown = '';
  state.encoding = null;
  state.readingMarkdown = '';
  state.validation = null;
  state.solved = null;
  state.groupedEvents = new Map();
  state.activeTab = 'case';
}

function setActiveStep(stepIndex) {
  state.activeStep = Number.isInteger(stepIndex) ? stepIndex : 0;
  clearFocus();
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Request failed for ${path} (${response.status})`);
  }
  return response.json();
}

async function fetchText(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Request failed for ${path} (${response.status})`);
  }
  return response.text();
}

async function loadCatalog() {
  setNotice('Loading canonical catalog…');

  try {
    const catalogData = await fetchJson('./catalog/index.json');
    state.catalog = Array.isArray(catalogData.cases) ? catalogData.cases : [];

    if (!state.activeSlug && state.catalog.length) {
      state.activeSlug = state.catalog[0].slug;
    }

    renderAll();

    if (state.activeSlug) {
      await loadCase(state.activeSlug, { resetTab: true });
    } else {
      setNotice('No canonical cases are available yet.');
    }
  } catch (error) {
    els.sidePanelBody.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
    setNotice('Could not load the canonical catalog.');
  }
}

async function loadCase(slug, { resetTab = true } = {}) {
  state.activeSlug = slug;
  state.activeStep = 0;
  clearFocus();

  if (resetTab) {
    state.activeTab = 'case';
  }

  const entry = getActiveCaseEntry();
  if (!entry) {
    renderAll();
    return;
  }

  setNotice(`Loading “${entry.title}”…`);
  renderAll();

  try {
    const [caseMarkdown, encoding, readingMarkdown] = await Promise.all([
      entry.paths.case ? fetchText(.${entry.paths.case}) : Promise.resolve(''),
      entry.paths.encoding ? fetchJson(.${entry.paths.encoding}) : Promise.resolve(null),
      entry.paths.reading ? fetchText(`.${entry.paths.reading}`) : Promise.resolve(''),
    ]);

    const solved = encoding ? solveCase(encoding) : null;

    state.caseMarkdown = caseMarkdown;
    state.encoding = encoding;
    state.readingMarkdown = readingMarkdown;
    state.validation = encoding ? validateCase(encoding) : null;
    state.solved = solved;
    state.groupedEvents = groupEventsByStep((encoding && encoding.payload_events) || []);

    renderAll();
    setNotice(`x“${entry.title}” loaded.`);
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
  if (!state.catalog.length) {
    return '<div class="empty">No canonical cases in the catalog yet.</div>';
  }

  return state.catalog
    .map((entry) => {
      const active = entry.slug === state.activeSlug ? ' active' : '';
      return `<bsutton class="catalog-item${active}" data-slug="${escapeHtml(entry.slug)}">
        <div class="catalog-title">${escapeHtml(entry.title)}</div>
        <div class="catalog-meta">${entry.timesteps} steps · ${entry.participants} participants</div>
        <div class="catalog-synopsis">${escapeHtml(entry.synopsis || 'No preview yet.')}</div>
      </button>`;
    })
    .join('');
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
  const entry = getActiveCaseEntry();

  if (!entry) {
    els.currentSlug.textContent = 'No case open';
    els.currentTitle.textContent = 'Open a case to begin';
    els.currentSubtitle.textContent = 'Case, case encoding, and reading will appear here.';
    els.sourceBadge.textContent = 'Source zone unknown';
    els.statusBadge.textContent = 'No case';
    els.validationBadge.textContent = 'Validation unknown';
    return;
  }

  const step = getStep();
  const stepLabel = step?.timestep_label
    ? `Selected moment: ${prettyLabel(step.timestep_label)}`
    : null;

  els.currentSlug.textContent = entry.slug;
  els.currentTitle.textContent = entry.title;
  els.currentSubtitle.textContent = stepLabel
    ? stepLabel
    : entry.has_reading
      ? 'Case, case encoding, and saved reading are available.'
      : 'Case and case encoding are available. No saved reading yet.';
  els.sourceBadge.textContent = 'Canonical repo case';
  els.statusBadge.textContent = entry.has_reading ? 'Reading available' : 'Reading missing';

  if (!state.validation) {
    els.validationBadge.textContent = 'Validation unknown';
    return;
  }

  const errors = state.validation.issues.filter((issue) => issue.level === 'error').length;
  const warnings = state.validation.issues.filter((issue) => issue.level === 'warning').length;

  els.validationBadge.textContent = errors
    ? `Validation errors: ${errors}`
    : warnings
      ? `Warnings: ${warnings}`
      : 'Validation clean';
}

function renderEncodingSummary() {
  if (!state.encoding) {
    return '<div class="empty">No case encoding loaded.</div>';
  }

  const participantCount = Array.isArray(state.encoding.participants) ? state.encoding.participants.length : 0;
  const timestepCount = Array.isArray(state.encoding.timeline) ? state.encoding.timeline.length : 0;
  const payloadCount = Array.isArray(state.encoding.payload_events) ? state.encoding.payload_events.length : 0;

  return `<section class="encoding-summary">
    <h3>Summary</h3>
    <dl class="summary-list">
      <div><dt>Case id</dt><dd>${escapeHtml(state.encoding.case_id || '—')}</dd></div>
      <div><dt>System name</dt><dd>${escapeHtml(state.encoding.system_name || '—')}</dd></div>
      <div><dt>Participants</dt><dd>${participantCount}</dd></div>
      <div><dt>Timesteps</dt><dd>${timestepCount}</dd></div>
      <div><dt>Payload events</dt><dd>${payloadCount}</dd></div>
    </dl>
    <details>
      <summary>Raw data</summary>
      <pre class="pre-json">${escapeHtml(JSON.stringify(state.encoding, null, 2))}</pre>
    </details>
  </section>`;
}

function renderContextBanner() {
  const entry = getActiveCaseEntry();
  const step = getStep();

  if (!entry || !step) return '';

  const contextLines = [
    `Selected moment: ${prettyLabel(step.timestep_label || `Step ${state.activeStep + 1}`)}`,
  ];

  if (state.participantFocus) {
    contextLines.push(`Participant focus: ${prettyLabel(state.participantFocus)}`);
  } else if (state.encounterFocus) {
    const event = getEncounterEvent();
    contextLines.push(`Encounter focus: ${buildEncounterLabel(event)}`);
  } else {
    contextLines.push('Step overview is active.');
  }

  contextLines.push(`Atlas lens: ${getAtlasLensMeta().label}`);

  return `<section class="context-banner">
    <div class="context-kicker">Reader context</div>
    <div class="context-copy">${escapeHtml(contextLines.join(' · '))}</div>
  </section>`;
}

function renderTabContent() {
  if (!state.activeSlug) {
    els.tabContent.innerHTML = '<div class="empty">Open a case to show the v3 reader.</div>';
    return;
  }

  const contextBanner = renderContextBanner();

  if (state.activeTab === 'case') {
    els.tabContent.innerHTML = `${contextBanner}<div class="reading-surface">${renderMarkdown(state.caseMarkdown)}</div>`;
    return;
  }

  if (state.activeTab === 'encoding') {
    els.tabContent.innerHTML = `${contextBanner}${renderEncodingSummary()}`;
    return;
  }

  els.tabContent.innerHTML = state.readingMarkdown.trim()
    ? `${contextBanner}<div class="reading-surface">${renderMarkdown(state.readingMarkdown)}</div>`
    : `${contextBanner}<section class="placeholder-card">
        <h3>No case reading saved yet</h3>
        <p>The canonical case and case encoding are available, but no saved case reading is attached yet.</p>
        <p class="placeholder-note">Use GPT to generate reading.</p>
      </section>`;
}

function buildStepSummary(step, events) {
  const participantCount = Object.keys(step.participants || {}).length;
  const actionCount = events.length;
  return `${pluralize(participantCount, 'actor')} · ${pluralize(actionCount, 'action')}`;
}

function buildEncounterLabel(event) {
  if (!event) return 'No encounter selected';

  const source = prettyLabel(event.sourceParticipantId || event.alpha_source || '');
  const receiving = prettyLabel(event.receivingParticipantId || event.alpha_receiving || '');
  const medium = prettyLabel(event.mediumParticipantId || event.alpha_medium || '');
  const axis = prettyLabel(event.axis || 'axis');

  if (event.sourceParticipantId && event.receivingParticipantId) {
    return `${source} → ${receiving} (${axis})`;
  }

  if (event.sourceParticipantId) {
    return `${source} emits on ${axis}`;
  }

  if (event.receivingParticipantId) {
    return `${receiving} receives on ${axis}`;
  }

  if (event.mediumParticipantId) {
    return `${medium} mediates on ${axis}`;
  }

  return `Encounter on ${axis}`;
}

function renderParticipantChips(stepIndex, step) {
  const participants = Object.keys(step.participants || []);
  if (!participants.length) {
    return '<div class="inline-empty">No actors are encoded for this step yet.</div>';
  }

  return `<div class="chip-row">
    ${participants
      .map((participantId) => {
        const active = state.participantFocus === participantId ? ' active' : '';
        return `<button
          class="step-chip${active}"
          data-participant-focus="${escapeHtml(participantId)}"
          data-step-index="${stepIndex}"
          aria-pressed="${String(state.participantFocus === participantId)}"
        >${escapeHtml(prettyLabel(participantId))}</button>`;
      })
      .join('')}
  </div>`;
}

function renderEncounterButtons(stepIndex, events) {
  if (!events.length) {
    return '<div class="inline-empty">No actions are encoded for this step yet.</div>';
  }

  return `<div class="encounter-list">
    ${events
      .map((event, encounterIndex) => {
        const isActive = state.encounterFocus
          && state.encounterFocus.stepIndex === stepIndex
          && state.encounterFocus.encounterIndex === encounterIndex;

        const primitiveCount = Array.isArray(event.payload_bundle) ? event.payload_bundle.length : 0;
        const faceText = event.face ? ` · ${prettyLabel(event.face)}` : '';
        const subtitle = `${prettyLabel(event.axis || 'axis')} axis${faceText} · ${pluralize(primitiveCount, 'primitive')}`;

        return `<bsutton
          class="encounter-btn${isActive ? ' active' : ''}"
          data-encounter-focus="${encounterIndex}"
          data-step-index="${stepIndex}"
          aria-pressed="${String(Boolean(isActive))}"
        >
          <div class="encounter-title">${escapeHtml(buildEncounterLabel(event))}</div>
          <div class="encounter-sub">${escapeHtml(subtitle)}</div>
        </button>`;
      })
      .join('')}
  </div>`;
}

function renderTimelineStepCard(step, stepIndex) {
  const active = stepIndex === state.activeStep;
  const events = getStepEvents(stepIndex);
  const cardClass = active ? 'timeline-step-card active' : 'timeline-step-card';

  return `<section class="${cardClass}">
    <button
      class="timeline-step-select"
      data-step-select="${stepIndex}"
      aria-expanded="${String(active)}"
    >
      <div class="timeline-step-header">
        <div>
          <div class="timeline-label">${escapeHtml(step.timestep_label || `Step ${stepIndex + 1}`)}</div>
          <div class="timeline-sub">${escapeHtml(buildStepSummary(step, events))}</div>
        </div>
        <span class="badge">${active ? 'Selected' : `Step ${stepIndex + 1}`}</span>
      </div>
    </button>
    ${active ? `<div class="timeline-step-detail">
      <p class="step-detail-summary">Click an actor to set participant focus. Click an action to set encounter focus. The atlas responds without changing the selected moment.</p>
      <section class="step-detail-block">
        <div class="step-detail-label">Actors</div>
        ${renderParticipantChips(stepIndex, step)}
      </section>
      <section class="step-detail-block">
        <div class="step-detail-label">Actions</div>
        ${renderEncounterButtons(stepIndex, events)}
      </section>
    </div>` : ''}
  </section>`;
}

function renderTimeline() {
  const timeline = getTimeline();
  els.timestepBadge.textContent = String(timeline.length);

  if (!timeline.length) {
    els.timeline.innerHTML = '<div class="empty">No timeline loaded.</div>';
    return;
  }

  if (state.activeStep >= timeline.length) {
    setActiveStep(0);
  }

  els.timeline.innerHTML = timeline
    .map((step, stepIndex) => renderTimelineStepCard(step, stepIndex))
    .join('');
}

function renderPillRow(values, extraClass = '') {
  if (!values.length) return '';
  const className = extraClass ? `atlas-pill-row ${extraClass}` : 'atlas-pill-row';
  return `<div class="${className}">${values
    .map((value) => `<span class="atlas-pill">${escapeHtml(value)}</span>`)
    .join('')}</div>`;
}

function renderAtlasLensSwitch() {
  const lensMeta = getAtlasLensMeta();
  return `<section class="atlas-lens-shell">
    <div class="lens-row">
      <div class="group-label">Lens</div>
      <div class="lens-btn-row">
        ${ATLAS_LENSES
          .map((lens) => `<button
            class="lens-btn${state.atlasLens === lens.id ? ' active' : ''}"
            data-atlas-lens="${lens.id}"
            aria-pressed="${String(state.atlasLens === lens.id)}"
          >${escapeHtml(lens.label)}</button>`)
          .join('')}
      </div>
    </div>
    <p class="lens-note">${escapeHtml(lensMeta.note)}</p>
  </section>`;
}

function renderEventCards(events, { emptyMessage = 'No relation events are encoded here yet.' } = {}) {
  if (!events.length) {
    return `<div class="inline-empty">${escapeHtml(emptyMessage)}</div>`;
  }

  return `<div class="event-card-stack">
    ${events
      .map((event) => {
        const primitiveCount = Array.isArray(event.payload_bundle) ? event.payload_bundle.length : 0;
        const pills = [
          `${prettyLabel(event.axis || 'axis')} axis`,
          event.face ? `Face ${prettyLabel(event.face)}` : null,
          `Source ${prettyLabel(event.sourceParticipantId || event.alpha_source || '—')}`,
          `Receiving ${prettyLabel(event.receivingParticipantId || event.alpha_receiving || '—')}`,
          event.mediumParticipantId || event.alpha_medium
            ? `Medium ${prettyLabel(event.mediumParticipantId || event.alpha_medium)}`
            : null,
          pluralize(primitiveCount, 'primitive'),
        ].filter(Boolean);

        return `<section class="event-card">
          <div class="event-card-title">${escapeHtml(buildEncounterLabel(event))}</div>
          ${renderPillRow(pills, 'compact')}
        </section>`;
      })
      .join('')}
  </div>`;
}

function renderStructureOverview(step) {
  const participants = Object.entries(step.participants || {});
  if (!participants.length) {
    return '<div class="inline-empty">This step has no actor entries to display yet.</div>';
  }

  return `<div class="atlas-section-stack">
    ${participants
      .map([ participantId, participantData ] => `<section class="atlas-section">
        <div class="section-heading-row">
          <h5>${escapeHtml(prettyLabel(participantId))}</h5>
          ${renderPillRow(buildAxisSignature(participantData.axes?.identity || {}), 'compact')}
        </div>
        ${renderAxisCards(participantData.axes || {})}
      </section>`)
      .join('')}
  </div>`;
}

function renderStructureParticipant(stepIndex, participantId, participantData) {
  const participantEvents = getParticipantEvents(stepIndex, participantId);
  const roleCounts = getRoleCounts(participantEvents, participantId);

  return `<div class="atlas-section-stack">
    ${renderPillRow([
      pluralize(participantEvents.length, 'linked action'),
      `Source ${roleCounts.source}`,
      `Receiving ${roleCounts.receiving}`,
      `Medium ${roleCounts.medium}`,
    ])}
    ${renderAxisCards(participantData.axes || {})}
  </div>`;
}

function renderStructureEncounter(event) {
  return `<div class="atlas-section-stack">
    ${renderPillRow([
      `Source ${prettyLabel(event.sourceParticipantId || event.alpha_source || '—')}`,
      `Receiving ${prettyLabel(event.receivingParticipantId || event.alpha_receiving || '—')}`,
      `Medium ${prettyLabel(event.mediumParticipantId || event.alpha_medium || '—')}`,
      `${prettyLabel(event.axis || 'axis')} axis`,
    ])}
    <dl class="encounter-detail-list">
      <div><dt>Source</dt><dd>${escapeHtml(prettyLabel(event.sourceParticipantId || event.alpha_source || '—'))}</dd></div>
      <div><dt>Receiving</dt><dd>${escapeHtml(prettyLabel(event.receivingParticipantId || event.alpha_receiving || '—'))}</dd></div>
      <div><dt>Medium</dt><dd>${escapeHtml(prettyLabel(event.mediumParticipantId || event.alpha_medium || '—'))}</dd></div>
      <div><dt>Axis</dt><dd>${escapeHtml(prettyLabel(event.axis || '—'))}</dd></div>
    </dl>
  </div>`;
}

function renderRelationsOverview(stepIndex, step) {
  const events = getStepEvents(stepIndex);
  const participantCount = Object.keys(step.participants || {}).length;

  return `<div class="atlas-section-stack">
    ${renderPillRow([
      pluralize(participantCount, 'participant'),
      pluralize(events.length, 'encounter'),
    ])}
    ${renderEventCards(events)}
  </div>`;
}

function renderRelationsParticipant(stepIndex, participantId) {
  const events = getParticipantEvents(stepIndex, participantId);
  const roleCounts = getRoleCounts(events, participantId);

  return `<div class="atlas-section-stack">
    ${renderPillRow([
      pluralize(events.length, 'linked encounter'),
      `Source ${roleCounts.source}`,
      `Receiving ${roleCounts.receiving}`,
      `Medium ${roleCounts.medium}`,
    ])}
    ${renderEventCards(events, { emptyMessage: 'No encounters in this step include the focused participant yet.' })}
  </div>`;
}

function renderRelationsEncounter(event) {
  return `<div class="atlas-section-stack">
    ${renderPillRow([
      `Route ${prettyLabel(event.sourceParticipantId || event.alpha_source || '—')} → ${prettyLabel(event.receivingParticipantId || event.alpha_receiving || '—')}`,
      event.mediumParticipantId || event.alpha_medium
        ? `Medium ${prettyLabel(event.mediumParticipantId || event.alpha_medium)}`
        : 'No medium',
      `${prettyLabel(event.axis || 'axis')} axis`,
    ])}
    ${renderEventCards([event])}
  </div>`;
}

function renderExpressionParticipantCard(participantId, participantData) {
  const axisEntries = Object.entries(participantData.axes || {});
  return `<section class="expression-card">
    <div class="section-heading-row">
      <h5>${escapeHtml(prettyLabel(participantId))}</h5>
      <span class="badge">State</span>
    </div>
    ${axisEntries.length
      ? `<div class="expression-grid">
          ${axisEntries
            .map(([axisName, axisData]) => `<div class="expression-row">
              <div class="expression-name">${escapeHtml(prettyLabel(axisName))}</div>
              ${renderPillRow(buildAxisSignature(axisData), 'compact')}
            </div>`)
            .join('')}
        </div>`
      : '<div class="inline-empty">No axis state is available for this participant yet.</div>'
    }
  </section>`;
}

function renderExpressionOverview(step) {
  const participants = Object.entries(step.participants || []);
  const events = getStepEvents();

  return `<div class="atlas-section-stack">
    ${renderPillRow([
      pluralize(participants.length, 'participant state'),
      pluralize(events.length, 'encounter expression'),
    ])}
    ${participants.length
      ? participants.map(([participantId, participantData]) => renderExpressionParticipantCard(participantId, participantData)).join('')
      : '<div class="inline-empty">No participant expression state is available for this step yet.</div>'
    }
    ${events.length
      ? `<section class="atlas-section">
          <h5>Encounter expression</h5>
          <div class="event-card-stack">
            ${events
              .map((event) => `<section class="event-card">
                <div class="event-card-title">${escapeHtml(buildEncounterLabel(event))}</div>
                ${renderPillRow(buildExpressionSummary(event), 'compact')}
              </section>`)
              .join('')}
          </div>
        </section>`
      : ''
    }
  </div>`;
}

function renderExpressionParticipant(stepIndex, participantId, participantData) {
  const events = getParticipantEvents(stepIndex, participantId);

  return `<div class="atlas-section-stack">
    ${renderExpressionParticipantCard(participantId, participantData)}
    <section class="atlas-section">
      <h5>Expression links</h5>
      ${avents.length
        ? `<div class="event-card-stack">
            ${events
              .map((event) => `<section class="event-card">
                <div class="event-card-title">${escapeHtml(buildEncounterLabel(event))}</div>
                ${renderPillRow(buildExpressionSummary(event), 'compact')}
              </section>`)
              .join('')}
          </div>`
        : '<div class="inline-empty">No expression-linked encounters include this participant in the selected step yet.</div>'
      }
    </section>
  </div>`;
}

function renderExpressionEncounter(event) {
  const primitives = Array.isArray(event.payload_bundle) ? event.payload_bundle : [];
  return `<div class="atlas-section-stack">
    ${renderPillRow(buildExpressionSummary(event))}
    <dl class="encounter-detail-list">
      <div><dt>Face</dt><dd>${escapeHtml(prettyLabel(event.face || '—'))}</dd></div>
      <div><dt>Interference</dt><dd>${escapeHtml(event.interference || '—')}</dd></div>
      <div><dt>Axis</dt><dd>${escapeHtml(prettyLabel(event.axis || '—'))}</dd></div>
    </dl>
    <section class="atlas-section">
      <h5>Payload bundle</h5>
      ${primitives.length
        ? `<div class="primitive-list">
            ${primitives
              .map((primitive, index) => `<div class="primitive-chip">
                <b>${index + 1}.</b>
                <span>${escapeHtml(prettyLabel(primitive.sigma || 'L'))}</span>
                <span>${escapeHtml(prettyLabel(primitive.mode || primitive.mu || 'load'))}</span>
                <span>${escapeHtml(prettyLabel(primitive.register || 'retained'))}</span>
              </div>`)
              .join('')}
          </div>`
        : '<div class="inline-empty">No payload bundle detail is attached to this encounter.</div>'
      }
    </section>
  </div>`;
}

function renderAxisCards(axes = {}) {
  const entries = Object.entries(axes);
  if (!entries.length) {
    return '<div class="inline-empty">No axis data is available here yet.</div>';
  }

  return `<div class="atlas-axis-grid">
    ${entries
      .map([name, axisData] => `<section class="axis-card">
        <h4>${escapeHtml(prettyLabel(name))}</h4>
        <dl class="axis-values">
          <div><dt>A</dt><dd>${escapeHtml(axisData.A ?? '—')}</dd></div>
          <div><dt>R</dt><dd>${escapeHtml(axisData.R ?? '—')}</dd></div>
          <div><dt>I</dt><dd>${escapeHtml(axisData.I ?? '—')}</dd></div>
        </dl>
      </section>`)
      .join('')}
  </div>`;
}

function renderAtlasShell({ kicker, heading, note, body, showClearFocus = false }) {
  return `<div class="atlas-view">
    <div class="focus-row atlas-top-row">
      <div>
        <div class="context-kicker">${escapeHtml(kicker)}</div>
        <h4 class="atlas-heading">${escapeHtml(heading)}</h4>
      </div>
      ${showClearFocus ? '<button class="ghost subtle-btn" data-clear-focus="true">Clear focus</button>' : ''}
    </div>
    ${renderAtlasLensSwitch()}
    <p class="atlas-note">${escapeHtml(note)}</p>
    ${body}
  </div>`;
}

function renderAtlasOverview(stepIndex, step) {
  if (state.atlasLens === 'relations') {
    return renderAtlasShell({
      kicker: 'Relation Atlas',
      heading: prettyLabel(step.timestep_label || `Step ${stepIndex + 1}`),
      note: 'Step overview is active. The relations lens surfaces encounter routing for the selected moment.',
      body: renderRelationsOverview(stepIndex, step),
    });
  }

  if (state.atlasLens === 'expression') {
    return renderAtlasShell({
      kicker: 'Relation Atlas',
      heading: prettyLabel(step.timestep_label || `Step ${stepIndex + 1}`),
      note: 'Step overview is active. The expression lens surfaces compact state and face summaries for this moment.',
      body: renderExpressionOverview(step),
    });
  }

  return renderAtlasShell({
    kicker: 'Relation Atlas',
    heading: prettyLabel(step.timestep_label || `Step ${stepIndex + 1}`),
    note: 'Step overview is active. The structure lens shows how encoded state is arranged across the selected moment.',
    body: renderStructureOverview(step),
  });
}

function renderParticipantFocus(stepIndex, step, participantId) {
  const participantData = step.participants?.[participantId];

  if (!participantData) {
    return '<div class="empty">The selected participant is not available in this step.</div>';
  }

  if (state.atlasLens === 'relations') {
    return renderAtlasShell({
      kicker: 'Participant focus',
      heading: prettyLabel(participantId),
      note: 'Focus stays anchored to the selected moment while the relations lens narrows to linked encounters.',
      body: renderRelationsParticipant(stepIndex, participantId),
      showClearFocus: true,
    });
  }

  if (state.atlasLens === 'expression') {
    return renderAtlasShell({
      kicker: 'Participant focus',
      heading: prettyLabel(participantId),
      note: 'Focus stays anchored to the selected moment while the expression lens narrows to state and face signatures.',
      body: renderExpressionParticipant(stepIndex, participantId, participantData),
      showClearFocus: true,
    });
  }

  return renderAtlasShell({
    kicker: 'Participant focus',
    heading: prettyLabel(participantId),
    note: 'Focus stays anchored to the selected moment while the structure lens narrows to one participant.',
    body: renderStructureParticipant(stepIndex, participantId, participantData),
    showClearFocus: true,
  });
}

function renderEncounterFocus(event) {
  if (!event) {
    return '<div class="empty">The selected encounter is not available in this step.</div>';
  }

  if (state.atlasLens === 'relations') {
    return renderAtlasShell({
      kicker: 'Encounter focus',
      heading: buildEncounterLabel(event),
      note: 'The relations lens emphasizes who meets whom here and how the route is carried.',
      body: renderRelationsEncounter(event),
      showClearFocus: true,
    });
  }

  if (state.atlasLens === 'expression') {
    return renderAtlasShell({
      kicker: 'Encounter focus',
      heading: buildEncounterLabel(event),
      note: 'The expression lens emphasizes face, interference, and payload details attached to this encounter.',
      body: renderExpressionEncounter(event),
      showClearFocus: true,
    });
  }

  return renderAtlasShell({
    kicker: 'Encounter focus',
    heading: buildEncounterLabel(event),
    note: 'The structure lens emphasizes how this encounter is wired across the selected moment.',
    body: renderStructureEncounter(event),
    showClearFocus: true,
  });
}

function renderAtlas() {
  const stepIndex = state.activeStep;
  const step = getStep(stepIndex);
  const lensMeta = getAtlasLensMeta();

  if (!step) {
    els.atlasStatusBadge.textContent = 'No step';
    els.atlas.innerHTML = '<div class="empty">No relation atlas data yet.</div>';
    return;
  }

  if (state.participantFocus) {
    els.atlasStatusBadge.textContent = `Participant · ${lensMeta.short}`;
    els.atlas.innerHTML = renderParticipantFocus(stepIndex, step, state.participantFocus);
    return;
  }

  if (state.encounterFocus) {
    els.atlasStatusBadge.textContent = `Encounter · ${lensMeta.short}`;
    els.atlas.innerHTML = renderEncounterFocus(getEncounterEvent());
    return;
  }

  els.atlasStatusBadge.textContent = `Step · ${lensMeta.short}`;
  els.atlas.innerHTML = renderAtlasOverview(stepIndex, step);
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
    if (insidePanel || isToggle) return;
    if (!state.actionsOpen) return;
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
    if (readingButton) {
      handleReadingAction();
    }
  });

  els.tabs.addEventListener('click', (event) => {
    const button = event.target.closest('[data-tab]');
    if (!button) return;
    state.activeTab = button.dataset.tab;
    renderAll();
  });

  els.timeline.addEventListener('click', (event) => {
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
    if (nextStep !== state.activeStep) {
      setActiveStep(nextStep);
    }
    renderAll();
  });

  els.atlas.addEventListener('click', (event) => {
    const lensButton = event.target.closest('[data-atlas-lens]');
    if (lensButton) {
      setAtlasLens(lensButton.dataset.atlasLens);
      renderAtlas();
      renderTabContent();
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
