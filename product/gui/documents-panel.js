import { escapeHtml } from '../app/helpers.js';
import { resolveFilterState } from '../app/filters.js';
import { activeTraceTarget, targetLabel } from '../app/interaction-state.js';
import { lensDescription, lensLabel, normalizeLens } from '../app/lenses.js';
import { buildCorrespondenceHints, highlightTermsForState } from '../app/correspondence.js';

export function renderDocumentsPanel(container, state) {
  if (!container) return;

  const bundle = state.bundle;
  if (!bundle) {
    container.innerHTML = '<div class="documents-empty">Documents will appear here when a case loads.</div>';
    return;
  }

  const lens = normalizeLens(state.lens);
  const active = state.activeDocument || 'source';
  const sourceText = bundle.source?.text || '';
  const narrativeText = bundle.narrative?.text || '';
  const docContext = buildDocumentContext(bundle, state);
  const correspondence = buildCorrespondenceHints(bundle, state);
  const filterState = resolveFilterState(state.filters, { traceActive: Boolean(state.trace?.enabled) });

  container.innerHTML = `
    <div class="documents-head">
      <div>
        <div class="eyebrow">Documents</div>
        <h2>Source and narrative</h2>
      </div>
      <div class="doc-tabs">
        <button type="button" class="doc-tab${active === 'source' ? ' active' : ''}" data-document-tab="source">Source</button>
        <button type="button" class="doc-tab${active === 'narrative' ? ' active' : ''}" data-document-tab="narrative">Narrative</button>
      </div>
    </div>

    <div class="documents-context-strip">
      <div class="doc-focus-pills">
        <span class="doc-focus-pill active"><strong>Lens:</strong> ${escapeHtml(lensLabel(lens))}</span>
        ${renderContextPill('Inspect', docContext.selectionLabel, docContext.selectionActive)}
        ${renderContextPill('Pin', docContext.pinnedLabel, docContext.pinnedActive)}
        ${renderContextPill('Trace', docContext.traceLabel, docContext.traceActive)}
        <span class="doc-focus-pill provisional active"><strong>Correspondence:</strong> provisional</span>
        ${renderFilterPills(filterState)}
      </div>
      <div class="doc-context-note">${escapeHtml(lensDescription(lens))} Gentle highlights follow current context. Documents stay stable and do not auto-jump.</div>
      ${renderFilterSummary(filterState)}
      <div class="doc-correspondence-strip">
        ${renderDocCorrespondenceItem('Source', correspondence.source)}
        ${renderDocCorrespondenceItem('Narrative', correspondence.narrative)}
      </div>
      <div class="doc-correspondence-note">${escapeHtml(correspondence.note)}</div>
    </div>

    <div class="documents-body">
      ${active === 'source'
        ? (sourceText
            ? `<pre class="doc-pre">${highlightText(sourceText, docContext.highlightTerms)}</pre>`
            : '<div class="documents-empty">Source case is missing for this item.</div>')
        : (narrativeText
            ? `<pre class="doc-pre">${highlightText(narrativeText, docContext.highlightTerms)}</pre>`
            : '<div class="documents-empty">Narrative return is not yet available for this item.</div>')}
    </div>
  `;
}

function buildDocumentContext(bundle, state) {
  const selection = state.selection;
  const pinned = state.pinned;
  const traceTarget = activeTraceTarget(state);

  return {
    selectionLabel: selection ? targetLabel(bundle, selection) : 'None',
    pinnedLabel: pinned ? targetLabel(bundle, pinned) : 'None',
    traceLabel: traceTarget ? targetLabel(bundle, traceTarget) : 'Off',
    selectionActive: Boolean(selection),
    pinnedActive: Boolean(pinned),
    traceActive: Boolean(traceTarget),
    highlightTerms: highlightTermsForState(bundle, state),
  };
}

function renderContextPill(name, value, active) {
  return `<span class="doc-focus-pill${active ? ' active' : ''}"><strong>${escapeHtml(name)}:</strong> ${escapeHtml(value)}</span>`;
}

function renderFilterPills(filterState) {
  const active = filterState.items.filter((item) => item.effective);
  const waiting = filterState.items.filter((item) => item.requested && !item.available);

  return [
    ...active.map((item) => `<span class="doc-focus-pill filter active"><strong>Filter:</strong> ${escapeHtml(item.label)}</span>`),
    ...waiting.map((item) => `<span class="doc-focus-pill filter waiting"><strong>Waiting:</strong> ${escapeHtml(item.label)}</span>`),
  ].join('');
}

function renderFilterSummary(filterState) {
  const active = filterState.items.filter((item) => item.effective).map((item) => item.label);
  const waiting = filterState.items.filter((item) => item.requested && !item.available).map((item) => item.label);

  if (!active.length && !waiting.length) {
    return '';
  }

  const lines = [];
  if (active.length) {
    lines.push(`Effective map filters: ${active.join(' • ')}.`);
  }
  if (waiting.length) {
    lines.push(`Waiting on trace: ${waiting.join(' • ')}.`);
  }
  lines.push('Filters change map density only; they do not alter document text or correspondence truth claims.');

  return `<div class="doc-filter-note">${escapeHtml(lines.join(' '))}</div>`;
}

function renderDocCorrespondenceItem(name, item) {
  const statusLabel = item.status === 'term-hints'
    ? `matched: ${item.matchedTerms.join(', ')}`
    : item.present
      ? 'present, no current term hint matched'
      : 'missing';

  return `
    <div class="doc-correspondence-item ${escapeHtml(item.status)}">
      <strong>${escapeHtml(name)}</strong>
      <span>${escapeHtml(statusLabel)}</span>
    </div>
  `;
}

function highlightText(text, terms) {
  if (!terms?.length) {
    return escapeHtml(text);
  }

  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
  const parts = String(text ?? '').split(pattern);

  return parts
    .map((part, index) => {
      if (index % 2 === 1) {
        return `<mark class="doc-highlight">${escapeHtml(part)}</mark>`;
      }
      return escapeHtml(part);
    })
    .join('');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
