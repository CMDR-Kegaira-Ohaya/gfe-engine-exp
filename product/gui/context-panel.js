import { escapeHtml, eventsForStep, label, participantFromAlpha } from '../app/helpers.js';

export function renderContextPanel(container, state) {
  if (!container) return;

  const bundle = state.bundle;
  if (!bundle) {
    container.innerHTML = '<h2>Context Panel</h2><p>No case loaded.</p>';
    return;
  }

  const encoding = bundle.structure;
  const selection = state.selection;

  if (!encoding || !selection) {
    const steps = Array.isArray(encoding?.timeline) ? encoding.timeline.length : 0;
    const participants = Array.isArray(encoding?.participants) ? encoding.participants.length : 0;
    container.innerHTML = `
      <h2>Context Panel</h2>
      <div class="context-section">
        <div class="eyebrow">Overview</div>
        <h3>${escapeHtml(bundle.identity.title)}</h3>
        <p>${escapeHtml(bundle.identity.synopsis || 'Look around the whole case first, then inspect moments, entities, and payload events.')}</p>
      </div>
      <div class="context-section">
        <div class="detail-row"><span>Structural status</span><strong>${escapeHtml(bundle.status.structural)}</strong></div>
        <div class="detail-row"><span>Moments</span><strong>${escapeHtml(steps)}</strong></div>
        <div class="detail-row"><span>Participants</span><strong>${escapeHtml(participants)}</strong></div>
      </div>
      <div class="context-section">
        <div class="eyebrow">Artifacts</div>
        <div class="artifact-grid">
          ${Object.entries(bundle.status.artifacts)
            .map(([key, value]) => `<span class="artifact-pill ${value ? 'present' : 'missing'}">${escapeHtml(key)}: ${value ? 'present' : 'missing'}</span>`)
            .join('')}
        </div>
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
        <h3>${escapeHtml(step?.timestep_label || `Step ${stepIndex + 1}`)}</h3>
      </div>
      <div class="context-section">
        <div class="detail-row"><span>Participants</span><strong>${escapeHtml(participantIds.length)}</strong></div>
        <div class="detail-row"><span>Payload events</span><strong>${escapeHtml(stepEvents.length)}</strong></div>
      </div>
      <div class="context-section">
        <div class="eyebrow">Present participants</div>
        <div class="artifact-grid">
          ${participantIds.length
            ? participantIds.map((participantId) => `<span class="artifact-pill present">${escapeHtml(label(participantId))}</span>`).join('')
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
        <h3>${escapeHtml(label(participantId))}</h3>
        <p>Appears in ${escapeHtml(appearances.length)} moment(s).</p>
      </div>
      <div class="context-section">
        <div class="eyebrow">Moments</div>
        <div class="timeline-list">
          ${appearances.length
            ? appearances.map(({ step, stepIndex }) => `<div class="timeline-list-item">${escapeHtml(stepIndex + 1)} — ${escapeHtml(step?.timestep_label || `Step ${stepIndex + 1}`)}</div>`).join('')
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
        <h3>${escapeHtml(source && receiving ? `${source} → ${receiving}` : 'Payload event')}</h3>
      </div>
      <div class="context-section">
        <div class="detail-row"><span>Axis</span><strong>${escapeHtml(label(event?.axis || 'unknown'))}</strong></div>
        <div class="detail-row"><span>Face</span><strong>${escapeHtml(label(event?.face || ''))}</strong></div>
        <div class="detail-row"><span>Interference</span><strong>${escapeHtml(label(event?.interference || ''))}</strong></div>
        <div class="detail-row"><span>Medium</span><strong>${escapeHtml(medium || '—')}</strong></div>
      </div>
      <div class="context-section">
        <div class="eyebrow">Payload bundle</div>
        <div class="timeline-list">
          ${payload.length
            ? payload
                .map(
                  (item) => `
                    <div class="timeline-list-item">
                      <strong>${escapeHtml(item?.sigma || 'σ')}</strong>
                      <span>${escapeHtml(label(item?.mode || 'mode'))}</span>
                      <span>${escapeHtml(label(item?.register || 'register'))}</span>
                      <span>${escapeHtml(item?.magnitude ?? '')}</span>
                    </div>
                  `,
                )
                .join('')
            : '<span class="muted">No payload bundle data recorded.</span>'}
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = '<h2>Context Panel</h2><p>Selection type not yet supported.</p>';
}
