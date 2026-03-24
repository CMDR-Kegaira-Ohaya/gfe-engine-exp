import { validateCase, solveCase, groupEventsByStep } from '../solver/index.js';

const LENSES = [
  { id: 'structure', short: 'V', label: 'Structure (V)', note: 'Shows how encoded state is arranged across the selected moment.' },
  { id: 'relations', short: 'H', label: 'Relations (H)', note: 'Shows who meets whom and how encounter links are routed here.' },
  { id: 'expression', short: 'R', label: 'Expression (R)', note: 'Shows state, face, and payload emphasis for the selected moment.' },
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

function focusSummary() {
  const step = getStep();
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
    title: label(step?.timestep_label || `Step ${state.activeStep + 1}`),
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

  const flush = () => {
    if (!paragraph.length) return;
    html.push(`<p>${esc(paragraph.join(' '))}</p>`);
    paragraph = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (line.startsWith('### ')) {
      flush();
      html.push(`<h3>${esc(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith('## ')) {
      flush();
      html.push(`<h2>${esc(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith('- ')) {
      flush();
      html.push(`<p>• ${esc(line.slice(2))}</p>`);
      continue;
    }
    paragraph.push(line);
  }

  flush();
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
  els.currentSlug.textContent = entry.slug;
  els.currentTitle.textContent = entry.title;
  els.currentSubtitle.textContent = step?.timestep_label
    ? `Selected moment: ${label(step.timestep_label)}`
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
  els.validationBadge.textContent = errors ? `Validation errors: ${errors}` : warnings ? `Warnings: ${warnings}` : 'Validation clean';
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

  const parts = [`Selected moment: ${label(step.timestep_label || `Step ${state.activeStep + 1}`)}`];
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

function pillRow(values, extraClass = '') {
  if (!values.length) return '';
  const className = extraClass ? `atlas-pill-row ${extraClass}` : 'atlas-pill-row';
  return `<div class="${className}">${values.map((value) => `<span class="atlas-pill">${esc(value)}</span>`).join('')}</div>`;
}

function renderFocusStrip() {
  const step = getStep();
  if (!step) return '<div class="timeline-focus-strip empty">No focus context yet.</div>';

  const focus = focusSummary();
  const pills = [
    `Moment ${label(step.timestep_label || `Step ${state.activeStep + 1}`)}`,
    `Lens ${lensMeta().short}`,
    focus.kind === 'overview' ? 'Overview' : `${label(focus.kind)} focus`,
  ];

  return `<section class="timeline-focus-strip">
    <div class="focus-strip-shell">
      <div class="focus-strip-copy">
        <div class="group-label">Timeline ↔ Atlas</div>
        <div class="focus-strip-title">${esc(focus.title)}</div>
        <div class="focus-strip-note">${esc(focus.note)}</div>
      </div>
      <div class="focus-strip-meta">
        ${pillRow(pills, 'compact')}
        ${state.participantFocus || state.encounterFocus ? '<button class="ghost subtle-btn" data-clear-focus="true">Clear focus</button>' : ''}
      </div>
    </div>
  </section>`;
}

function renderParticipantChips(stepIndex, step) {
  const participants = Object.keys(step.participants || {});
  if (!participants.length) return '<div class="inline-empty">No actors are encoded for this step yet.</div>';

  return `<div class="chip-row">
    ${participants.map((participantId) => `<button
      class="step-chip${state.participantFocus === participantId ? ' active' : ''}"
      data-participant-focus="${esc(participantId)}"
      data-step-index="${stepIndex}"
      aria-pressed="${String(state.participantFocus === participantId)}"
    >${esc(label(participantId))}</button>`).join('')}
  </div>`;
}

function renderEncounterButtons(stepIndex, events) {
  if (!events.length) return '<div class="inline-empty">No actions are encoded for this step yet.</div>';

  return `<div class="encounter-list">
    ${events.map((event, encounterIndex) => {
      const active = state.encounterFocus && state.encounterFocus.stepIndex === stepIndex && state.encounterFocus.encounterIndex === encounterIndex;
      const primitiveCount = Array.isArray(event.payload_bundle) ? event.payload_bundle.length : 0;
      const faceText = event.face ? ` · ${label(event.face)}` : '';
      return `<button class="encounter-btn${active ? ' active' : ''}" data-encounter-focus="${encounterIndex}" data-step-index="${stepIndex}" aria-pressed="${String(Boolean(active))}">
        <div class="encounter-title">${esc(encounterLabel(event))}</div>
        <div class="encounter-sub">${esc(`${label(event.axis || 'axis')} axis${faceText} · ${pluralize(primitiveCount, 'primitive')}`)}</div>
      </button>`;
    }).join('')}
  </div>`;
}

function renderTimelineStepCard(step, stepIndex) {
  const active = stepIndex === state.activeStep;
  const events = getStepEvents(stepIndex);
  return `<section class="timeline-step-card${active ? ' active' : ''}">
    <button class="timeline-step-select" data-step-select="${stepIndex}" aria-expanded="${String(active)}">
      <div class="timeline-step-header">
        <div>
          <div class="timeline-label">${esc(step.timestep_label || `Step ${stepIndex + 1}`)}</div>
          <div class="timeline-sub">${esc(`${pluralize(Object.keys(step.participants || {}).length, 'actor')} · ${pluralize(events.length, 'action')}`)}</div>
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
    els.timeline.innerHTML = `${renderFocusStrip()}<div class="empty">No timeline loaded.</div>`;
    return;
  }

  if (state.activeStep >= timeline.length) setActiveStep(0);
  els.timeline.innerHTML = `${renderFocusStrip()}${timeline.map((step, stepIndex) => renderTimelineStepCard(step, stepIndex)).join('')}`;
}

function renderAxisCards(axes = {}) {
  const entries = Object.entries(axes);
  if (!entries.length) return '<div class="inline-empty">No axis data is available here yet.</div>';

  return `<div class="atlas-axis-grid">
    ${entries.map(([name, axis]) => `<section class="axis-card">
      <h4>${esc(label(name))}</h4>
      <dl class="axis-values">
        <div><dt>A</dt><dd>${esc(axis.A ?? '—')}</dd></div>
        <div><dt>R</dt><dd>${esc(axis.R ?? '—')}</dd></div>
        <div><dt>I</dt><dd>${esc(axis.I ?? '—')}</dd></div>
      </dl>
    </section>`).join('')}
  </div>`;
}

function renderEventCards(events, emptyMessage = 'No relation events are encoded here yet.') {
  if (!events.length) return `<div class="inline-empty">${esc(emptyMessage)}</div>`;

  return `<div class="event-card-stack">
    ${events.map((event) => {
      const primitiveCount = Array.isArray(event.payload_bundle) ? event.payload_bundle.length : 0;
      return `<section class="event-card">
        <div class="event-card-title">${esc(encounterLabel(event))}</div>
        ${pillRow([
          `${label(event.axis || 'axis')} axis`,
          event.face ? `Face ${label(event.face)}` : null,
          `Source ${label(event.sourceParticipantId || event.alpha_source || '—')}`,
          `Receiving ${label(event.receivingParticipantId || event.alpha_receiving || '—')}`,
          (event.mediumParticipantId || event.alpha_medium) ? `Medium ${label(event.mediumParticipantId || event.alpha_medium)}` : null,
          pluralize(primitiveCount, 'primitive'),
        ].filter(Boolean), 'compact')}
      </section>`;
    }).join('')}
  </div>`;
}

function renderExpressionParticipantCard(participantId, participantData) {
  const axisEntries = Object.entries(participantData.axes || {});
  return `<section class="expression-card">
    <div class="section-heading-row">
      <h5>${esc(label(participantId))}</h5>
      <span class="badge">State</span>
    </div>
    ${axisEntries.length ? `<div class="expression-grid">${axisEntries.map(([axisName, axisData]) => `<div class="expression-row"><div class="expression-name">${esc(label(axisName))}</div>${pillRow([`A:${axisData.A ?? '—'}`, `R:${axisData.R ?? '—'}`, `I:${axisData.I ?? '—'}`], 'compact')}</div>`).join('')}</div>` : '<div class="inline-empty">No axis state is available for this participant yet.</div>'}
  </section>`;
}

function renderAtlasLensSwitch() {
  return `<section class="atlas-lens-shell">
    <div class="lens-row">
      <div class="group-label">Lens</div>
      <div class="lens-btn-row">
        ${LENSES.map((lens) => `<button class="lens-btn${state.atlasLens === lens.id ? ' active' : ''}" data-atlas-lens="${lens.id}" aria-pressed="${String(state.atlasLens === lens.id)}">${esc(lens.label)}</button>`).join('')}
      </div>
    </div>
    <p class="lens-note">${esc(lensMeta().note)}</p>
  </section>`;
}

function atlasShell(kicker, heading, note, body, showClearFocus = false) {
  return `<div class="atlas-view">
    <div class="focus-row atlas-top-row">
      <div>
        <div class="context-kicker">${esc(kicker)}</div>
        <h4 class="atlas-heading">${esc(heading)}</h4>
      </div>
      ${showClearFocus ? '<button class="ghost subtle-btn" data-clear-focus="true">Clear focus</button>' : ''}
    </div>
    ${renderAtlasLensSwitch()}
    <p class="atlas-note">${esc(note)}</p>
    ${body}
  </div>`;
}

function renderStructureOverview(step) {
  const participants = Object.entries(step.participants || {});
  if (!participants.length) return '<div class="inline-empty">This step has no actor entries to display yet.</div>';
  return `<div class="atlas-section-stack">${participants.map(([participantId, participantData]) => `<section class="atlas-section"><div class="section-heading-row"><h5>${esc(label(participantId))}</h5>${pillRow([`A:${participantData.axes?.identity?.A ?? '—'}`, `R:${participantData.axes?.identity?.R ?? '—'}`, `I:${participantData.axes?.identity?.I ?? '—'}`], 'compact')}</div>${renderAxisCards(participantData.axes || {})}</section>`).join('')}</div>`;
}

function renderStructureParticipant(stepIndex, participantId, participantData) {
  const events = participantEvents(stepIndex, participantId);
  const roles = roleCounts(events, participantId);
  return `<div class="atlas-section-stack">${pillRow([pluralize(events.length, 'linked action'), `Source ${roles.source}`, `Receiving ${roles.receiving}`, `Medium ${roles.medium}`])}${renderAxisCards(participantData.axes || {})}</div>`;
}

function renderStructureEncounter(event) {
  return `<div class="atlas-section-stack">${pillRow([`Source ${label(event.sourceParticipantId || event.alpha_source || '—')}`, `Receiving ${label(event.receivingParticipantId || event.alpha_receiving || '—')}`, `Medium ${label(event.mediumParticipantId || event.alpha_medium || '—')}`, `${label(event.axis || 'axis')} axis`])}<dl class="encounter-detail-list"><div><dt>Source</dt><dd>${esc(label(event.sourceParticipantId || event.alpha_source || '—'))}</dd></div><div><dt>Receiving</dt><dd>${esc(label(event.receivingParticipantId || event.alpha_receiving || '—'))}</dd></div><div><dt>Medium</dt><dd>${esc(label(event.mediumParticipantId || event.alpha_medium || '—'))}</dd></div><div><dt>Axis</dt><dd>${esc(label(event.axis || '—'))}</dd></div></dl></div>`;
}

function renderRelationsOverview(stepIndex, step) {
  return `<div class="atlas-section-stack">${pillRow([pluralize(Object.keys(step.participants || {}).length, 'participant'), pluralize(getStepEvents(stepIndex).length, 'encounter')])}${renderEventCards(getStepEvents(stepIndex))}</div>`;
}

function renderRelationsParticipant(stepIndex, participantId) {
  const events = participantEvents(stepIndex, participantId);
  const roles = roleCounts(events, participantId);
  return `<div class="atlas-section-stack">${pillRow([pluralize(events.length, 'linked encounter'), `Source ${roles.source}`, `Receiving ${roles.receiving}`, `Medium ${roles.medium}`])}${renderEventCards(events, 'No encounters in this step include the focused participant yet.')}</div>`;
}

function renderRelationsEncounter(event) {
  return `<div class="atlas-section-stack">${pillRow([`Route ${label(event.sourceParticipantId || event.alpha_source || '—')} → ${label(event.receivingParticipantId || event.alpha_receiving || '—')}`, (event.mediumParticipantId || event.alpha_medium) ? `Medium ${label(event.mediumParticipantId || event.alpha_medium)}` : 'No medium', `${label(event.axis || 'axis')} axis`])}${renderEventCards([event])}</div>`;
}

function renderExpressionOverview(stepIndex, step) {
  const participants = Object.entries(step.participants || {});
  const events = getStepEvents(stepIndex);
  return `<div class="atlas-section-stack">${pillRow([pluralize(participants.length, 'participant state'), pluralize(events.length, 'encounter expression')])}${participants.length ? participants.map(([participantId, participantData]) => renderExpressionParticipantCard(participantId, participantData)).join('') : '<div class="inline-empty">No participant expression state is available for this step yet.</div>'}${events.length ? `<section class="atlas-section"><h5>Encounter expression</h5><div class="event-card-stack">${events.map((event) => `<section class="event-card"><div class="event-card-title">${esc(encounterLabel(event))}</div>${pillRow([event.face ? `Face ${label(event.face)}` : null, event.interference ? `Interference ${event.interference}` : null, pluralize(Array.isArray(event.payload_bundle) ? event.payload_bundle.length : 0, 'primitive')].filter(Boolean), 'compact')}</section>`).join('')}</div></section>` : ''}</div>`;
}

function renderExpressionParticipant(stepIndex, participantId, participantData) {
  const events = participantEvents(stepIndex, participantId);
  return `<div class="atlas-section-stack">${renderExpressionParticipantCard(participantId, participantData)}<section class="atlas-section"><h5>Expression links</h5>${events.length ? `<div class="event-card-stack">${events.map((event) => `<section class="event-card"><div class="event-card-title">${esc(encounterLabel(event))}</div>${pillRow([event.face ? `Face ${label(event.face)}` : null, event.interference ? `Interference ${event.interference}` : null, pluralize(Array.isArray(event.payload_bundle) ? event.payload_bundle.length : 0, 'primitive')].filter(Boolean), 'compact')}</section>`).join('')}</div>` : '<div class="inline-empty">No expression-linked encounters include this participant in the selected step yet.</div>'}</section></div>`;
}

function renderExpressionEncounter(event) {
  const primitives = Array.isArray(event.payload_bundle) ? event.payload_bundle : [];
  return `<div class="atlas-section-stack">${pillRow([event.face ? `Face ${label(event.face)}` : 'Face —', event.interference ? `Interference ${event.interference}` : 'Interference —', pluralize(primitives.length, 'primitive')])}<dl class="encounter-detail-list"><div><dt>Face</dt><dd>${esc(label(event.face || '—'))}</dd></div><div><dt>Interference</dt><dd>${esc(event.interference || '—')}</dd></div><div><dt>Axis</dt><dd>${esc(label(event.axis || '—'))}</dd></div></dl><section class="atlas-section"><h5>Payload bundle</h5>${primitives.length ? `<div class="primitive-list">${primitives.map((primitive, index) => `<div class="primitive-chip"><b>${index + 1}.</b><span>${esc(label(primitive.sigma || 'L'))}</span><span>${esc(label(primitive.mode || primitive.mu || 'load'))}</span><span>${esc(label(primitive.register || 'retained'))}</span></div>`).join('')}</div>` : '<div class="inline-empty">No payload bundle detail is attached to this encounter.</div>'}</section></div>`;
}

function renderAtlasOverview(stepIndex, step) {
  if (state.atlasLens === 'relations') return atlasShell('Relation Atlas', label(step.timestep_label || `Step ${stepIndex + 1}`), 'Step overview is active. The relations lens surfaces encounter routing for the selected moment.', renderRelationsOverview(stepIndex, step));
  if (state.atlasLens === 'expression') return atlasShell('Relation Atlas', label(step.timestep_label || `Step ${stepIndex + 1}`), 'Step overview is active. The expression lens surfaces compact state and face summaries for this moment.', renderExpressionOverview(stepIndex, step));
  return atlasShell('Relation Atlas', label(step.timestep_label || `Step ${stepIndex + 1}`), 'Step overview is active. The structure lens shows how encoded state is arranged across the selected moment.', renderStructureOverview(step));
}

function renderParticipantFocus(stepIndex, step, participantId) {
  const participantData = step.participants?.[participantId];
  if (!participantData) return '<div class="empty">The selected participant is not available in this step.</div>';
  if (state.atlasLens === 'relations') return atlasShell('Participant focus', label(participantId), 'Focus stays anchored to the selected moment while the relations lens narrows to linked encounters.', renderRelationsParticipant(stepIndex, participantId), true);
  if (state.atlasLens === 'expression') return atlasShell('Participant focus', label(participantId), 'Focus stays anchored to the selected moment while the expression lens narrows to state and face signatures.', renderExpressionParticipant(stepIndex, participantId, participantData), true);
  return atlasShell('Participant focus', label(participantId), 'Focus stays anchored to the selected moment while the structure lens narrows to one participant.', renderStructureParticipant(stepIndex, participantId, participantData), true);
}

function renderEncounterFocus(event) {
  if (!event) return '<div class="empty">The selected encounter is not available in this step.</div>';
  if (state.atlasLens === 'relations') return atlasShell('Encounter focus', encounterLabel(event), 'The relations lens emphasizes who meets whom here and how the route is carried.', renderRelationsEncounter(event), true);
  if (state.atlasLens === 'expression') return atlasShell('Encounter focus', encounterLabel(event), 'The expression lens emphasizes face, interference, and payload details attached to this encounter.', renderExpressionEncounter(event), true);
  return atlasShell('Encounter focus', encounterLabel(event), 'The structure lens emphasizes how this encounter is wired across the selected moment.', renderStructureEncounter(event), true);
}

function renderAtlas() {
  const step = getStep();
  const short = lensMeta().short;
  if (!step) {
    els.atlasStatusBadge.textContent = 'No step';
    els.atlas.innerHTML = '<div class="empty">No relation atlas data yet.</div>';
    return;
  }

  if (state.participantFocus) {
    els.atlasStatusBadge.textContent = `Participant · ${short}`;
    els.atlas.innerHTML = renderParticipantFocus(state.activeStep, step, state.participantFocus);
    return;
  }
  if (state.encounterFocus) {
    els.atlasStatusBadge.textContent = `Encounter · ${short}`;
    els.atlas.innerHTML = renderEncounterFocus(getEncounterEvent());
    return;
  }

  els.atlasStatusBadge.textContent = `Step · ${short}`;
  els.atlas.innerHTML = renderAtlasOverview(state.activeStep, step);
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
