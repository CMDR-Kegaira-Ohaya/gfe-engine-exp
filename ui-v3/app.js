import { validateCase, solveCase } from '../solver/index.js';

const state = {
  topMode: 'open',
  catalog: [],
  activeTab: 'case',
  activeSlug: null,
  activeStep: 0,
  caseMarkdown: '',
  encoding: null,
  readingMarkdown: '',
  validation: null,
  solved: null,
  notice: 'Canonical catalog is live. Package loading/import is reserved here.',
};

const $ = (id) => document.getElementById(id);

const els = {
  notice: $('notice'),
  topsideRail: $('topside-rail'),
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
    .replaceAll('>', '&gt;');
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
      html.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);
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
  return state.catalog.find((caseEntry) => caseEntry.slug === state.activeSlug) || null;
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

  if (resetTab) {
    state.activeTab = 'case';
  }

  const caseEntry = getActiveCaseEntry();
  if (!caseEntry) {
    renderAll();
    return;
  }

  setNotice(`Loading “${caseEntry.title}”…`);
  renderAll();

  try {
    const [caseMarkdown, encoding, readingMarkdown] = await Promise.all([
      caseEntry.paths.case ? fetchText(`.${caseEntry.paths.case}`) : Promise.resolve(''),
      caseEntry.paths.encoding ? fetchJson(`.${caseEntry.paths.encoding}`) : Promise.resolve(null),
      caseEntry.paths.reading ? fetchText(`.${caseEntry.paths.reading}`) : Promise.resolve(''),
    ]);

    state.caseMarkdown = caseMarkdown;
    state.encoding = encoding;
    state.readingMarkdown = readingMarkdown;
    state.validation = encoding ? validateCase(encoding) : null;
    state.solved = encoding ? solveCase(encoding) : null;

    renderAll();
    setNotice(`“${caseEntry.title}” loaded.`);
  } catch (error) {
    state.caseMarkdown = '';
    state.encoding = null;
    state.readingMarkdown = '';
    state.validation = null;
    state.solved = null;
    renderAll();
    setNotice(`Could not load “${caseEntry.title}”: ${error.message}`);
  }
}

function renderCatalogList() {
  if (!state.catalog.length) {
    return '<div class="empty">No canonical cases in the catalog yet.</div>';
  }

  return state.catalog
    .map((caseEntry) => {
      const active = caseEntry.slug === state.activeSlug ? ' active' : '';
      return `<button class="catalog-item${active}" data-slug="${escapeHtml(caseEntry.slug)}">
        <div class="catalog-title">${escapeHtml(caseEntry.title)}</div>
        <div class="catalog-meta">${caseEntry.timesteps} steps · ${caseEntry.participants} participants</div>
        <div class="catalog-synopsis">${escapeHtml(caseEntry.synopsis || 'No preview yet.')}</div>
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
  if (state.topMode === 'open') {
    els.sidePanelTitle.textContent = 'Open case';
    els.sidePanelIntro.textContent = 'Browse canonical cases from the live catalog.';
    els.reloadCatalog.classList.remove('hidden');
    els.sidePanelBody.className = 'panel-body';
    els.sidePanelBody.innerHTML = renderCatalogList();
    return;
  }

  if (state.topMode === 'package') {
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
  const caseEntry = getActiveCaseEntry();

  if (!caseEntry) {
    els.currentSlug.textContent = 'No case open';
    els.currentTitle.textContent = 'Open a case to begin';
    els.currentSubtitle.textContent = 'Case, case encoding, and reading will appear here.';
    els.sourceBadge.textContent = 'Source zone unknown';
    els.statusBadge.textContent = 'No case';
    els.validationBadge.textContent = 'Validation unknown';
    return;
  }

  els.currentSlug.textContent = caseEntry.slug;
  els.currentTitle.textContent = caseEntry.title;
  els.currentSubtitle.textContent = caseEntry.has_reading
    ? 'Case, case encoding, and saved reading are available.'
    : 'Case and case encoding are available. No saved reading yet.';

  els.sourceBadge.textContent = 'Canonical repo case';
  els.statusBadge.textContent = caseEntry.has_reading ? 'Reading available' : 'Reading missing';

  if (!state.validation) {
    els.validationBadge.textContent = 'Validation unknown';
    return;
  }

  const errors = state.validation.issues.filter((issue) => issue.level === 'error').length;
  const warnings = state.validation.issues.filter((issue) => issue.level === 'warning').length;
  els.validationBadge.textContent = errors ? `Validation errors: ${errors}` : `Warnings: ${warnings}`;
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

function renderTabContent() {
  if (!state.activeSlug) {
    els.tabContent.innerHTML = '<div class="empty">Open a case to show the v3 reader.</div>';
    return;
  }

  if (state.activeTab === 'case') {
    els.tabContent.innerHTML = `<div class="reading-surface">${renderMarkdown(state.caseMarkdown)}</div>`;
    return;
  }

  if (state.activeTab === 'encoding') {
    els.tabContent.innerHTML = renderEncodingSummary();
    return;
  }

  els.tabContent.innerHTML = state.readingMarkdown.trim()
    ? `<div class="reading-surface">${renderMarkdown(state.readingMarkdown)}</div>`
    : `<section class="placeholder-card">
        <h3>No case reading saved yet</h3>
        <p>The canonical case and case encoding are available, but no saved case reading is attached yet.</p>
        <p class="placeholder-note">Use GPT to generate reading.</p>
      </section>`;
}

function renderTimeline() {
  const timeline = state.encoding?.timeline || [];
  els.timestepBadge.textContent = String(timeline.length);

  if (!timeline.length) {
    els.timeline.innerHTML = '<div class="empty">No timeline loaded.</div>';
    return;
  }

  if (state.activeStep >= timeline.length) {
    state.activeStep = 0;
  }

  els.timeline.innerHTML = timeline
    .map((step, stepIndex) => {
      const active = stepIndex === state.activeStep ? ' active' : '';
      const participantCount = Object.keys(step.participants || {}).length;
      return `<button class="timeline-item${active}" data-step="${stepIndex}">
        <div class="timeline-label">${escapeHtml(step.timestep_label || `Step ${stepIndex + 1}`)}</div>
        <div class="timeline-sub">${participantCount} actors in this step</div>
      </button>`;
    })
    .join('');
}

function renderAtlas() {
  const step = state.encoding?.timeline?.[state.activeStep];
  if (!step) {
    els.atlas.innerHTML = '<div class="empty">No relation atlas data yet.</div>';
    return;
  }

  const participantEntries = Object.entries(step.participants || {});
  if (!participantEntries.length) {
    els.atlas.innerHTML = '<div class="empty">This step has no actor entries to display yet.</div>';
    return;
  }

  els.atlas.innerHTML = participantEntries
    .map(([actorId, actorData]) => {
      const axes = Object.entries(actorData.axes || {})
        .map(([axisName, axisData]) => `<li>${escapeHtml(axisName)}: A ${axisData.A ?? '—'} · R ${axisData.R ?? '—'} · I ${axisData.I ?? '—'}</li>`)
        .join('');

      return `<section class="atlas-section">
        <h4>${escapeHtml(actorId)}</h4>
        <ul class="atlas-list">${axes}</ul>
      </section>`;
    })
    .join('');
}

function renderAll() {
  document.querySelectorAll('.topbtn').forEach((button) => {
    button.classList.toggle('active', button.dataset.top === state.topMode);
  });

  document.querySelectorAll('.tab-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === state.activeTab);
  });

  renderSidePanel();
  renderHeader();
  renderTabContent();
  renderTimeline();
  renderAtlas();
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
  state.activeSlug = null;
  state.activeStep = 0;
  state.caseMarkdown = '';
  state.encoding = null;
  state.readingMarkdown = '';
  state.validation = null;
  state.solved = null;
  state.activeTab = 'case';
  renderAll();
  setNotice('Current loaded items cleared.');
}

function handleDelete() {
  if (!confirm('Are you sure?')) return;
  setNotice('Delete confirmed, but repo-write delete is not wired inside v3 yet.');
}

function bindEvents() {
  els.reloadCatalog.addEventListener('click', loadCatalog);

  els.topsideRail.addEventListener('click', (event) => {
    const button = event.target.closest('[data-top]');
    if (!button) return;

    state.topMode = button.dataset.top;

    if (state.topMode === 'reading') {
      state.activeTab = 'reading';
      setNotice('Use GPT to generate reading.');
    } else if (state.topMode === 'package') {
      setNotice('Case package support is not fully wired yet.');
    } else {
      setNotice('Browse canonical cases from the live catalog.');
    }

    renderAll();
  });

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
    const button = event.target.closest('[data-step]');
    if (!button) return;
    state.activeStep = Number(button.dataset.step) || 0;
    renderAll();
  });

  els.clearBtn.addEventListener('click', handleClear);
  els.deleteBtn.addEventListener('click', handleDelete);
}

bindEvents();
loadCatalog();