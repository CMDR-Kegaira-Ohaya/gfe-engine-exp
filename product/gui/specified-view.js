import { escapeHtml, eventsForStep, label, participantFromAlpha, eventTitle } from '../app/helpers.js';
import { resolveFilterState } from '../app/filters.js';
import { activeTraceTarget, buildTraceIndex, sameTarget, targetLabel } from '../app/interaction-state.js';
import { lensLabel, normalizeLens } from '../app/lenses.js';

const AXIS_ORDER = ['cfg', 'emb', 'org', 'dir', 'leg'];

const AXIS_LABELS = {
  cfg: 'CFG',
  emb: 'EMB',
  org: 'ORG',
  dir: 'DIR',
  leg: 'LEG',
};

export function renderSpecifiedView(container, state) {
  if (!container) return;

  const bundle = state.bundle;
  if (!bundle) {
    container.innerHTML = '<div class="empty-state">No case loaded.</div>';
    return;
  }

  const encoding = bundle.structure;
  if (!encoding) {
    container.innerHTML = '<div class="empty-state">This case does not yet expose structural data.</div>';
    return;
  }

  const lens = normalizeLens(state.lens);
  const steps = Array.isArray(encoding.timeline) ? encoding.timeline : [];
  const events = Array.isArray(encoding.payload_events) ? encoding.payload_events : [];
  const traceTarget = activeTraceTarget(state);
  const trace = buildTraceIndex(bundle, traceTarget);
  const filterState = resolveFilterState(state.filters, { traceActive: Boolean(traceTarget) });
  const filters = filterState.effective;

  const visibleStepRefs = steps
    .map((step, stepIndex) => ({ step, stepIndex, stepEvents: eventsForStep(events, stepIndex) }))
    .filter(({ stepIndex, stepEvents }) => {
      if (filters.tracedFlowOnly && !trace.moments.has(String(stepIndex)) && trace.anchorMoment !== stepIndex) {
        return false;
      }
      if (filters.payloadOnly && !stepEvents.length) {
        return false;
      }
      return true;
    });

  if (!visibleStepRefs.length) {
    container.innerHTML = renderEmptyFilteredState(filterState);
    return;
  }

  const caseAxisTotals = axisTotalsFromEvents(events);
  const payloadMoments = visibleStepRefs.filter((item) => item.stepEvents.length).length;
  const focusModel = buildFocusModel(bundle, state, visibleStepRefs, events, traceTarget);

  container.innerHTML = `
    <div class="map-summary compact-map-summary compact-node-summary">
      <div>
        <div class="eyebrow">Case map</div>
        <h2>${escapeHtml(bundle.identity.title)}</h2>
        <p>${escapeHtml(bundle.identity.synopsis || 'Resized for the window. Case coverage and focus readout are kept distinct.')}</p>
      </div>
      <div class="summary-badges compact-summary-badges">
        <span class="badge badge-lens">lens: ${escapeHtml(lensLabel(lens))}</span>
        <span class="badge">structure: ${escapeHtml(bundle.status.structural)}</span>
        <span class="badge">moments: ${escapeHtml(visibleStepRefs.length)} / ${escapeHtml(steps.length)}</span>
        <span class="badge">payload: ${escapeHtml(payloadMoments)}</span>
      </div>
    </div>

    <div class="map-topology">
      ${renderCoverageStrip(caseAxisTotals, bundle, events.length)}
      ${renderFocusRack(focusModel)}
    </div>

    <section class="moment-grid-shell panel-strip">
      <div class="moment-grid-head">
        <div>
          <div class="eyebrow">Moment grid</div>
          <h3>The current board still shows moments as compact nodes</h3>
        </div>
        <div class="moment-grid-note">Case coverage stays global. The focus rack updates per selected moment, entity, or event.</div>
      </div>
      <div class="moment-grid">
        ${visibleStepRefs.map((item) => renderMomentCard(item, state, trace)).join('')}
      </div>
    </section>
  `;
}

function renderCoverageStrip(axisTotals, bundle, eventCount) {
  const series = axisSeries(axisTotals);
  return `
    <section class="coverage-strip">
      <div class="coverage-strip-head">
        <div>
          <div class="eyebrow">Case coverage</div>
          <h3>Canon 5-axis registry</h3>
        </div>
        <div class="coverage-stats">
          <span class="registry-stat"><strong>${escapeHtml(eventCount)}</strong><span>events</span></span>
          <span class="registry-stat"><strong>${escapeHtml(bundle.status.provenance?.solverCertified ? 'yes' : 'no')}</strong><span>solver</span></span>
        </div>
      </div>
      <div class="coverage-axis-row">
        ${series.map((entry) => renderAxisCard(entry, 'coverage')).join('')}
      </div>
    </section>
  `;
}

function renderFocusRack(focusModel) {
  const series = axisSeries(focusModel.axisTotals);
  return `
    <section class="focus-rack-strip">
      <div class="focus-rack-head">
        <div>
          <div class="eyebrow">Focus readout</div>
          <h3>${escapeHtml(focusModel.label)}</h3>
          <p>${escapeHtml(focusModel.note)}</p>
        </div>
        <div class="focus-badges">
          <span class="badge">scope: ${escapeHtml(focusModel.scope)}</span>
          <span class="badge">events: ${escapeHtml(focusModel.eventCount)}</span>
          <span class="badge">type: ${escapeHtml(focusModel.targetType)}</span>
        </div>
      </div>
      <div class="focus-axis-row">
        ${series.map((entry) => renderAxisCard(entry, 'focus')).join('')}
      </div>
    </section>
  `;
}

function renderAxisCard(entry, variant) {
  return `
    <div class="axis-card ${variant} ${entry.isEmpty ? 'empty' : 'nonempty'}">
      <div class="axis-card-head">
        <strong>${escapeHtml(entry.label)}</strong>
        <span>${escapeHtml(entry.tickText)}</span>
      </div>
      <div class="axis-card-track">
        <span class="axis-card-fill" style="width:${entry.width}%"></span>
      </div>
    </div>
  `;
}

function renderMomentCard(item, state, trace) {
  const { step, stepIndex, stepEvents } = item;
  const target = { type: 'moment', id: String(stepIndex) };
  const isSelected = sameTarget(state.selection, target);
  const isPinned = sameTarget(state.pinned, target);
  const isTraced = trace.moments.has(String(stepIndex));
  const tone = resolveMomentTone({ isSelected, isPinned, isTraced, hasPayload: stepEvents.length > 0 });
  const participantCount = Object.keys(step?.participants || {}).length;
  const axisTotals = axisTotalsFromEvents(stepEvents);

  return `
    <article class="moment-card tone-${tone}${isSelected ? ' active' : ''}${isPinned ? ' pinned' : ''}">
      <button class="moment-card-button" type="button" data-select-type="moment" data-select-id="${stepIndex}" title="${escapeHtml(step?.timestep_label || `Step ${stepIndex + 1}`)}">
        <span class="moment-card-status tone-${tone}" aria-hidden="true"></span>
        <span class="moment-card-content">
          <strong>${escapeHtml(step?.timestep_label || `Step ${stepIndex + 1}`)}</strong>
          <span class="moment-card-meta">
            <span>M ${escapeHtml(stepIndex + 1)}</span>
            <span>${escapeHtml(participantCount)} participants</span>
            <span>${escapeHtml(stepEvents.length)} events</span>
          </span>
          <span class="moment-card-axis">${renderMiniAxisStrip(axisTotals)}</span>
        </span>
      </button>
    </article>
  `;
}

function renderMiniAxisStrip(axisTotals) {
  const visible = axisSeries(axisTotals)
    .filter((entry) => !entry.isEmpty)
    .slice(0, 3);

  if (!visible.length) {
    return '<span class="mini-axis-chip">No payload</span>';
  }

  return visible.map((entry) => `<span class="mini-axis-chip">${escapeHtml(entry.label)}</span>`).join('');
}

function buildFocusModel(bundle, state, visibleStepRefs, allEvents, traceTarget) {
  const defaultTarget = visibleStepRefs[0] ? { type: 'moment', id: String(visibleStepRefs[0].stepIndex) } : null;
  const target = state.selection || state.pinned || traceTarget || defaultTarget;
  const explicit = Boolean(state.selection || state.pinned || traceTarget);

  if (!target) {
    return {
      label: 'No focus available',
      note: 'Select a moment, entity, or event to read its 5-axis profile.',
      scope: 'unspecified',
      eventCount: 0,
      targetType: 'none',
      axisTotals: Object.fromEntries(AXIS_ORDER.map((axisId) => [axisId, 0])),
    };
  }

  if (target.type === 'moment') {
    const stepIndex = Number(target.id);
    const step = bundle.structure?.timeline?.[stepIndex];
    const events = eventsForStep(allEvents, stepIndex);
    return {
      label: step?.timestep_label || `Step ${stepIndex + 1}`,
      note: explicit
        ? 'Focus rack is currently scoped to this moment.'
        : 'No explicit focus yet. Showing the first visible moment so the rack does not read as frozen.',
      scope: `Moment M${stepIndex + 1}`,
      eventCount: events.length,
      targetType: 'moment',
      axisTotals: axisTotalsFromEvents(events),
    };
  }

  if (target.type === 'entity') {
    const entityId = String(target.id);
    const momentScope = activeMomentScope(state);
    let events = allEvents.filter((event) => eventParticipants(event).has(entityId));
    let scope = 'Across visible case';
    if (momentScope !== null) {
      const scoped = events.filter((event) => eventStepIndex(event) === momentScope);
      if (scoped.length) {
        events = scoped;
        scope = `Within M${momentScope + 1}`;
      }
    }
    return {
      label: label(entityId),
      note: events.length
        ? 'Axes come from payload that touches this entity in the current scope.'
        : 'No payload touches this entity in the current scope.',
      scope,
      eventCount: events.length,
      targetType: 'entity',
      axisTotals: axisTotalsFromEvents(events),
    };
  }

  if (target.type === 'event') {
    const event = findEventById(allEvents, target.id);
    const roleCount = event ? eventParticipants(event).size : 0;
    return {
      label: event ? eventTitle(event) : `Event ${target.id}`,
      note: event
        ? `This focus rack is scoped to one payload event with ${roleCount} participant-role(s).`
        : 'Event reference could not be resolved.',
      scope: 'Single event',
      eventCount: event ? 1 : 0,
      targetType: 'event',
      axisTotals: axisTotalsFromEvents(event ? [event] : []),
    };
  }

  return {
    label: targetLabel(bundle, target),
    note: 'Focus rack could not resolve a specialized scope for this target.',
    scope: 'unspecified',
    eventCount: 0,
    targetType: target.type,
    axisTotals: Object.fromEntries(AXIS_ORDER.map((axisId) => [axisId, 0])),
  };
}

function activeMomentScope(state) {
  if (state?.selection?.type === 'moment') return Number(state.selection.id);
  if (state?.pinned?.type === 'moment') return Number(state.pinned.id);
  return null;
}

function axisTotalsFromEvents(events) {
  const totals = Object.fromEntries(AXIS_ORDER.map((axisId) => [axisId, 0]));
  events.forEach((event) => {
    const axisId = normalizeAxisId(event?.axis);
    if (!axisId) return;
    totals[axisId] += payloadMagnitude(event) || 1;
  });
  return totals;
}

function axisSeries(axisTotals) {
  const values = AXIS_ORDER.map((axisId) => Number(axisTotals[axisId] ?? 0));
  const maxValue = Math.max(0, ...values);

  return AXIS_ORDER.map((axisId) => {
    const value = Number(axisTotals[axisId] ?? 0);
    return {
      axisId,
      label: AXIS_LABELS[axisId] || axisId.toUpperCase(),
      tickText: value > 0 ? value.toFixed(1).replace(/\.0$/, '') : '0',
      width: maxValue > 0 ? (value / maxValue) * 100 : 0,
      isEmpty: value <= 0,
    };
  });
}

function resolveMomentTone({ isSelected, isPinned, isTraced, hasPayload }) {
  if (isSelected || isPinned) return 'focus';
  if (isTraced) return 'trace';
  if (hasPayload) return 'payload';
  return 'quiet';
}

function normalizeAxisId(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return AXIS_ORDER.includes(normalized) ? normalized : '';
}

function payloadMagnitude(event) {
  const payload = Array.isArray(event?.payload_bundle) ? event.payload_bundle : [];
  return payload.reduce((total, item) => total + Number(item?.magnitude ?? 0), 0);
}

function eventParticipants(event) {
  const ids = new Set();
  [
    event?.sourceParticipantId,
    participantFromAlpha(event?.alpha_source),
    event?.receivingParticipantId,
    participantFromAlpha(event?.alpha_receiving),
    event?.mediumParticipantId,
    participantFromAlpha(event?.alpha_medium),
  ].filter(Boolean).forEach((value) => ids.add(String(value)));
  return ids;
}

function findEventById(events, id) {
  const target = String(id);
  const counters = new Map();
  for (const event of events) {
    const stepIndex = eventStepIndex(event);
    const localIndex = counters.get(stepIndex) || 0;
    counters.set(stepIndex, localIndex + 1);
    if (`${stepIndex}:${localIndex}` === target) return event;
  }
  return null;
}

function eventStepIndex(event) {
  return Number(event?.timestep_idx ?? event?.timestep_index ?? event?.timestep ?? 0);
}

function renderEmptyFilteredState(filterState) {
  const active = filterState.items.filter((item) => item.effective).map((item) => item.label);
  const waiting = filterState.items.filter((item) => item.requested && !item.available).map((item) => item.label);

  return `
    <div class="empty-state filter-empty-state">
      <strong>No moments match the current lens and filter settings.</strong>
      ${active.length ? `<div>Active filters: ${escapeHtml(active.join(' • '))}</div>` : ''}
      ${waiting.length ? `<div>Waiting filters: ${escapeHtml(waiting.join(' • '))}</div>` : ''}
      <div>Relax one filter or change focus to restore the wider field.</div>
    </div>
  `;
}
