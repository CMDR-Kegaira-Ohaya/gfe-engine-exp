
import { escapeHtml, label, participantFromAlpha } from '../app/helpers.js';
import { resolveFilterState } from '../app/filters.js';
import { activeTraceTarget, sameTarget } from '../app/interaction-state.js';
import { lensDescription, lensLabel, normalizeLens } from '../app/lenses.js';
import { buildCorrespondenceHints } from '../app/correspondence.js';
import {
  buildCaseGraph,
  canonAxisLabel,
  entityHistory,
  entityMomentExposure,
  eventRefsForMoment,
  eventRoleSummary,
  findEventRef,
} from '../app/case-graph.js';

export function renderContextPanel(container, state) {
  if (!container) return;

  const bundle = state.bundle;
  if (!bundle) {
    container.innerHTML = '<h2>Inspector</h2><p>No case loaded.</p>';
    return;
  }

  const lens = normalizeLens(state.lens);
  const graph = buildCaseGraph(bundle, state);
  const filterState = resolveFilterState(state.filters, { traceActive: Boolean(state.trace?.enabled) });
  const correspondence = buildCorrespondenceHints(bundle, state);
  const traceTarget = activeTraceTarget(state);
  const focusTarget = state.selection?.type === 'moment' && state.pinned?.type === 'entity'
    ? state.pinned
    : state.selection || state.pinned || traceTarget || null;

  container.innerHTML = `
    <h2>Inspector</h2>
    <div class="context-section">
      <div class="eyebrow">Current lens</div>
      <div class="detail-row"><span>Lens</span><strong>${escapeHtml(lensLabel(lens))}</strong></div>
      <p>${escapeHtml(lensDescription(lens))}</p>
    </div>
    ${renderFilterStatus(filterState)}
    ${renderMomentStatus(graph)}
    ${renderCorrespondenceStatus(correspondence)}
    ${focusTarget ? renderFocusedTarget(bundle, graph, state, focusTarget, traceTarget) : renderOverview(bundle, graph)}
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
        ? `<p>${escapeHtml(waiting.map((item) => item.reason).join(' '))}</p>`
        : ''}
    </div>
  `;
}

function renderMomentStatus(graph) {
  const current = graph.moments.find((moment) => moment.momentIndex === graph.activeMoment);
  return `
    <div class="context-section">
      <div class="eyebrow">Current moment</div>
      <div class="detail-row"><span>Selected time</span><strong>${escapeHtml(current?.label || `Step ${graph.activeMoment + 1}`)}</strong></div>
      <div class="detail-row"><span>Participants</span><strong>${escapeHtml(graph.activeEntities.size)}</strong></div>
      <div class="detail-row"><span>Payload events</span><strong>${escapeHtml(graph.activeEventRefs.length)}</strong></div>
      ${graph.traceTarget
        ? `<p>Trace spans the map and the strip together. Anchor moment: ${escapeHtml(graph.trace.anchorMoment === null ? 'none' : `M${graph.trace.anchorMoment + 1}`)}.</p>`
        : '<p>Select moments on the strip to reshape the map without replacing the current entity field.</p>'}
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
    </div>
  `;
}

function renderOverview(bundle, graph) {
  return `
    <div class="context-section">
      <div class="eyebrow">Overview</div>
      <h3>${escapeHtml(bundle.identity.title)}</h3>
      <p>${escapeHtml(bundle.identity.synopsis || 'Select an entity on the map to inspect its current rack, timeline, and payload effects.')}</p>
    </div>
    <div class="context-section">
      <div class="detail-row"><span>Structure status</span><strong>${escapeHtml(bundle.status.structural)}</strong></div>
      <div class="detail-row"><span>Provenance class</span><strong>${escapeHtml(bundle.status.provenance?.class || 'unknown/unspecified')}</strong></div>
      <div class="detail-row"><span>Solver-certified</span><strong>${escapeHtml(bundle.status.provenance?.solverCertified ? 'yes' : 'no')}</strong></div>
      <div class="detail-row"><span>Solve artifact</span><strong>${escapeHtml(bundle.status.artifacts?.solve ? 'present' : 'absent')}</strong></div>
    </div>
    <div class="context-section">
      <div class="eyebrow">Entities in the current moment</div>
      <div class="artifact-grid">
        ${graph.nodes
          .filter((node) => node.isPresent)
          .map((node) => `<button type="button" class="artifact-pill present inspector-chip-button" data-select-type="entity" data-select-id="${escapeHtml(node.entityId)}">${escapeHtml(node.label)}</button>`)
          .join('')}
      </div>
    </div>
  `;
}

function renderFocusedTarget(bundle, graph, state, target, traceTarget) {
  if (target.type === 'entity') {
    return renderEntityFocus(bundle, graph, state, target, traceTarget);
  }

  if (target.type === 'moment') {
    return renderMomentFocus(bundle, graph, state, target, traceTarget);
  }

  if (target.type === 'event') {
    return renderEventFocus(bundle, graph, state, target, traceTarget);
  }

  return '<div class="context-section"><p>Selection type not yet supported.</p></div>';
}

function renderEntityFocus(bundle, graph, state, target, traceTarget) {
  const entityId = String(target.id);
  const exposure = entityMomentExposure(bundle, entityId, graph.activeMoment);
  const history = entityHistory(bundle, entityId);
  const currentNode = graph.nodes.find((node) => node.entityId === entityId);

  return `
    <div class="context-section">
      <div class="eyebrow">${escapeHtml(sameTarget(target, state.selection) ? 'Inspect' : sameTarget(target, state.pinned) ? 'Pinned' : 'Focus')} entity</div>
      <h3>${escapeHtml(label(entityId))}</h3>
      <div class="detail-row"><span>Current moment</span><strong>${escapeHtml(exposure.label)}</strong></div>
      <div class="detail-row"><span>Present now</span><strong>${escapeHtml(exposure.present ? 'yes' : 'no')}</strong></div>
      <div class="detail-row"><span>Payload effects now</span><strong>${escapeHtml(exposure.currentEvents.length)}</strong></div>
      ${renderActionRow(target, state.pinned, traceTarget)}
    </div>

    <div class="context-section">
      <div class="eyebrow">Current canon rack</div>
      <p>Moment-scoped canonical exposure for this entity at the selected time.</p>
      <div class="focus-rack">
        ${renderAxisRack(exposure.rack.axisEntries)}
      </div>
      <div class="detail-row"><span>Total magnitude</span><strong>${escapeHtml(exposure.rack.totalMagnitude.toFixed(2))}</strong></div>
    </div>

    <div class="context-section">
      <div class="eyebrow">Role balance</div>
      <div class="artifact-grid">
        <span class="artifact-pill ${exposure.rack.byRole.source ? 'present' : 'waiting'}">source: ${escapeHtml(exposure.rack.byRole.source.toFixed(2))}</span>
        <span class="artifact-pill ${exposure.rack.byRole.receiving ? 'present' : 'waiting'}">receiving: ${escapeHtml(exposure.rack.byRole.receiving.toFixed(2))}</span>
        <span class="artifact-pill ${exposure.rack.byRole.medium ? 'present' : 'waiting'}">medium: ${escapeHtml(exposure.rack.byRole.medium.toFixed(2))}</span>
      </div>
      ${currentNode?.exposure?.peers?.length
        ? `<p>Current relations: ${escapeHtml(currentNode.exposure.peers.map((peer) => peer.label).join(' • '))}</p>`
        : '<p>No active relation line touches this entity in the selected moment.</p>'}
    </div>

    <div class="context-section">
      <div class="eyebrow">Payload effects in this moment</div>
      <div class="timeline-list">
        ${exposure.currentEvents.length
          ? exposure.currentEvents.map((eventRef) => renderEventRefRow(eventRef)).join('')
          : '<span class="muted">No current payload effects touch this entity.</span>'}
      </div>
    </div>

    <div class="context-section">
      <div class="eyebrow">Timeline presence</div>
      <div class="timeline-list">
        ${history.length
          ? history.map((item) => `
            <button type="button" class="timeline-list-item inspector-moment-button${item.momentIndex === graph.activeMoment ? ' flow-anchor' : ''}" data-select-type="moment" data-select-id="${item.momentIndex}">
              <strong>M${item.momentIndex + 1}</strong>
              <span>${escapeHtml(item.label)}</span>
              <span>events: ${escapeHtml(item.eventCount)}</span>
            </button>
          `).join('')
          : '<span class="muted">This entity does not appear in the available timeline.</span>'}
      </div>
    </div>
  `;
}

function renderMomentFocus(bundle, graph, state, target, traceTarget) {
  const momentIndex = Number(target.id);
  const moment = graph.moments.find((item) => item.momentIndex === momentIndex);
  const step = bundle.structure?.timeline?.[momentIndex] || null;
  const participants = Object.keys(step?.participants || {});
  const eventRefs = eventRefsForMoment(bundle, momentIndex);

  return `
    <div class="context-section">
      <div class="eyebrow">Inspect moment</div>
      <h3>${escapeHtml(moment?.label || `Step ${momentIndex + 1}`)}</h3>
      <div class="detail-row"><span>Participants</span><strong>${escapeHtml(participants.length)}</strong></div>
      <div class="detail-row"><span>Payload events</span><strong>${escapeHtml(eventRefs.length)}</strong></div>
      ${renderActionRow(target, state.pinned, traceTarget)}
    </div>

    <div class="context-section">
      <div class="eyebrow">Present entities</div>
      <div class="artifact-grid">
        ${participants.length
          ? participants.map((participantId) => `<button type="button" class="artifact-pill present inspector-chip-button" data-select-type="entity" data-select-id="${escapeHtml(participantId)}">${escapeHtml(label(participantId))}</button>`).join('')
          : '<span class="muted">No participants recorded for this moment.</span>'}
      </div>
    </div>

    <div class="context-section">
      <div class="eyebrow">Payload effects</div>
      <div class="timeline-list">
        ${eventRefs.length
          ? eventRefs.map((eventRef) => renderEventRefRow(eventRef)).join('')
          : '<span class="muted">No payload effects are recorded for this moment.</span>'}
      </div>
    </div>
  `;
}

function renderEventFocus(bundle, graph, state, target, traceTarget) {
  const eventRef = findEventRef(bundle, target.id);
  if (!eventRef) {
    return '<div class="context-section"><p>Payload event not found.</p></div>';
  }

  const roles = eventRoleSummary(eventRef.event);
  const payload = Array.isArray(eventRef.event?.payload_bundle) ? eventRef.event.payload_bundle : [];

  return `
    <div class="context-section">
      <div class="eyebrow">Inspect event</div>
      <h3>${escapeHtml(roles.source && roles.receiving ? `${roles.source} → ${roles.receiving}` : 'Payload event')}</h3>
      <div class="detail-row"><span>Moment</span><strong>${escapeHtml(`M${eventRef.stepIndex + 1}`)}</strong></div>
      <div class="detail-row"><span>Axis</span><strong>${escapeHtml(label(eventRef.event?.axis || 'unknown'))}</strong></div>
      <div class="detail-row"><span>Interference</span><strong>${escapeHtml(label(eventRef.event?.interference || 'unknown'))}</strong></div>
      <div class="detail-row"><span>Face</span><strong>${escapeHtml(label(eventRef.event?.face || 'unknown'))}</strong></div>
      ${renderActionRow(target, state.pinned, traceTarget)}
    </div>

    <div class="context-section">
      <div class="eyebrow">Roles</div>
      <div class="artifact-grid">
        ${roles.source ? `<button type="button" class="artifact-pill present inspector-chip-button" data-select-type="entity" data-select-id="${escapeHtml(normalizeRoleTarget(eventRef.event?.sourceParticipantId, eventRef.event?.alpha_source))}">source: ${escapeHtml(roles.source)}</button>` : ''}
        ${roles.receiving ? `<button type="button" class="artifact-pill present inspector-chip-button" data-select-type="entity" data-select-id="${escapeHtml(normalizeRoleTarget(eventRef.event?.receivingParticipantId, eventRef.event?.alpha_receiving))}">receiving: ${escapeHtml(roles.receiving)}</button>` : ''}
        ${roles.medium ? `<button type="button" class="artifact-pill waiting inspector-chip-button" data-select-type="entity" data-select-id="${escapeHtml(normalizeRoleTarget(eventRef.event?.mediumParticipantId, eventRef.event?.alpha_medium))}">medium: ${escapeHtml(roles.medium)}</button>` : ''}
      </div>
    </div>

    <div class="context-section">
      <div class="eyebrow">Payload bundle</div>
      <div class="timeline-list">
        ${payload.length
          ? payload.map((item) => `
            <div class="timeline-list-item">
              <strong>${escapeHtml(item?.sigma || 'Σ')}</strong>
              <span>${escapeHtml(label(item?.mode || 'mode'))}</span>
              <span>${escapeHtml(label(item?.register || 'register'))}</span>
              <span>${escapeHtml(Number(item?.magnitude ?? 0).toFixed(2))}</span>
            </div>
          `).join('')
          : '<span class="muted">No payload bundle data recorded.</span>'}
      </div>
    </div>
  `;
}

function renderAxisRack(axisEntries) {
  return axisEntries.map((entry) => `
    <div class="focus-axis-row">
      <div class="focus-axis-head">
        <strong>${escapeHtml(canonAxisLabel(entry.axisId))}</strong>
        <span>${escapeHtml(entry.magnitude.toFixed(2))}</span>
      </div>
      <div class="axis-rail-track compact-axis-track">
        <div class="axis-half left"><span class="axis-fill sigma-l" style="width:${entry.width}%"></span></div>
        <div class="axis-theta">Θ</div>
        <div class="axis-half right"><span class="axis-fill sigma-m" style="width:${entry.width}%"></span></div>
      </div>
    </div>
  `).join('');
}

function renderEventRefRow(eventRef) {
  const roles = eventRoleSummary(eventRef.event);
  const title = roles.source && roles.receiving ? `${roles.source} → ${roles.receiving}` : 'Payload event';

  return `
    <button
      type="button"
      class="timeline-list-item inspector-event-button"
      data-select-type="event"
      data-select-id="${escapeHtml(eventRef.id)}"
    >
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(label(eventRef.event?.axis || 'unknown'))}</span>
      <span>${escapeHtml(label(eventRef.event?.interference || 'unknown'))}</span>
    </button>
  `;
}

function renderActionRow(target, pinned, traceTarget) {
  const isPinned = sameTarget(target, pinned);
  const isTraced = sameTarget(target, traceTarget);

  return `
    <div class="context-action-row">
      <button type="button" class="context-action-button" data-pin-type="${escapeHtml(target.type)}" data-pin-id="${escapeHtml(target.id)}">
        ${escapeHtml(isPinned ? 'Unpin focus' : 'Pin focus')}
      </button>
      <button type="button" class="context-action-button" data-trace-action="${isTraced ? 'stop-trace' : 'start-trace'}" data-trace-type="${escapeHtml(target.type)}" data-trace-id="${escapeHtml(target.id)}">
        ${escapeHtml(isTraced ? 'Stop trace' : 'Trace focus')}
      </button>
    </div>
  `;
}

function normalizeRoleTarget(explicitId, alphaValue) {
  if (explicitId) return String(explicitId);
  const alpha = String(alphaValue ?? '').trim();
  return alpha ? alpha.split('.')[0] : '';
}
