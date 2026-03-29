import { escapeHtml, eventTitle, eventsForStep, label } from '../app/helpers.js';
import { resolveFilterState } from '../app/filters.js';
import { activeTraceTarget, buildTraceIndex, sameTarget, targetLabel } from '../app/interaction-state.js';
import { lensLabel, normalizeLens } from '../app/lenses.js';

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
  const selected = state.selection;
  const pinned = state.pinned;
  const traceTarget = activeTraceTarget(state);
  const trace = buildTraceIndex(bundle, traceTarget);
  const filterState = resolveFilterState(state.filters, { traceActive: Boolean(traceTarget) });
  const filters = filterState.effective;
  const momentsWithEvents = steps.reduce((count, _step, stepIndex) => count + (eventsForStep(events, stepIndex).length ? 1 : 0), 0);
  const visibleSteps = steps.map((step, stepIndex) => ({
    step,
    stepIndex,
    stepEvents: eventsForStep(events, stepIndex),
  })).filter(({ stepIndex, stepEvents }) => {
    if (filters.tracedFlowOnly && !trace.moments.has(String(stepIndex)) && trace.anchorMoment !== stepIndex) {
      return false;
    }

    if (filters.payloadOnly && !stepEvents.length) {
      return false;
    }

    return true;
  });

  container.innerHTML = `
    <div class="map-summary">
      <div>
        <div class="eyebrow">Whole map</div>
        <h2>${escapeHtml(bundle.identity.title)}</h2>
        <p>${escapeHtml(bundle.identity.synopsis || 'Structured case projection')}</p>
        <div class="summary-note-strip">
          <span class="badge badge-lens">lens: ${escapeHtml(lensLabel(lens))}</span>
          ${pinned ? `<span class="badge badge-pinned">pin: ${escapeHtml(targetLabel(bundle, pinned))}</span>` : ''}
          ${traceTarget ? `<span class="badge badge-traced">trace: ${escapeHtml(targetLabel(bundle, traceTarget))}</span>` : ''}
        </div>
      </div>
      <div class="summary-badges">
        <span class="badge">structure: ${escapeHtml(bundle.status.structural)}</span>
        <span class="badge">participants: ${escapeHtml(encoding.participants?.length ?? 0)}</span>
        <span class="badge">moments: ${escapeHtml(steps.length)}</span>
        <span class="badge">events: ${escapeHtml(events.length)}</span>
      </div>
    </div>

    ${renderLensStrip(lens, bundle, traceTarget, trace, momentsWithEvents, events.length, visibleSteps.length, filterState)}

    <div class="moment-grid lens-${lens}">
      ${visibleSteps.length
        ? visibleSteps.map(({ step, stepIndex, stepEvents }) => renderMomentCard(bundle, step, stepIndex, stepEvents, state, trace, lens, filters)).join('')
        : renderEmptyFilteredState(filterState)}
    </div>
  `;
}

function renderMomentCard(bundle, step, stepIndex, stepEvents, state, trace, lens, filters) {
  const selected = state.selection;
  const pinned = state.pinned;
  const momentTarget = { type: 'moment', id: String(stepIndex) };
  const isSelected = sameTarget(selected, momentTarget);
  const isPinned = sameTarget(pinned, momentTarget);
  const isTraced = trace.moments.has(String(stepIndex));
  const isAnchor = trace.anchorMoment === stepIndex;
  const participantIds = Object.keys(step?.participants || {});
  const muteForProcess = lens === 'process' && state.trace?.enabled && !isAnchor && !isTraced;
  const muteForEvidence = lens === 'evidence' && !stepEvents.length && !isSelected && !isPinned;
  const showSecondaryDetail = !filters.focusDetailsOnly || isSelected || isPinned || isAnchor;

  return `
    <section class="moment-card${isSelected ? ' active' : ''}${isPinned ? ' pinned' : ''}${isTraced ? ' traced' : ''}${isAnchor ? ' flow-anchor' : ''}${muteForProcess || muteForEvidence ? ' lens-muted' : ''}">
      <div class="moment-head">
        <div class="moment-head-main">
          <button class="moment-title" type="button" data-select-type="moment" data-select-id="${stepIndex}">
            ${escapeHtml(step?.timestep_label || `Step ${stepIndex + 1}`)}
          </button>
          <div class="moment-label-row">
            ${isAnchor
              ? '<span class="moment-flow-label anchor">Anchor</span>'
              : (isTraced ? '<span class="moment-flow-label">On flow</span>' : '')}
            ${lens === 'evidence'
              ? `<span class="moment-flow-label evidence${stepEvents.length ? ' present' : ' absent'}">${stepEvents.length ? `${stepEvents.length} payload event${stepEvents.length === 1 ? '' : 's'}` : 'no payload evidence'}</span>`
              : ''}
          </div>
        </div>
        <button class="pin-button" type="button" data-pin-type="moment" data-pin-id="${stepIndex}">
          ${isPinned ? 'Unpin' : 'Pin'}
        </button>
      </div>

      ${showSecondaryDetail
        ? `
          <div class="moment-block${lens === 'evidence' ? ' subdued-block' : ''}">
            <div class="moment-subhead">Participants</div>
            <div class="selectable-stack">
              ${participantIds.length
                ? participantIds
                    .map((participantId) => {
                      const entityTarget = { type: 'entity', id: String(participantId) };
                      const entityPinned = sameTarget(pinned, entityTarget);
                      const entitySelected = sameTarget(selected, entityTarget);
                      const showEntityTraceDetail = trace.entities.has(String(participantId)) && (entitySelected || entityPinned);

                      return `
                        <div class="selectable-row${entitySelected ? ' active' : ''}${entityPinned ? ' pinned' : ''}${showEntityTraceDetail ? ' trace-promoted' : ''}">
                          <button class="chip" type="button" data-select-type="entity" data-select-id="${escapeHtml(participantId)}">
                            ${escapeHtml(label(participantId))}
                          </button>
                          <button class="pin-button pin-button-small" type="button" data-pin-type="entity" data-pin-id="${escapeHtml(participantId)}">
                            ${entityPinned ? 'Unpin' : 'Pin'}
                          </button>
                        </div>
                      `;
                    })
                    .join('')
                : '<span class="muted">No participants in this moment.</span>'}
            </div>
          </div>

          <div class="moment-block${lens === 'evidence' && stepEvents.length ? ' evidence-block' : ''}">
            <div class="moment-subhead">Payload events</div>
            <div class="selectable-stack">
              ${stepEvents.length
                ? stepEvents
                    .map((event, eventIndex) => {
                      const eventId = `${stepIndex}:${eventIndex}`;
                      const eventTarget = { type: 'event', id: eventId };
                      const eventPinned = sameTarget(pinned, eventTarget);
                      const eventSelected = sameTarget(selected, eventTarget);
                      const showEventTraceDetail = trace.events.has(String(eventId)) && (eventSelected || eventPinned);

                      return `
                        <div class="selectable-row${eventSelected ? ' active' : ''}${eventPinned ? ' pinned' : ''}${showEventTraceDetail ? ' trace-promoted' : ''}">
                          <button class="event-row" type="button" data-select-type="event" data-select-id="${eventId}">
                            ${escapeHtml(eventTitle(event))}
                          </button>
                          <button class="pin-button pin-button-small" type="button" data-pin-type="event" data-pin-id="${eventId}">
                            ${eventPinned ? 'Unpin' : 'Pin'}
                          </button>
                        </div>
                      `;
                    })
                    .join('')
                : '<span class="muted">No payload events in this moment.</span>'}
            </div>
          </div>
        `
        : `
          <div class="moment-compact-summary">
            <div class="compact-pill">participants: ${escapeHtml(participantIds.length)}</div>
            <div class="compact-pill">payload events: ${escapeHtml(stepEvents.length)}</div>
            <div class="compact-note">Secondary detail hidden until this moment is inspected or pinned.</div>
          </div>
        `}
    </section>
  `;
}

function renderLensStrip(lens, bundle, traceTarget, trace, momentsWithEvents, totalEvents, visibleMoments, filterState) {
  const effectiveFilters = filterState.items.filter((item) => item.effective).map((item) => item.label);
  const waitingFilters = filterState.items.filter((item) => item.requested && !item.available).map((item) => item.label);

  if (lens === 'process') {
    return `
      <div class="flow-strip lens-strip process-strip">
        <div class="eyebrow">Process flow</div>
        <div class="flow-pill-row">
          ${traceTarget
            ? (trace.flow.length
                ? trace.flow.map((item) => `<span class="flow-pill${item.isAnchor ? ' anchor' : ''}">${escapeHtml(item.label)}</span>`).join('')
                : '<span class="muted">No traced process flow yet.</span>')
            : '<span class="muted">Trace a target to reveal process continuity through moments.</span>'}
        </div>
        ${renderFilterNotes(effectiveFilters, waitingFilters, visibleMoments)}
      </div>
    `;
  }

  if (lens === 'evidence') {
    return `
      <div class="flow-strip lens-strip evidence-strip">
        <div class="eyebrow">Evidence view</div>
        <div class="flow-pill-row">
          <span class="flow-pill evidence ${bundle.status.artifacts.source ? 'present' : 'missing'}">source: ${bundle.status.artifacts.source ? 'present' : 'missing'}</span>
          <span class="flow-pill evidence ${bundle.status.artifacts.narrative ? 'present' : 'missing'}">narrative: ${bundle.status.artifacts.narrative ? 'present' : 'missing'}</span>
          <span class="flow-pill evidence present">payload moments: ${escapeHtml(momentsWithEvents)}</span>
          <span class="flow-pill evidence ${totalEvents ? 'present' : 'missing'}">payload events: ${escapeHtml(totalEvents)}</span>
          <span class="flow-pill evidence provisional">links: provisional</span>
        </div>
        <div class="lens-strip-note">Evidence lens shows what artifacts and payload-bearing moments are available now. It does not claim solved correspondence beyond what exists.</div>
        ${renderFilterNotes(effectiveFilters, waitingFilters, visibleMoments)}
      </div>
    `;
  }

  if (!traceTarget && !filterState.counts.requested) {
    return '';
  }

  return `
    <div class="flow-strip lens-strip structure-strip">
      <div class="eyebrow">Structure view</div>
      <div class="flow-pill-row">
        ${traceTarget
          ? (trace.flow.length
              ? trace.flow.map((item) => `<span class="flow-pill${item.isAnchor ? ' anchor' : ''}">${escapeHtml(item.label)}</span>`).join('')
              : '<span class="muted">No traced process flow yet.</span>')
          : '<span class="muted">Whole arrangement remains primary. Trace appears here quietly when active.</span>'}
      </div>
      ${renderFilterNotes(effectiveFilters, waitingFilters, visibleMoments)}
    </div>
  `;
}

function renderFilterNotes(effectiveFilters, waitingFilters, visibleMoments) {
  const lines = [];

  if (effectiveFilters.length) {
    lines.push(`Active filters: ${effectiveFilters.join(' • ')}. Visible moments: ${visibleMoments}.`);
  }

  if (waitingFilters.length) {
    lines.push(`Waiting: ${waitingFilters.join(' • ')}.`);
  }

  if (!lines.length) {
    return '';
  }

  return `<div class="lens-strip-note">${escapeHtml(lines.join(' '))}</div>`;
}

function renderEmptyFilteredState(filterState) {
  const effective = filterState.items.filter((item) => item.effective).map((item) => item.label);
  const waiting = filterState.items.filter((item) => item.requested && !item.available).map((item) => item.label);

  return `
    <div class="empty-state filter-empty-state">
      <strong>No moments match the current lens and filter settings.</strong>
      ${effective.length ? `<div>Active filters: ${escapeHtml(effective.join(' • '))}</div>` : ''}
      ${waiting.length ? `<div>Waiting filters: ${escapeHtml(waiting.join(' • '))}</div>` : ''}
      <div>Relax one filter or change focus to restore the wider field.</div>
    </div>
  `;
}
