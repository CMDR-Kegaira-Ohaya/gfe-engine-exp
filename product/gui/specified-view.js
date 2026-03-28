import { escapeHtml, eventTitle, eventsForStep, label } from '../app/helpers.js';

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

  container.innerHTML = `
    <div class="map-summary">
      <div>
        <div class="eyebrow">Whole map</div>
        <h2>${escapeHtml(bundle.identity.title)}</h2>
        <p>${escapeHtml(bundle.identity.synopsis || 'Structured case projection')}</p>
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
        const active = selected?.type === 'moment' && Number(selected.id) === stepIndex ? ' active' : '';
        const participantIds = Object.keys(step?.participants || {});
        const stepEvents = eventsForStep(events, stepIndex);

        return `
          <section class="moment-card${active}">
            <button class="moment-title" type="button" data-select-type="moment" data-select-id="${stepIndex}">
              ${escapeHtml(step?.timestep_label || `Step ${stepIndex + 1}`)}
            </button>

            <div class="moment-block">
              <div class="moment-subhead">Participants</div>
              <div class="chip-row">
                ${participantIds.length
                  ? participantIds
                      .map(
                        (participantId) => `
                          <button class="chip" type="button" data-select-type="entity" data-select-id="${escapeHtml(participantId)}">
                            ${escapeHtml(label(participantId))}
                          </button>
                        `,
                      )
                      .join('')
                  : '<span class="muted">No participants in this moment.</span>'}
              </div>
            </div>

            <div class="moment-block">
              <div class="moment-subhead">Payload events</div>
              <div class="event-list">
                ${stepEvents.length
                  ? stepEvents
                      .map(
                        (event, eventIndex) => `
                          <button class="event-row" type="button" data-select-type="event" data-select-id="${stepIndex}:${eventIndex}">
                            ${escapeHtml(eventTitle(event))}
                          </button>
                        `,
                      )
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
