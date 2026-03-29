import { createShell } from './shell.js';
import { createStore } from './store.js';
import { loadCasesIndex, loadCaseBundle, resolveInitialSlug } from './case-bundle.js';
import { activeTraceTarget, sameTarget } from './interaction-state.js';
import { FILTERS, normalizeFilters, resolveFilterState, toggleFilter } from './filters.js';
import { LENSES, lensLabel, lensNote, normalizeLens } from './lenses.js';
import { renderSpecifiedView } from '../gui/specified-view.js';
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

async function openCase(slug) {
  if (!slug) return;

  setNotice('Loading case…');

  try {
    const bundle = await loadCaseBundle(slug, store.getState().cases);
    const caseDraft = await loadInitialCaseSource(slug, bundle.source?.text || '');
    const repoBridge = store.getState().repoBridge;
    const sourceTargetPath = bundle.repoPaths?.source || `cases/${slug}/source/case.md`;

    store.setState({
      slug,
      bundle: {
        ...bundle,
        source: {
          ...bundle.source,
          text: caseDraft.text,
        },
      },
      selection: null,
      pinned: null,
      trace: {
        enabled: false,
        target: null,
      },
      activeDocument: bundle.status.artifacts.source ? 'source' : 'narrative',
      caseSourceDraft: caseDraft.text,
      caseSourceBaseline: caseDraft.text,
      caseSourceSource: caseDraft.source,
      repoBridge: {
        ...repoBridge,
        caseSource: {
          targetPath: sourceTargetPath,
          saving: false,
          lastSavedAt: null,
          lastSavedSha: null,
          message: `Case source draft loaded from ${caseDraft.source}.`,
        },
      },
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

function setLens(lensId) {
  store.setState({ lens: normalizeLens(lensId) });
}

function toggleUiFilter(filterId) {
  const filters = toggleFilter(store.getState().filters, filterId);
  store.setState({ filters });
}

function togglePinnedTarget(target) {
  if (!target) return;

  const state = store.getState();
  const nextPinned = sameTarget(state.pinned, target) ? null : target;
  const traceTarget = activeTraceTarget(state);
  const nextTrace = state.trace?.enabled && sameTarget(traceTarget, state.pinned)
    ? (nextPinned ? { enabled: true, target: nextPinned } : { enabled: false, target: null })
    : state.trace;

  store.setState({
    pinned: nextPinned,
    trace: nextTrace,
  });
}

function startTrace(target) {
  if (!target) return;

  store.setState({
    lens: 'process',
    trace: {
      enabled: true,
      target,
    },
  });
}

function stopTrace() {
  store.setState({
    trace: {
      enabled: false,
      target: null,
    },
  });
}

function restoreProductNoteDraft() {
  const state = store.getState();
  const baseline = state.noteBaseline ?? '';

  store.setState({
    noteDraft: baseline,
    noteSource: 'restored-loaded',
    repoBridge: {
      ...state.repoBridge,
      productNote: {
        ...state.repoBridge.productNote,
        message: 'Product note draft restored to the currently loaded baseline.',
      },
    },
  });
}

function restoreCaseSourceDraft() {
  const state = store.getState();
  const baseline = state.caseSourceBaseline ?? '';

  store.setState({
    caseSourceDraft: baseline,
    caseSourceSource: 'restored-loaded',
    bundle: state.bundle
      ? {
          ...state.bundle,
          source: {
            ...state.bundle.source,
            text: baseline,
          },
        }
      : state.bundle,
    repoBridge: {
      ...state.repoBridge,
      caseSource: {
        ...state.repoBridge.caseSource,
        message: 'Controlled case draft restored to the currently loaded baseline.',
      },
    },
  });
}

async function saveProductNote() {
  const state = store.getState();
  const currentBridge = state.repoBridge;

  store.setState({
    repoBridge: {
      ...currentBridge,
      productNote: {
        ...currentBridge.productNote,
        saving: true,
        message: repoRuntime.connector
          ? 'Saving product-local note to repo…'
          : 'No repo connector attached. Saving draft locally only…',
      },
    },
  });

  if (!repoRuntime.connector) {
    storeLocalProductNote(state.noteDraft);
    store.setState({
      noteBaseline: state.noteDraft,
      noteSource: 'local-draft',
      repoBridge: {
        ...store.getState().repoBridge,
        productNote: {
          ...store.getState().repoBridge.productNote,
          saving: false,
          lastSavedAt: new Date().toISOString(),
          message: 'No repo connector attached. Draft saved locally only.',
        },
      },
    });
    return;
  }

  try {
    const result = await upsertProductFile(repoRuntime.connector, {
      path: currentBridge.productNote.targetPath,
      content: state.noteDraft,
      message: 'Update product workbench note',
      branch: 'main',
    });

    storeLocalProductNote(state.noteDraft);
    store.setState({
      noteBaseline: state.noteDraft,
      noteSource: 'repo-saved-draft',
      repoBridge: {
        ...store.getState().repoBridge,
        productNote: {
          ...store.getState().repoBridge.productNote,
          saving: false,
          lastSavedAt: new Date().toISOString(),
          lastSavedSha: result.sha,
          message: `Saved product note to ${result.path}.`,
        },
      },
    });
  } catch (error) {
    storeLocalProductNote(state.noteDraft);
    store.setState({
      noteSource: 'local-draft',
      repoBridge: {
        ...store.getState().repoBridge,
        productNote: {
          ...store.getState().repoBridge.productNote,
          saving: false,
          lastSavedAt: new Date().toISOString(),
          message: `Repo save failed: ${error.message}. Draft preserved locally only.`,
        },
      },
    });
  }
}

async function saveControlledCaseSource() {
  const state = store.getState();
  if (!state.slug) return;

  const currentBridge = state.repoBridge;
  const targetPath = currentBridge.caseSource.targetPath || state.bundle?.repoPaths?.source || `cases/${state.slug}/source/case.md`;

  store.setState({
    repoBridge: {
      ...currentBridge,
      caseSource: {
        ...currentBridge.caseSource,
        targetPath,
        saving: true,
        message: repoRuntime.connector
          ? 'Saving controlled case source to repo…'
          : 'No repo connector attached. Saving controlled draft locally only…',
      },
    },
  });

  if (!repoRuntime.connector) {
    storeLocalCaseSource(state.slug, state.caseSourceDraft);
    store.setState({
      caseSourceBaseline: state.caseSourceDraft,
      caseSourceSource: 'local-draft',
      bundle: {
        ...state.bundle,
        source: {
          ...state.bundle.source,
          text: state.caseSourceDraft,
        },
      },
      repoBridge: {
        ...store.getState().repoBridge,
        caseSource: {
          ...store.getState().repoBridge.caseSource,
          targetPath,
          saving: false,
          lastSavedAt: new Date().toISOString(),
          message: 'No repo connector attached. Controlled case draft saved locally only.',
        },
      },
    });
    return;
  }

  try {
    const result = await upsertCaseSource(repoRuntime.connector, {
      slug: state.slug,
      path: targetPath,
      content: state.caseSourceDraft,
      message: `Update case source for ${state.slug} from product workbench`,
      branch: 'main',
    });

    storeLocalCaseSource(state.slug, state.caseSourceDraft);
    store.setState({
      caseSourceBaseline: state.caseSourceDraft,
      caseSourceSource: 'repo-saved-draft',
      bundle: {
        ...state.bundle,
        source: {
          ...state.bundle.source,
          text: state.caseSourceDraft,
        },
      },
      repoBridge: {
        ...store.getState().repoBridge,
        caseSource: {
          ...store.getState().repoBridge.caseSource,
          targetPath,
          saving: false,
          lastSavedAt: new Date().toISOString(),
          lastSavedSha: result.sha,
          message: `Saved controlled case source to ${result.path}.`,
        },
      },
    });
  } catch (error) {
    storeLocalCaseSource(state.slug, state.caseSourceDraft);
    store.setState({
      caseSourceSource: 'local-draft',
      bundle: {
        ...state.bundle,
        source: {
          ...state.bundle.source,
          text: state.caseSourceDraft,
        },
      },
      repoBridge: {
        ...store.getState().repoBridge,
        caseSource: {
          ...store.getState().repoBridge.caseSource,
          targetPath,
          saving: false,
          lastSavedAt: new Date().toISOString(),
          message: `Controlled repo save failed: ${error.message}. Draft preserved locally only.`,
        },
      },
    });
  }
}

function bind() {
  document.addEventListener('click', async (event) => {
    const caseButton = event.target.closest('[data-case-slug]');
    if (caseButton) {
      await openCase(caseButton.dataset.caseSlug);
      return;
    }

    const lensButton = event.target.closest('[data-lens-id]');
    if (lensButton) {
      setLens(lensButton.dataset.lensId);
      return;
    }

    const filterButton = event.target.closest('[data-filter-id]');
    if (filterButton) {
      toggleUiFilter(filterButton.dataset.filterId);
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

    const pinButton = event.target.closest('[data-pin-type]');
    if (pinButton) {
      togglePinnedTarget({
        type: pinButton.dataset.pinType,
        id: pinButton.dataset.pinId,
      });
      return;
    }

    const traceButton = event.target.closest('[data-trace-action]');
    if (traceButton) {
      if (traceButton.dataset.traceAction === 'stop-trace') {
        stopTrace();
        return;
      }

      startTrace({
        type: traceButton.dataset.traceType,
        id: traceButton.dataset.traceId,
      });
      return;
    }

    const documentTab = event.target.closest('[data-document-tab]');
    if (documentTab) {
      store.setState({ activeDocument: documentTab.dataset.documentTab });
      return;
    }

    const repoAction = event.target.closest('[data-repo-action]');
    if (repoAction?.dataset.repoAction === 'restore-product-note') {
      restoreProductNoteDraft();
      return;
    }

    if (repoAction?.dataset.repoAction === 'restore-case-source') {
      restoreCaseSourceDraft();
      return;
    }

    if (repoAction?.dataset.repoAction === 'save-product-note') {
      await saveProductNote();
      return;
    }

    if (repoAction?.dataset.repoAction === 'save-case-source') {
      await saveControlledCaseSource();
    }
  });

  document.addEventListener('input', (event) => {
    const noteInput = event.target.closest('[data-repo-note-input]');
    if (noteInput) {
      store.setState({ noteDraft: noteInput.value });
      return;
    }

    const caseInput = event.target.closest('[data-case-source-input]');
    if (caseInput) {
      store.setState({ caseSourceDraft: caseInput.value });
    }
  });
}

async function init() {
  bind();
  store.subscribe(render);
  render();

  try {
    const note = await loadInitialProductNote();
    store.setState({
      noteDraft: note.text,
      noteBaseline: note.text,
      noteSource: note.source,
      repoBridge: {
        ...store.getState().repoBridge,
        productNote: {
          ...store.getState().repoBridge.productNote,
          message: `${repoRuntime.message} Product note source: ${note.source}.`,
        },
      },
    });

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
