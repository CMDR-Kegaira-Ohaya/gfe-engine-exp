import { escapeHtml, eventTitle, eventsForStep, label } from '../app/helpers.js';
import { activeTraceTarget, buildTraceIndex, sameTarget, targetLabel } from '../app/interaction-state.js';

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

  const steps = Array.isArray(encoding.timeline) ? encoding.timeline : [];
  const events = Array.isArray(encoding.payload_events) ? encoding.payload_events : [];
  const selected = state.selection;
  const pinned = state.pinned;
  const traceTarget = activeTraceTarget(state);
  const trace = buildTraceIndex(bundle, traceTarget);

  container.innerHTML = `
    <div class="map-summary">
      <div>
        <div class="eyebrow">Whole map</div>
        <h2>${escapeHtml(bundle.identity.title)}</h2>
        <p>${escapeHtml(bundle.identity.synopsis || 'Structured case projection')}</p>
        <div class="summary-note-strip">
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

    <div class="moment-grid">
      ${steps.map((step, stepIndex) => {
        const momentTarget = { type: 'moment', id: String(stepIndex) };
        const isSelected = sameTarget(selected, momentTarget);
        const isPinned = sameTarget(pinned, momentTarget);
        const isTraced = trace.moments.has(String(stepIndex));
        const participantIds = Object.keys(step?.participants || {});
        const stepEvents = eventsForStep(events, stepIndex);

        return `
          <section class="moment-card${isSelected ? ' active' : ''}${isPinned ? ' pinned' : ''}${isTraced ? ' traced' : ''}">
            <div class="moment-head">
              <button class="moment-title" type="button" data-select-type="moment" data-select-id="${stepIndex}">
                ${escapeHtml(step?.timestep_label || `Step ${stepIndex + 1}`)}
              </button>
              <button class="pin-button" type="button" data-pin-type="moment" data-pin-id="${stepIndex}">
                ${isPinned ? 'Unpin' : 'Pin'}
              </button>
            </div>

            <div class="moment-block">
              <div class="moment-subhead">Participants</div>
              <div class="selectable-stack">
                ${participantIds.length
                  ? participantIds
                      .map((participantId) => {
                        const entityTarget = { type: 'entity', id: String(participantId) };
                        const entityPinned = sameTarget(pinned, entityTarget);
                        const entitySelected = sameTarget(selected, entityTarget);
                        const entityTraced = trace.entities.has(String(participantId));

                        return `
                          <div class="selectable-row${entitySelected ? ' active' : ''}${entityPinned ? ' pinned' : ''}${entityTraced ? ' traced' : ''}">
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

            <div class="moment-block">
              <div class="moment-subhead">Payload events</div>
              <div class="selectable-stack">
                ${stepEvents.length
                  ? stepEvents
                      .map((event, eventIndex) => {
                        const eventId = `${stepIndex}:${eventIndex}`;
                        const eventTarget = { type: 'event', id: eventId };
                        const eventPinned = sameTarget(pinned, eventTarget);
                        const eventSelected = sameTarget(selected, eventTarget);
                        const eventTraced = trace.events.has(String(eventId));

                        return `
                          <div class="selectable-row${eventSelected ? ' active' : ''}${eventPinned ? ' pinned' : ''}${eventTraced ? ' traced' : ''}">
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
          </section>
        `;
      }).join('')}
    </div>
  `;
}
