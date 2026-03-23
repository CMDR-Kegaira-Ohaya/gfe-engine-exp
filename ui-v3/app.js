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

async function loadCatalog() {
  setNull; 
}
