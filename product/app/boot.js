import { createShell } from './shell.js';
import { createStore } from './store.js';
import { loadCasesIndex, loadCaseBundle, resolveInitialSlug } from './case-bundle.js';
import { activeTraceTarget, sameTarget } from './interaction-state.js';
import { FILTERS, normalizeFilters, resolveFilterState, toggleFilter } from './filters.js';
import { LENSES, lensLabel, lensNote, normalizeLens } from './lenses.js';
import { renderSpecifiedView } from '../gui/specified-view-enhanced.js';
import { renderContextPanel } from '../gui/context-panel.js';
import { renderDocumentsPanel } from '../gui/documents-panel.js';
import { renderRepoPanel } from '../gui/repo-panel.js';
import {
  resolveRuntimeRepoConnector,
  loadInitialProductNote,
  storeLocalProductNote,
  loadInitialCaseSource,
  storeLocalCaseSource,
} from './repo/runtime.js';
import { upsertProductFile } from './repo/commands/upsert-product-file.js';
import { upsertCaseSource } from './repo/commands/upsert-case-source.js';

const PRODUCT_NOTE_PATH = 'product/assets/notes/workbench-note.md';

const root = document.getElementById('app');
const els = createShell(root);
const repoRuntime = resolveRuntimeRepoConnector();

const store = createStore({
  cases: [],
  slug: null,
  bundle: null,
  lens: 'structure',
  filters: normalizeFilters({}),
  selection: null,
  pinned: null,
  trace: {
    enabled: false,
    target: null,
  },
  activeDocument: 'source',
  noteDraft: '',
  noteBaseline: '',
  noteSource: 'template',
  caseSourceDraft: '',
  caseSourceBaseline: '',
  caseSourceSource: 'bundle',
  repoBridge: {
    mode: repoRuntime.mode,
    globalMessage: repoRuntime.message,
    productNote: {
      targetPath: PRODUCT_NOTE_PATH,
      saving: false,
      lastSavedAt: null,
      lastSavedSha: null,
      message: repoRuntime.message,
    },
    caseSource: {
      targetPath: null,
      saving: false,
      lastSavedAt: null,
      lastSavedSha: null,
      message: 'No case source draft loaded yet.',
    },
  },
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

function renderLensBar(state) {
  const activeLens = normalizeLens(state.lens);
  els.lensBar.innerHTML = LENSES.map((lens) => `
    <button
      type="button"
      class="lens-button${lens.id === activeLens ? ' active' : ''}"
      data-lens-id="${lens.id}"
      aria-pressed="${lens.id === activeLens ? 'true' : 'false'}"
      title="${escapeHtml(lens.description)}"
    >
      ${escapeHtml(lens.label)}
    </button>
  `).join('');
}

function renderFilterBar(state) {
  const filterState = resolveFilterState(state.filters, { traceActive: Boolean(state.trace?.enabled) });
  const requestedCount = filterState.counts.requested;
  const waiting = filterState.items.filter((item) => item.requested && !item.available);

  els.filterBar.innerHTML = `
    <div class="filter-bar-label">Filters${requestedCount ? ` (${requestedCount})` : ''}</div>
    <div class="filter-button-row">
      ${FILTERS.map((filter) => {
        const status = filterState.items.find((item) => item.id === filter.id);
        const stateClass = status.requested
          ? (status.available ? ' active' : ' waiting')
          : (status.available ? '' : ' unavailable');
        const title = status.available
          ? filter.description
          : `${filter.description} ${status.reason}`;

        return `
          <button
            type="button"
            class="filter-button${stateClass}"
            data-filter-id="${filter.id}"
            aria-pressed="${status.requested ? 'true' : 'false'}"
            title="${escapeHtml(title)}"
          >
            ${escapeHtml(filter.label)}
          </button>
        `;
      }).join('')}
    </div>
    ${waiting.length
      ? `<div class="filter-bar-note">Waiting: ${escapeHtml(waiting.map((item) => item.label).join(' • '))}. Start a trace to activate.</div>`
      : ''}
  `;
}

function render() {
  const state = store.getState();
  const bundle = state.bundle;
  const activeLens = normalizeLens(state.lens);

  els.currentTitle.textContent = bundle?.identity?.title || 'Product Workbench';
  els.currentSlug.textContent = bundle?.identity?.slug || 'No case open';
  els.currentMode.textContent = state.trace?.enabled
    ? `Lens: ${lensLabel(activeLens)} + process trace`
    : `Lens: ${lensLabel(activeLens)}`;
  els.currentNote.textContent = lensNote(activeLens);

  renderLensBar(state);
  renderFilterBar(state);
  renderCaseList(state);
  renderSpecifiedView(els.mapView, state);
  renderContextPanel(els.contextPanel, state);
  renderDocumentsPanel(els.documentsPanel, state);
  renderRepoPanel(els.repoPanel, state);
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
