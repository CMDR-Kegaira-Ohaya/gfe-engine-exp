function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function label(value) {
  return String(value ?? '').trim().replaceAll('_', ' ');
}

function eventTitle(event) {
  const source = label(event?.sourceParticipantId ?? participantFromAlpha(event?.alpha_source));
  const receiving = label(event?.receivingParticipantId ?? participantFromAlpha(event?.alpha_receiving));
  if (source && receiving) return `${source} → ${receiving}`;
  if (source) return `${source} emits`;
  if (receiving) return `${receiving} receives`;
  return 'Payload event';
}

function participantFromAlpha(alpha) {
  const raw = String(alpha ?? '').trim();
  if (!raw) return '';
  return raw.split('.')[0];
}

function eventsForStep(events, stepIndex) {
  return events.filter((event) => Number(event?.timestep_idx ?? event?.timestep_index ?? event?.timestep ?? 0) === stepIndex);
}

export function renderSpecifiedView(atlasEl, timelineEl, state) {
  if (!atlasEl || !timelineEl) return;

  const bundle = state.bundle;
  if (!bundle) {
    atlasEl.textContent = 'No structure available for this case.';
    timelineEl.textContent = 'No timeline available for this case.';
    return;
  }

  const encoding = bundle.structure;
  if (!encoding) {
    atlasEl.innerHTML = '<div class="empty-state">This case does not yet expose structural data.</div>';
    timelineEl.innerHTML = '<div class="empty-state">No timeline available for this case.</div>';
    return;
  }

  const steps = Array.isArray(encoding.timeline) ? encoding.timeline : [];
  const events = Array.isArray(encoding.payload_events) ? encoding.payload_events : [];
  const selected = state.selection;

  atlasEl.innerHTML = `
    <div class="specified-summary">
      <div>
        <div class="eyebrow">Whole Map</div>
        <h2>${esc(bundle.identity.title)}</h2>
        <p>${esc(bundle.identity.synopsis || encoding.description || 'Structured case view')}</p>
      </div>
      <div class="summary-badges">
        <span class="badge">structure: ${esc(bundle.status.structural)}</span>
        <span class="badge">participants: ${esc(encoding.participants?.length ?? 0)}</span>
        <span class="badge">moments: ${esc(steps.length)}</span>
        <span class="badge">events: ${esc(events.length)}</span>
      </div>
    </div>
    <div class="moment-grid">
      ${steps.map((step, stepIndex) => {
        const participantIds = Object.keys(step?.participants || {});
        const stepEvents = eventsForStep(events, stepIndex);
        const active = selected?.type === 'moment' && Number(selected.id) === stepIndex ? ' active' : '';
        return `
          <section class="moment-card${active}">
            <button class="moment-title" type="button" data-select-type="moment" data-select-id="${stepIndex}">
              ${esc(step?.timestep_label || `Step ${stepIndex + 1}`)}
            </button>
            <div class="moment-block">
              <div class="moment-subhead">Participants</div>
              <div class="chip-row">
                ${participantIds.length
                  ? participantIds.map((participantId) => `
                      <button class="chip" type="button" data-select-type="entity" data-select-id="${esc(participantId)}">
                        ${esc(label(participantId))}
                      </button>
                    `).join('')
                  : '<span class="muted">No participants in this moment.</span>'}
              </div>
            </div>
            <div class="moment-block">
              <div class="moment-subhead">Payload events</div>
              <div class="event-list">
                ${stepEvents.length
                  ? stepEvents.map((event, eventIndex) => `
                      <button class="event-row" type="button" data-select-type="event" data-select-id="${stepIndex}:${eventIndex}">
                        ${esc(eventTitle(event))}
                      </button>
                    `).join('')
                  : '<span class="muted">No payload events in this moment.</span>'}
              </div>
            </div>
          </section>
        `;
      }).join('')}
    </div>
  `;

  timelineEl.innerHTML = `
    <div class="timeline-strip">
      ${steps.length
        ? steps.map((step, stepIndex) => {
            const active = selected?.type === 'moment' && Number(selected.id) === stepIndex ? ' active' : '';
            return `
              <button class="timeline-step${active}" type="button" data-select-type="moment" data-select-id="${stepIndex}">
                <span class="timeline-index">${stepIndex + 1}</span>
                <span class="timeline-label">${esc(step?.timestep_label || `Step ${stepIndex + 1}`)}</span>
              </button>
            `;
          }).join('')
        : '<div class="empty-state">No timeline available for this case.</div>'}
    </div>
  `;
}
