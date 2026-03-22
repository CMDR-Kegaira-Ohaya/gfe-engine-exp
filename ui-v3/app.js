import { validateCase, solveCase } from '../solver/index.js';

const state = {
  catalog: [],
  activeTab: 'case',
  activeSlug: null,
  activeStep: 0,
  caseMarkdown: '',
  encoding: null,
  readingMarkdown: '',
  validation: null,
  solved: null,
  notice: 'V3 is running in parallel with v2.'
};

const $ = (id) => document.getElementById(id);

const els = {
  notice: $('notice'),
  catalogList: $('catalog-list'),
  reloadCatalog: $('reload-catalog'),
  currentSlug: $('current-slug'),
  currentTitle: $('current-title'),
  currentSubtitle: $('current-subtitle'),
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
      html.push(`<hn>${escapeHtml(line.slice(3))}</h2>`);
      continue;
    }

    if (line.startsWith('- ')) {
      flushParagraph();
      html.push(`<p>• ${escapeHtml(line.slice(2))}</p>`);
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  return html.join('');
}

function getActiveCaseEntry() {
  return state.catalog.find(caseEntry => caseEntry.slug === state.activeSlug) || null;
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
    renderCatalog();
    if (state.activeSlug) {
      await loadCase(state.activeSlug);
    } else {
      renderAll();
      setNotice('No canonical cases are available yet.');
    }
  } catch (error) {
    els.catalogList.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
    setNotice('Could not load the canonical catalog.');
  }
}

async function loadCase(slug) {
  state.activeSlug = slug;
  state.activeStep = 0;
  renderCatalog();
  const caseEntry = getActiveCaseEntry();
  if (!caseEntry) return;

  setNotice(`Loading "${caseEntry.title}"… `);

  try {
    const [caseMarkdown, encoding, readingMarkdown] = await Promise.all([
      caseEntry.paths.case ? fetchText(`.${caseEntry.paths.case}`) : Promise.resolve(''),
      caseEntry.paths.encoding ? fetchJson(`.${caseEntry.paths.encoding}`) : Promise.resolve(null),
      caseEntry.paths.reading ? fetchText(`.${caseEntry.paths.reading}`) : Promise.resolve('')
    ]);

    state.caseMarkdown = caseMarkdown;
    state.encoding = encoding;
    state.readingMarkdown = readingMarkdown;
    state.validation = encoding ? validateCase(encoding) : null;
    state.solved = encoding ? solveCase(encoding) : null;
    renderAll();
    setNotice(`"${caseEntry.title}" loaded.`);
  } catch (error) {
    state.caseMarkdown = '';
    state.encoding = null;
    state.readingMarkdown = '';
    state.validation = null;
    state.solved = null;
    renderAll();
    setNotice(`Could not load "${caseEntry.title}": ${error.message}`);
  }
}

function renderCatalog() {
  if (!state.catalog.length) {
    els.catalogList.innerHTML = '<div class="empty">No canonical cases in the catalog yet.</div>';
    return;
  }

  els.catalogList.innerHTML = state.catalog
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

function renderHeader() {
  const caseEntry = getActiveCaseEntry();
  if (!caseEntry) {
    els.currentSlug.textContent = 'No case open';
    els.currentTitle.textContent = 'Open a case to begin';
    els.currentSubtitle.textContent = 'Case, case encoding, and reading will appear here.';
    els.statusBadge.textContent = 'No case';
    els.validationBadge.textContent = 'Validation unknown';
    return;
  }

  els.currentSlug.textContent = caseEntry.slug;
  els.currentTitle.textContent = caseEntry.title;
  els.currentSubtitle.textContent = `${
    caseEntry.has_reading ? 'Case, encoding, and saved reading are available.' : 'Case and encoding are available. No saved reading yet.'
  }`;
  els.statusBadge.textContent = caseEntry.has_reading ? 'Reading saved' : 'Reading not yet saved';

  if (!state.validation) {
    els.validationBadge.textContent = 'Validation unknown';
    return;
  }

  const errors= state.validation.issues.filter(issue => issue.level === 'error').length;
  const warnings = state.validation.issues.filter(issue => issue.level === 'warning').length;
  els.validationBadge.textContent = errors
    ? `Validation errors: ${errors}`
    : `Warnings: ${warnings}`;
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
    els.tabContent.innerHTML = state.encoding
      ? `<pre class="pre-json">${escapeHtml(JSON.stringify(state.encoding, null, 2))}</pre>`
      : '<div class="empty">No case encoding loaded.</div>';
    return;
  }

  els.tabContent.innerHTML = state.readingMarkdown.trim()
    ? `<div class="reading-surface">${renderMarkdown(state.readingMarkdown)}</div>`
    : '<div class="empty">No saved case reading yet.</div>';
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
    .map(step, stepIndex) => {
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
        .map(([axisName, axisData]) => `<li>${escapeHtml(axisName)}: A ${axisData.A ?? '–'} · R ${axisData.R ?? '–'} · I ${axisData.I ?? '–'}</li>`)
        .join('');

      return `<section class="atlas-setion">
        <h4>${escapeHtml(actorId))}</h4>
        <ul class="atlas-list">${axes}</ul>
      </section>`;
    })
    .join('');
}

function renderAll() {
  document.querySelectorAll('.tab-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === state.activeTab);
  });
  renderHeader();
  renderTabContent();
  renderTimeline();
  renderAtlas();
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
  renderCatalog();
  renderAll();
  setNotice('Current loaded items cleared.');
}

function handleDelete() {
  if (!confirm('Are you sure?')) return;
  setNotice('Delete confirmed, but repo-write delete is not wired inside v3 yet.');
}

function bindEvents() {
  els.reloadCatalog.addEventListener('click', loadCatalog);
  els.catalogList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-slug]');
    if (!button) return;
    loadCase(button.dataset.slug);
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
