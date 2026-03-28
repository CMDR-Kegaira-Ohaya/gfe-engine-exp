import { escapeHtml, eventsForStep, label, participantFromAlpha } from '../app/helpers.js';
import { activeTraceTarget, sameTarget, targetLabel } from '../app/interaction-state.js';

export function renderDocumentsPanel(container, state) {
  if (!container) return;

  const bundle = state.bundle;
  if (!bundle) {
    container.innerHTML = '<div class="documents-empty">Documents will appear here when a case loads.</div>';
    return;
  }

  const active = state.activeDocument || 'source';
  const sourceText = bundle.source?.text || '';
  const narrativeText = bundle.narrative?.text || '';
  const docContext = buildDocumentContext(bundle, state);

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
        ${renderContextPill('Inspect', docContext.selectionLabel, docContext.selectionActive)}
        ${renderContextPill('Pin', docContext.pinnedLabel, docContext.pinnedActive)}
        ${renderContextPill('Trace', docContext.traceLabel, docContext.traceActive)}
      </div>
      <div class="doc-context-note">Gentle highlights follow current context. Documents stay stable and do not auto-jump.</div>
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
    highlightTerms: deriveHighlightTerms(bundle, [selection, pinned, traceTarget]),
  };
}

function renderContextPill(name, value, active) {
  return `<span class="doc-focus-pill${active ? ' active' : ''}"><strong>${escapeHtml(name)}:</strong> ${escapeHtml(value)}</span>`;
}

function deriveHighlightTerms(bundle, targets) {
  const encoding = bundle?.structure;
  const collected = [];

  targets.filter(Boolean).forEach((target) => {
    if (target.type === 'entity') {
      collected.push(target.id, label(target.id));
      return;
    }

    if (target.type === 'moment') {
      const step = encoding?.timeline?.[Number(target.id)];
      if (step?.timestep_label) {
        collected.push(step.timestep_label);
      }
      return;
    }

    if (target.type === 'event') {
      const event = findEventById(encoding, target.id);
      if (!event) return;

      [
        event?.sourceParticipantId,
        participantFromAlpha(event?.alpha_source),
        event?.receivingParticipantId,
        participantFromAlpha(event?.alpha_receiving),
        event?.mediumParticipantId,
        participantFromAlpha(event?.alpha_medium),
      ].forEach((value) => {
        if (value) {
          collected.push(value, label(value));
        }
      });
    }
  });

  const deduped = [];
  const seen = new Set();

  collected
    .map((value) => String(value || '').trim())
    .filter((value) => value.length >= 3)
    .sort((left, right) => right.length - left.length)
    .forEach((value) => {
      const key = value.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(value);
      }
    });

  return deduped.slice(0, 10);
}

function findEventById(encoding, id) {
  if (!encoding) return null;

  const [stepRaw, eventRaw] = String(id).split(':');
  const stepIndex = Number(stepRaw);
  const eventIndex = Number(eventRaw);
  const stepEvents = eventsForStep(Array.isArray(encoding.payload_events) ? encoding.payload_events : [], stepIndex);
  return stepEvents[eventIndex] || null;
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
