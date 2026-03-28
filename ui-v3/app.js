import { loadCatalog, loadCaseBundle, resolveInitialSlug } from './data/case-bundle.js';
import { createStore } from './state/store.js';
import { renderSpecifiedView } from './views/specified-view.js';
import { renderContextPanel } from './views/context-panel.js';
import { renderDocumentsPanel } from './views/documents-panel.js';

const $ = (sel) => document.querySelector(sel);

const els = {
  notice: $('#notice'),
  currentCaseTitle: $('#current-case-title'),
  currentMode: $('#current-mode'),
  currentSlug: $('#current-slug'),
  caseList: $('#case-list'),
  atlas: $('#atlas'),
  timeline: $('#timeline'),
  sidePanelBody: $('#side-panel-body'),
  documentsPanel: $('#documents-panel'),
};

const store = createStore({
  catalog: [],
  bundle: null,
  slug: null,
  selection: null,
  activeDocument: 'source',
});

function setNotice(message) {
  if (els.notice) els.notice.textContent = message;
}

function setSelection(selection) {
  store.setState({ selection });
}

function setActiveDocument(activeDocument) {
  store.setState({ activeDocument });
}

function renderCaseList(state) {
  if (!els.caseList) return;

  if (!state.catalog.length) {
    els.caseList.innerHTML = '<div class="empty-state">No cases in catalog.</div>';
    return;
  }

  els.caseList.innerHTML = state.catalog
    .map((entry) => {
      const isActive = entry.slug === state.slug ? ' active' : '';
      const synopsis = entry.synopsis ? `<div class="case-synopsis">${escapeHtml(entry.synopsis)}</div>` : '';
      const status = entry.has_encoding ? 'structure ready' : 'source only';
      return `
        <button class="case-card${isActive}" type="button" data-case-slug="${escapeAttr(entry.slug)}">
          <div class="case-title">${escapeHtml(entry.title || entry.slug)}</div>
          <div class="case-meta">${escapeHtml(status)}</div>
          ${synopsis}
        </button>
      `;
    })
    .join('');
}

function render() {
  const state = store.getState();
  const bundle = state.bundle;

  if (els.currentMode) {
    const mode = bundle?.projection?.mode || 'structure';
    els.currentMode.textContent = `Mode: ${mode}`;
  }

  if (els.currentCaseTitle) {
    els.currentCaseTitle.textContent = bundle?.identity?.title || 'Workbench v3';
  }

  if (els.currentSlug) {
    els.currentSlug.textContent = bundle?.identity?.slug || 'No case open';
  }

  renderCaseList(state);
  renderSpecifiedView(els.atlas, els.timeline, state);
  renderContextPanel(els.sidePanelBody, state);
  renderDocumentsPanel(els.documentsPanel, state);
}

async function openCase(slug) {
  if (!slug) return;
  setNotice('Loading case…');

  try {
    const bundle = await loadCaseBundle(slug, store.getState().catalog);
    store.setState({
      bundle,
      slug,
      selection: null,
      activeDocument: bundle.status.artifacts.source ? 'source' : 'narrative',
    });

    const url = new URL(window.location.href);
    url.searchParams.set('case', slug);
    window.history.replaceState({}, '', url);
    setNotice('Ready');
  } catch (error) {
    setNotice('Case load failed');
    if (els.atlas) els.atlas.textContent = `Could not load case: ${error.message}`;
    if (els.timeline) els.timeline.textContent = 'No timeline available for this case.';
    if (els.sidePanelBody) {
      els.sidePanelBody.innerHTML = `
        <h2>Context Panel</h2>
        <p>Could not load the requested case.</p>
        <pre>${escapeHtml(error.message)}</pre>
      `;
    }
  }
}

function bind() {
  document.addEventListener('click', async (event) => {
    const caseButton = event.target.closest('[data-case-slug]');
    if (caseButton) {
      await openCase(caseButton.dataset.caseSlug);
      return;
    }

    const selectionButton = event.target.closest('[data-select-type]');
    if (selectionButton) {
      setSelection({
        type: selectionButton.dataset.selectType,
        id: selectionButton.dataset.selectId,
      });
      return;
    }

    const documentTab = event.target.closest('[data-document-tab]');
    if (documentTab) {
      setActiveDocument(documentTab.dataset.documentTab);
    }
  });
}

async function init() {
  bind();
  store.subscribe(render);
  render();

  try {
    setNotice('Loading catalog…');
    const catalog = await loadCatalog();
    store.setState({ catalog });
    const requestedSlug = new URLSearchParams(window.location.search).get('case');
    const initialSlug = resolveInitialSlug(catalog, requestedSlug);

    if (!initialSlug) {
      setNotice('No cases available');
      return;
    }

    await openCase(initialSlug);
  } catch (error) {
    setNotice('Catalog load failed');
    if (els.atlas) els.atlas.textContent = `Could not load catalog: ${error.message}`;
    if (els.timeline) els.timeline.textContent = 'No timeline available for this case.';
    if (els.sidePanelBody) {
      els.sidePanelBody.innerHTML = `
        <h2>Context Panel</h2>
        <p>Could not load the case catalog.</p>
        <pre>${escapeHtml(error.message)}</pre>
      `;
    }
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}

init();
