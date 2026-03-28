import { createShell } from './shell.js';
import { createStore } from './store.js';
import { loadCasesIndex, loadCaseBundle, resolveInitialSlug } from './case-bundle.js';
import { renderSpecifiedView } from '../gui/specified-view.js';
import { renderContextPanel } from '../gui/context-panel.js';
import { renderDocumentsPanel } from '../gui/documents-panel.js';

const root = document.getElementById('app');
const els = createShell(root);

const store = createStore({
  cases: [],
  slug: null,
  bundle: null,
  selection: null,
  activeDocument: 'source',
});

function setNotice(message) {
  els.notice.textContent = message;
}

function renderCaseList(state) {
  const { cases, slug } = state;

  if (!cases.length) {
    els.caseList.innerHTML = '<div class="empty-state">No cases available.</div>';
    return;
  }

  els.caseList.innerHTML = cases
    .map((entry) => {
      const active = entry.slug === slug ? ' active' : '';
      return `
        <button class="case-card${active}" type="button" data-case-slug="${entry.slug}">
          <div class="case-title">${escapeHtml(entry.title)}</div>
          <div class="case-meta">${escapeHtml(entry.summary || 'Case bundle')}</div>
        </button>
      `;
    })
    .join('');
}

function render() {
  const state = store.getState();
  const bundle = state.bundle;

  els.currentTitle.textContent = bundle?.identity?.title || 'Product Workbench';
  els.currentSlug.textContent = bundle?.identity?.slug || 'No case open';
  els.currentMode.textContent = `Mode: ${bundle?.projection?.mode || 'structure'}`;

  renderCaseList(state);
  renderSpecifiedView(els.mapView, state);
  renderContextPanel(els.contextPanel, state);
  renderDocumentsPanel(els.documentsPanel, state);
}

async function openCase(slug) {
  if (!slug) return;

  setNotice('Loading case…');

  try {
    const bundle = await loadCaseBundle(slug, store.getState().cases);
    store.setState({
      slug,
      bundle,
      selection: null,
      activeDocument: bundle.status.artifacts.source ? 'source' : 'narrative',
    });

    const url = new URL(window.location.href);
    url.searchParams.set('case', slug);
    window.history.replaceState({}, '', url);
    setNotice('Ready');
  } catch (error) {
    setNotice('Case load failed');
    els.mapView.innerHTML = `<div class="empty-state">Could not load case: ${escapeHtml(error.message)}</div>`;
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
      store.setState({
        selection: {
          type: selectionButton.dataset.selectType,
          id: selectionButton.dataset.selectId,
        },
      });
      return;
    }

    const documentTab = event.target.closest('[data-document-tab]');
    if (documentTab) {
      store.setState({ activeDocument: documentTab.dataset.documentTab });
    }
  });
}

async function init() {
  bind();
  store.subscribe(render);
  render();

  try {
    setNotice('Loading cases…');
    const cases = await loadCasesIndex();
    store.setState({ cases });

    const requested = new URLSearchParams(window.location.search).get('case');
    const initialSlug = resolveInitialSlug(cases, requested);

    if (!initialSlug) {
      setNotice('No cases found');
      return;
    }

    await openCase(initialSlug);
  } catch (error) {
    setNotice('Startup failed');
    els.mapView.innerHTML = `<div class="empty-state">Could not start product workbench: ${escapeHtml(error.message)}</div>`;
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

init();
