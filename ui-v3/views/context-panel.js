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

function participantFromAlpha(alpha) {
  const raw = String(alpha ?? '').trim();
  if (!raw) return '';
  return raw.split('.')[0];
}

function eventsForStep(events, stepIndex) {
  return events.filter((event) => Number(event?.timestep_idx ?? event?.timestep_index ?? event?.timestep ?? 0) === stepIndex);
}

export function renderContextPanel(container, state) {
  if (!container) return;

  const bundle = state.bundle;
  if (!bundle) {
    container.innerHTML = '<h2>Context Panel</h2><p>No case loaded.</p>';
    return;
  }

  const encoding = bundle.structure;
  const selection = state.selection;
  const artifacts = bundle.status.artifacts;

  if (!encoding || !selection) {
    const steps = Array.isArray(encoding?.timeline) ? encoding.timeline.length : 0;
    const participants = Array.isArray(encoding?.participants) ? encoding.participants.length : 0;
    container.innerHTML = `
      <h2>Context Panel</h2>
      <div class="context-section">
        <div class="eyebrow">Overview</div>
        <h3>${esc(bundle.identity.title)}</h3>
        <p>${esc(bundle.identity.synopsis || 'Look around the transformed case as a whole, then inspect moments, entities, and events.')}</p>
      </div>
      <div class="context-section">
        <div class="detail-row"><span>Structural status</span><strong>${esc(bundle.status.structural)}</strong></div>
        <div class="detail-row"><span>Moments</span><strong>${esc(steps)}</strong></div>
        <div class="detail-row"><span>Participants</span><strong>${esc(participants)}</strong></div>
      </div>
      <div class="context-section">
        <div class="eyebrow">Artifacts</div>
        <div class="artifact-grid">
          ${Object.entries(artifacts).map(([key, value]) => `<span class="artifact-pill ${value ? 'present' : 'missing'}">${esc(key)}: ${value ? 'present' : 'missing'}</span>`).join('')}
        </div>
      </div>
      <div class="context-section">
        <div class="eyebrow">Use</div>
        <p>The center shows the whole structured case. The documents below stay secondary, so you can compare source and narrative without losing orientation.</p>
      </div>
    `;
    return;
  }

  if (selection.type === 'moment') {
    const stepIndex = Number(selection.id);
    const step = encoding.timeline?.[stepIndex];
    const stepEvents = eventsForStep(Array.isArray(encoding.payload_events) ? encoding.payload_events : [], stepIndex);
    const participantIds = Object.keys(step?.participants || {});

    container.innerHTML = `
      <h2>Context Panel</h2>
      <div class="context-section">
        <div class="eyebrow">Moment</div>
        <h3>${esc(step?.timestep_label || `Step ${stepIndex + 1}`)}</h3>
      </div>
      <div class="context-section">
        <div class="detail-row"><span>Participants</span><strong>${esc(participantIds.length)}</strong></div>
        <div class="detail-row"><span>Payload events</span><strong>${esc(stepEvents.length)}</strong></div>
      </div>
      <div class="context-section">
        <div class="eyebrow">Present participants</div>
        <div class="artifact-grid">
          ${participantIds.length
            ? participantIds.map((participantId) => `<span class="artifact-pill present">${esc(label(participantId))}</span>`).join('')
            : '<span class="muted">No participants recorded for this moment.</span>'}
        </div>
      </div>
    `;
    return;
  }

  if (selection.type === 'entity') {
    const participantId = selection.id;
    const appearances = (encoding.timeline || [])
      .map((step, stepIndex) => ({ step, stepIndex }))
      .filter(({ step }) => step?.participants?.[participantId]);

    container.innerHTML = `
      <h2>Context Panel</h2>
      <div class="context-section">
        <div class="eyebrow">Entity</div>
        <h3>${esc(label(participantId))}</h3>
        <p>Appears in ${esc(appearances.length)} moment(s).</p>
      </div>
      <div class="context-section">
        <div class="eyebrow">Moments</div>
        <div class="timeline-list">
          ${appearances.length
            ? appearances.map(({ step, stepIndex }) => `<div class="timeline-list-item">${esc(stepIndex + 1)} — ${esc(step?.timestep_label || `Step ${stepIndex + 1}`)}</div>`).join('')
            : '<span class="muted">This entity does not appear in the current structure.</span>'}
        </div>
      </div>
    `;
    return;
  }

  if (selection.type === 'event') {
    const [stepRaw, eventRaw] = String(selection.id).split(':');
    const stepIndex = Number(stepRaw);
    const eventIndex = Number(eventRaw);
    const stepEvents = eventsForStep(Array.isArray(encoding.payload_events) ? encoding.payload_events : [], stepIndex);
    const event = stepEvents[eventIndex];
    const payload = Array.isArray(event?.payload_bundle) ? event.payload_bundle : [];
    const source = label(event?.sourceParticipantId ?? participantFromAlpha(event?.alpha_source));
    const receiving = label(event?.receivingParticipantId ?? participantFromAlpha(event?.alpha_receiving));
    const medium = label(event?.mediumParticipantId ?? participantFromAlpha(event?.alpha_medium));

    container.innerHTML = `
      <h2>Context Panel</h2>
      <div class="context-section">
        <div class="eyebrow">Payload event</div>
        <h3>${esc(source && receiving ? `${source} → ${receiving}` : 'Payload event')}</h3>
      </div>
      <div class="context-section">
        <div class="detail-row"><span>Axis</span><strong>${esc(label(event?.axis || 'unknown'))}</strong></div>
        <div class="detail-row"><span>Face</span><strong>${esc(label(event?.face || ''))}</strong></div>
        <div class="detail-row"><span>Interference</span><strong>${esc(label(event?.interference || ''))}</strong></div>
        <div class="detail-row"><span>Medium</span><strong>${esc(medium || '—')}</strong></div>
      </div>
      <div class="context-section">
        <div class="eyebrow">Payload bundle</div>
        <div class="timeline-list">
          ${payload.length
            ? payload.map((item) => `
                <div class="timeline-list-item">
                  <strong>${esc(item?.sigma || 'σ')}</strong>
                  <span>${esc(label(item?.mode || 'mode'))}</span>
                  <span>${esc(label(item?.register || 'register'))}</span>
                  <span>${esc(item?.magnitude ?? '')}</span>
                </div>
              `).join('')
            : '<span class="muted">No payload bundle data recorded.</span>'}
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = '<h2>Context Panel</h2><p>Selection type not yet supported.</p>';
}
