import { escapeHtml, eventsForStep, label, participantFromAlpha } from '../app/helpers.js';
import { resolveFilterState } from '../app/filters.js';
import { activeTraceTarget, buildTraceIndex, sameTarget, targetLabel } from '../app/interaction-state.js';
import { lensDescription, lensLabel, normalizeLens } from '../app/lenses.js';
import { buildCorrespondenceHints } from '../app/correspondence.js';

export function renderContextPanel(container, state) {
  if (!container) return;

  const bundle = state.bundle;
  if (!bundle) {
    container.innerHTML = '<h2>Context Panel</h2><p>No case loaded.</p>';
    return;
  }

  const lens = normalizeLens(state.lens);
  const filterState = resolveFilterState(state.filters, { traceActive: Boolean(state.trace?.enabled) });
  const encoding = bundle.structure;
  const selection = state.selection;
  const pinned = state.pinned;
  const traceTarget = activeTraceTarget(state);
  const trace = buildTraceIndex(bundle, traceTarget);
  const focusTarget = selection || pinned || traceTarget;
  const correspondence = buildCorrespondenceHints(bundle, state);

  container.innerHTML = `
    <h2>Context Panel</h2>
    <div class="context-section">
      <div class="eyebrow">Current lens</div>
      <div class="detail-row"><span>Lens</span><strong>${escapeHtml(lensLabel(lens))}</strong></div>
      <p>${escapeHtml(lensDescription(lens))}</p>
    </div>
    ${renderFilterStatus(filterState)}
    ${renderInteractionStatus(bundle, state, trace)}
    ${renderCorrespondenceStatus(correspondence)}
    ${traceTarget ? renderProcessFlow(trace) : ''}
    ${focusTarget ? renderTargetDetails(bundle, focusTarget, selection, pinned, traceTarget, trace) : renderOverview(bundle, encoding, lens)}
  `;
}

function renderFilterStatus(filterState) {
  const active = filterState.items.filter((item) => item.effective);
  const waiting = filterState.items.filter((item) => item.requested && !item.available);

  return `
    <div class="context-section">
      <div class="eyebrow">Filters</div>
      ${active.length
        ? `
          <div class="artifact-grid">
            ${active.map((item) => `<span class="artifact-pill present">${escapeHtml(item.label)}</span>`).join('')}
          </div>
          <p>Filters reduce visible clutter only. They do not change case meaning.</p>
        `
        : '<p>No clutter-reduction filters are currently active.</p>'}
      ${waiting.length
        ? `
          <div class="artifact-grid">
            ${waiting.map((item) => `<span class="artifact-pill waiting">${escapeHtml(item.label)}</span>`).join('')}
          </div>
          <p>Waiting filters are armed but not yet effective. ${escapeHtml(waiting.map((item) => item.reason).join(' '))}</p>
        `
        : ''}
    </div>
  `;
}

function renderInteractionStatus(bundle, state, trace) {
  const selection = state.selection;
  const pinned = state.pinned;
  const traceTarget = activeTraceTarget(state);

  return `
    <div class="context-section">
      <div class="eyebrow">Interaction state</div>
      <div class="detail-row"><span>Inspect</span><strong>${escapeHtml(selection ? targetLabel(bundle, selection) : 'None')}</strong></div>
      <div class="detail-row"><span>Pin</span><strong>${escapeHtml(pinned ? targetLabel(bundle, pinned) : 'None')}</strong></div>
      <div class="detail-row"><span>Trace</span><strong>${escapeHtml(traceTarget ? targetLabel(bundle, traceTarget) : 'Off')}</strong></div>
      ${traceTarget ? `<p>Process trace currently spans ${escapeHtml(trace.counts.moments)} moment(s), ${escapeHtml(trace.counts.entities)} entit${trace.counts.entities === 1 ? 'y' : 'ies'}, and ${escapeHtml(trace.counts.events)} event(s).</p>` : '<p>Inspect a target, then pin or trace it explicitly.</p>'}
      ${renderInteractionActions(selection, pinned, traceTarget)}
    </div>
  `;
}

function renderCorrespondenceStatus(correspondence) {
  return `
    <div class="context-section">
      <div class="eyebrow">Correspondence hints</div>
      <div class="detail-row"><span>Basis</span><strong>${escapeHtml(correspondence.basisLabel)}</strong></div>
      <div class="detail-row"><span>State</span><strong>Provisional</strong></div>
      <p>${escapeHtml(correspondence.note)}</p>
      <div class="timeline-list correspondence-list">
        ${renderCorrespondenceItem('Source', correspondence.source)}
        ${renderCorrespondenceItem('Narrative', correspondence.narrative)}
        ${renderStructureItem(correspondence.structure)}
      </div>
    </div>
  `;
}

function renderCorrespondenceItem(name, item) {
  const matched = item.matchedTerms?.length
    ? `matched terms: ${item.matchedTerms.join(', ')}`
    : item.present
      ? 'artifact present, but no current term hint matched'
      : 'artifact missing';

  return `
    <div class="timeline-list-item correspondence-item ${escapeHtml(item.status)}">
      <strong>${escapeHtml(name)}</strong>
      <span>${escapeHtml(matched)}</span>
    </div>
  `;
}

function renderStructureItem(item) {
  return `
    <div class="timeline-list-item correspondence-item ${item.present ? 'anchored' : 'missing'}">
      <strong>Structure</strong>
      <span>${escapeHtml(item.note)}</span>
    </div>
  `;
}

function renderInteractionActions(selection, pinned, traceTarget) {
  const actions = [];

  if (selection) {
    actions.push(renderPinAction(selection, pinned));
    actions.push(renderTraceAction(selection, traceTarget, 'Trace inspect'));
  }

  if (!selection && pinned) {
    actions.push(renderPinAction(pinned, pinned, 'Unpin focus'));
    actions.push(renderTraceAction(pinned, traceTarget, 'Trace pin'));
  }

  if (traceTarget) {
    actions.push('<button type="button" class="context-action-button" data-trace-action="stop-trace">Stop trace</button>');
  }

  if (!actions.length) {
    return '';
  }

  return `<div class="context-action-row">${actions.join('')}</div>`;
}

function renderPinAction(target, pinned, labelText = null) {
  const isPinned = sameTarget(target, pinned);
  return `
    <button type="button" class="context-action-button" data-pin-type="${escapeHtml(target.type)}" data-pin-id="${escapeHtml(target.id)}">
      ${escapeHtml(labelText || (isPinned ? 'Unpin inspect' : 'Pin inspect'))}
    </button>
  `;
}

function renderTraceAction(target, traceTarget, labelText) {
  const tracingThis = sameTarget(target, traceTarget);
  return `
    <button type="button" class="context-action-button" data-trace-action="start-trace" data-trace-type="${escapeHtml(target.type)}" data-trace-id="${escapeHtml(target.id)}">
      ${escapeHtml(tracingThis ? `${labelText} (active)` : labelText)}
    </button>
  `;
}

function renderProcessFlow(trace) {
  return `
    <div class="context-section">
      <div class="eyebrow">Process flow</div>
      <div class="timeline-list">
        ${trace.flow.length
          ? trace.flow
              .map(
                (item) => `
                  <div class="timeline-list-item${item.isAnchor ? ' flow-anchor' : ''}">
                    <strong>${escapeHtml(item.label)}</strong>
                    <span>${escapeHtml(item.isAnchor ? 'trace anchor' : 'process continuation')}</span>
                  </div>
                `,
              )
              .join('')
          : '<span class="muted">No process flow is currently traced.</span>'}
      </div>
    </div>
  `;
}

function renderOverview(bundle, encoding, lens) {
  const steps = Array.isArray(encoding?.timeline) ? encoding.timeline.length : 0;
  const participants = Array.isArray(encoding?.participants) ? encoding.participants.length : 0;
  const events = Array.isArray(encoding?.payload_events) ? encoding.payload_events.length : 0;
  const payloadMoments = Array.isArray(encoding?.timeline)
    ? encoding.timeline.filter((_step, index) => eventsForStep(Array.isArray(encoding.payload_events) ? encoding.payload_events : [], index).length).length
    : 0;

  return `
    <div class="context-section">
      <div class="eyebrow">Overview</div>
      <h3>${escapeHtml(bundle.identity.title)}</h3>
      <p>${escapeHtml(bundle.identity.synopsis || 'Look around the whole case first, then inspect, pin, and trace from explicit targets.')}</p>
    </div>
    <div class="context-section">
      <div class="detail-row"><span>Structural status</span><strong>${escapeHtml(bundle.status.structural)}</strong></div>
      <div class="detail-row"><span>Moments</span><strong>${escapeHtml(steps)}</strong></div>
      <div class="detail-row"><span>Participants</span><strong>${escapeHtml(participants)}</strong></div>
      ${lens === 'evidence' ? `
        <div class="detail-row"><span>Payload events</span><strong>${escapeHtml(events)}</strong></div>
        <div class="detail-row"><span>Payload moments</span><strong>${escapeHtml(payloadMoments)}</strong></div>
        <div class="detail-row"><span>Linkage state</span><strong>Provisional</strong></div>
      ` : ''}
    </div>
    ${renderProvenanceStatus(bundle)}
    <div class="context-section">
      <div class="eyebrow">Artifacts</div>
      <div class="artifact-grid">
        ${Object.entries(bundle.status.artifacts)
          .map(([key, value]) => `<span class="artifact-pill ${value ? 'present' : 'missing'}">${escapeHtml(key)}: ${value ? 'present' : 'missing'}</span>`)
          .join('')}
      </div>
    </div>
  `;
}

function renderProvenanceStatus(bundle) {
  const provenance = bundle.status?.provenance || {};
  const provenanceClass = String(provenance.class || 'unknown/unspecified');
  const solverCertified = Boolean(provenance.solverCertified);
  const solveArtifactPresent = Boolean(bundle.status?.artifacts?.solve || provenance.solveOutputPath);
  const solveRunRef = provenance.solveRunRef || null;
  const note = provenance.note || 'No provenance note recorded.';

  return `
    <div class="context-section">
      <div class="eyebrow">Provenance</div>
      <div class="detail-row"><span>Class</span><strong>${escapeHtml(provenanceClass)}</strong></div>
      <div class="detail-row"><span>Solver-certified</span><strong>${escapeHtml(solverCertified ? 'yes' : 'no')}</strong></div>
      <div class="detail-row"><span>Solve artifact</span><strong>${escapeHtml(solveArtifactPresent ? 'present' : 'absent')}</strong></div>
      <div class="detail-row"><span>Structure state</span><strong>${escapeHtml(bundle.status.structural)}</strong></div>
      ${solveRunRef ? `<div class="detail-row"><span>Solve run ref</span><strong>${escapeHtml(solveRunRef)}</strong></div>` : ''}
      <p>${escapeHtml(note)}</p>
    </div>
  `;
}

function renderTargetDetails(bundle, target, selection, pinned, traceTarget, trace) {
  const prefix = sameTarget(target, selection) ? 'Inspect' : sameTarget(target, pinned) ? 'Pinned' : 'Focus';

  if (target.type === 'moment') {
    return renderMomentDetails(bundle, target, traceTarget, trace, prefix);
  }

  if (target.type === 'entity') {
    return renderEntityDetails(bundle, target, traceTarget, trace, prefix);
  }

  if (target.type === 'event') {
    return renderEventDetails(bundle, target, traceTarget, trace, prefix);
  }

  return '<p>Selection type not yet supported.</p>';
}

function renderMomentDetails(bundle, target, traceTarget, trace, prefix) {
  const encoding = bundle.structure;
  const stepIndex = Number(target.id);
  const step = encoding.timeline?.[stepIndex];
  const stepEvents = eventsForStep(Array.isArray(encoding.payload_events) ? encoding.payload_events : [], stepIndex);
  const participantIds = Object.keys(step?.participants || {});

  return `
    <div class="context-section">
      <div class="eyebrow">${escapeHtml(prefix)} moment</div>
      <h3>${escapeHtml(step?.timestep_label || `Step ${stepIndex + 1}`)}</h3>
      ${sameTarget(target, traceTarget) ? `<p>Process trace expands from this moment across ${escapeHtml(trace.counts.moments)} total moment(s).</p>` : ''}
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
}

function renderEntityDetails(bundle, target, traceTarget, trace, prefix) {
  const encoding = bundle.structure;
  const participantId = String(target.id);
  const appearances = (encoding.timeline || [])
    .map((step, stepIndex) => ({ step, stepIndex }))
    .filter(({ step }) => step?.participants?.[participantId]);

  return `
    <div class="context-section">
      <div class="eyebrow">${escapeHtml(prefix)} entity</div>
      <h3>${escapeHtml(label(participantId))}</h3>
      <p>Appears in ${escapeHtml(appearances.length)} moment(s). ${sameTarget(target, traceTarget) ? `Process trace follows its timeline across ${escapeHtml(trace.counts.moments)} traced moment(s).` : ''}</p>
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
}

function renderEventDetails(bundle, target, traceTarget, trace, prefix) {
  const encoding = bundle.structure;
  const [stepRaw, eventRaw] = String(target.id).split(':');
  const stepIndex = Number(stepRaw);
  const eventIndex = Number(eventRaw);
  const stepEvents = eventsForStep(Array.isArray(encoding.payload_events) ? encoding.payload_events : [], stepIndex);
  const event = stepEvents[eventIndex];
  const payload = Array.isArray(event?.payload_bundle) ? event.payload_bundle : [];
  const source = label(event?.sourceParticipantId ?? participantFromAlpha(event?.alpha_source));
  const receiving = label(event?.receivingParticipantId ?? participantFromAlpha(event?.alpha_receiving));
  const medium = label(event?.mediumParticipantId ?? participantFromAlpha(event?.alpha_medium));

  return `
    <div class="context-section">
      <div class="eyebrow">${escapeHtml(prefix)} event</div>
      <h3>${escapeHtml(source && receiving ? `${source} → ${receiving}` : 'Payload event')}</h3>
      ${sameTarget(target, traceTarget) ? `<p>Process trace follows this event through ${escapeHtml(trace.counts.moments)} moment(s) in the current flow.</p>` : ''}
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
                    <strong>${escapeHtml(item?.sigma || 'σ'i}</strong>
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
}
