
import { escapeHtml, eventTitle, eventsForStep, label } from '../app/helpers.js';
import { resolveFilterState } from '../app/filters.js';
import { activeTraceTarget, buildTraceIndex, sameTarget, targetLabel } from '../app/interaction-state.js';
import { lensLabel, normalizeLens } from '../app/lenses.js';

const AXIS_ORDER = ['cfg', 'emb', 'org', 'dir', 'leg'];

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
  const axisStats = summarizeAxisStats(events);
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

  const board = buildBoardLayout(visibleStepRefs);
  const boardLines = buildBoardLines(board.items, trace, state.selection, state.pinned);
  const momentsWithEvents = visibleStepRefs.filter((item) => item.stepEvents.length).length;

  container.innerHTML = `
    <div class="map-summary compact-map-summary">
      <div>
        <div class="eyebrow">Case map</div>
        <h2>${escapeHtml(bundle.identity.title)}</h2>
        <p>${escapeHtml(bundle.identity.synopsis || 'Map the solved arrangement first; reveal detail by clicking nodes.')}</p>
        <div class="summary-note-strip">
          <span class="badge badge-lens">lens: ${escapeHtml(lensLabel(lens))}</span>
          ${state.pinned ? `<span class="badge badge-pinned">pin: ${escapeHtml(targetLabel(bundle, state.pinned))}</span>` : ''}
          ${traceTarget ? `<span class="badge badge-traced">trace: ${escapeHtml(targetLabel(bundle, traceTarget))}</span>` : ''}
        </div>
      </div>
      <div class="summary-badges">
        <span class="badge">structure: ${escapeHtml(bundle.status.structural)}</span>
        <span class="badge">moments: ${escapeHtml(visibleStepRefs.length)} / ${escapeHtml(steps.length)}</span>
        <span class="badge">payload moments: ${escapeHtml(momentsWithEvents)}</span>
        <span class="badge">payload events: ${escapeHtml(events.length)}</span>
      </div>
    </div>

    ${renderStructuralRegistry(axisStats, bundle, visibleStepRefs.length)}

    <section class="node-board-shell spatial-plane lens-${escapeHtml(lens)}">
      <div class="node-board-head">
        <div class="eyebrow">Grid map</div>
        <div class="node-board-note">Click a node to inspect it. Relation lines show map continuity; highlighted lines follow the active trace or focus.</div>
      </div>
      <div class="node-board-frame" style="--board-cols:${board.cols}; --board-rows:${board.rows};">
        <svg class="node-board-lines" viewBox="0 0 ${board.viewWidth} ${board.viewHeight}" preserveAspectRatio="none" aria-hidden="true">
          ${boardLines.map(renderBoardLine).join('')}
        </svg>
        <div class="node-board-grid">
          ${board.items.map((item) => renderMomentNode(bundle, item, state, trace, lens, filters)).join('')}
        </div>
      </div>
    </section>
  `;
}

function renderStructuralRegistry(axisStats, bundle, visibleMoments) {
  return `
    <section class="structural-registry node-registry-strip">
      <div class="structural-registry-head">
        <div>
          <div class="eyebrow">Structural registry</div>
          <h3>Canon 5-axis rack</h3>
        </div>
        <div class="structural-registry-stats">
          <div class="registry-stat"><strong>${escapeHtml(visibleMoments)}</strong><span>visible moments</span></div>
          <div class="registry-stat"><strong>${escapeHtml(bundle.status.provenance?.solverCertified ? 'yes' : 'no')}</strong><span>solver certified</span></div>
        </div>
      </div>
      <div class="structural-registry-grid">
        ${AXIS_ORDER.map((axisId) => renderAxisRegistryGroup(axisId, axisStats[axisId] || 0)).join('')}
      </div>
    </section>
  `;
}

function renderAxisRegistryGroup(axisId, count) {
  return `
    <div class="registry-group axis-rail axis-${escapeHtml(axisId)} ${count ? 'dominant' : ''}">
      <div class="axis-rail-head">
        <strong class="axis-rail-label">${escapeHtml(axisId.toUpperCase())}</strong>
        <span class="axis-rail-values">${escapeHtml(count)} event${count === 1 ? '' : 's'}</span>
      </div>
      <div class="axis-rail-track">
        <div class="axis-half left"><span class="axis-fill sigma-l" style="width:${Math.min(100, count * 14)}%"></span></div>
        <div class="axis-theta">Θ</div>
        <div class="axis-half right"><span class="axis-fill sigma-m" style="width:${Math.min(100, count * 14)}%"></span></div>
      </div>
      <div class="axis-rail-band">
        <span class="axis-band-pill ${count ? 'band-engaged' : 'band-latent'}">${count ? 'active lane' : 'latent lane'}</span>
      </div>
    </div>
  `;
}

function renderMomentNode(bundle, item, state, trace, lens, filters) {
  const { step, stepIndex, stepEvents, col, row } = item;
  const momentTarget = { type: 'moment', id: String(stepIndex) };
  const isSelected = sameTarget(state.selection, momentTarget);
  const isPinned = sameTarget(state.pinned, momentTarget);
  const isTraced = trace.moments.has(String(stepIndex));
  const isAnchor = trace.anchorMoment === stepIndex;
  const participantIds = Object.keys(step?.participants || {});
  const showSatellites = !filters.focusDetailsOnly || isSelected || isPinned || isAnchor;
  const axisCounts = summarizeAxisStats(stepEvents);

  return `
    <article class="grid-node moment-node${isSelected ? ' active' : ''}${isPinned ? ' pinned' : ''}${isTraced ? ' traced' : ''}${isAnchor ? ' anchor' : ''}" style="--node-col:${col}; --node-row:${row};">
      <div class="moment-node-head">
        <button class="moment-node-title" type="button" data-select-type="moment" data-select-id="${stepIndex}">
          ${escapeHtml(step?.timestep_label || `Step ${stepIndex + 1}`)}
        </button>
        <button class="pin-button pin-button-small" type="button" data-pin-type="moment" data-pin-id="${stepIndex}">
          ${isPinned ? 'Unpin' : 'Pin'}
        </button>
      </div>
      <div class="moment-node-meta">
        ${isAnchor ? '<span class="moment-flow-label anchor">anchor</span>' : ''}
        ${isTraced && !isAnchor ? '<span class="moment-flow-label">on flow</span>' : ''}
        ${stepEvents.length ? `<span class="moment-flow-label evidence present">${stepEvents.length} payload</span>` : '<span class="moment-flow-label evidence absent">no payload</span>'}
      </div>
      <div class="moment-node-grid">
        <span class="moment-mini-chip"><strong>${participantIds.length}</strong> entities</span>
        <span class="moment-mini-chip"><strong>${stepEvents.length}</strong> events</span>
      </div>
      <div class="moment-mini-row">
        ${AXIS_ORDER.map((axisId) => `<span class="moment-mini-chip axis-${escapeHtml(axisId)} ${axisCounts[axisId] ? '' : 'empty'}"><strong>${escapeHtml(axisId.toUpperCase())}</strong> ${escapeHtml(axisCounts[axisId] || 0)}</span>`).join('')}
      </div>
      ${showSatellites ? `
        <div class="node-satellite-strip">
          ${renderEntitySatellites(participantIds)}
          ${renderEventSatellites(stepEvents, stepIndex)}
        </div>
      ` : '<div class="compact-note">Focus detail hidden until this node is inspected or pinned.</div>'}
    </article>
  `;
}

function renderEntitySatellites(participantIds) {
  if (!participantIds.length) {
    return '<div class="node-satellite-group"><div class="node-satellite-title">Entities</div><div class="compact-note">No entities recorded.</div></div>';
  }

  const visible = participantIds.slice(0, 3);
  const overflow = participantIds.length - visible.length;

  return `
    <div class="node-satellite-group">
      <div class="node-satellite-title">Entities</div>
      <div class="node-satellite-row">
        ${visible.map((participantId) => `
          <button class="node-satellite entity-node" type="button" data-select-type="entity" data-select-id="${escapeHtml(participantId)}">
            ${escapeHtml(label(participantId))}
          </button>
        `).join('')}
        ${overflow > 0 ? `<span class="node-satellite more-node">+${overflow}</span>` : ''}
      </div>
    </div>
  `;
}

function renderEventSatellites(stepEvents, stepIndex) {
  if (!stepEvents.length) {
    return '<div class="node-satellite-group"><div class="node-satellite-title">Relations</div><div class="compact-note">No payload relations.</div></div>';
  }

  const visible = stepEvents.slice(0, 2);
  const overflow = stepEvents.length - visible.length;

  return `
    <div class="node-satellite-group">
      <div class="node-satellite-title">Relations</div>
      <div class="node-satellite-row">
        ${visible.map((event, eventIndex) => `
          <button class="node-satellite relation-node" type="button" data-select-type="event" data-select-id="${stepIndex}:${eventIndex}">
            ${escapeHtml(eventTitle(event))}
          </button>
        `).join('')}
        ${overflow > 0 ? `<span class="node-satellite more-node">+${overflow}</span>` : ''}
      </div>
    </div>
  `;
}

function buildBoardLayout(visibleStepRefs) {
  const count = visibleStepRefs.length;
  const cols = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(count))));
  const cellWidth = 240;
  const cellHeight = 186;
  const items = visibleStepRefs.map((item, index) => ({
    ...item,
    col: (index % cols) + 1,
    row: Math.floor(index / cols) + 1,
    centerX: ((index % cols) * cellWidth) + (cellWidth / 2),
    centerY: (Math.floor(index / cols) * cellHeight) + (cellHeight / 2),
  }));
  const rows = Math.max(1, Math.ceil(count / cols));

  return {
    items,
    cols,
    rows,
    viewWidth: cols * cellWidth,
    viewHeight: rows * cellHeight,
  };
}

function buildBoardLines(items, trace, selection, pinned) {
  const byStep = new Map(items.map((item) => [item.stepIndex, item]));
  const lines = [];

  for (let index = 0; index < items.length - 1; index += 1) {
    const left = items[index];
    const right = items[index + 1];
    lines.push({
      x1: left.centerX,
      y1: left.centerY,
      x2: right.centerX,
      y2: right.centerY,
      tone: trace.moments.has(String(left.stepIndex)) && trace.moments.has(String(right.stepIndex)) ? 'trace' : 'base',
    });
  }

  const emphasizedSteps = orderedFocusSteps(trace, selection, pinned).filter((stepIndex) => byStep.has(stepIndex));
  for (let index = 0; index < emphasizedSteps.length - 1; index += 1) {
    const from = byStep.get(emphasizedSteps[index]);
    const to = byStep.get(emphasizedSteps[index + 1]);
    lines.push({
      x1: from.centerX,
      y1: from.centerY,
      x2: to.centerX,
      y2: to.centerY,
      tone: 'focus',
    });
  }

  return lines;
}

function renderBoardLine(line) {
  return `<line class="board-line ${escapeHtml(line.tone)}" x1="${line.x1}" y1="${line.y1}" x2="${line.x2}" y2="${line.y2}"></line>`;
}

function orderedFocusSteps(trace, selection, pinned) {
  if (selection?.type === 'moment') return [Number(selection.id)];
  if (pinned?.type === 'moment') return [Number(pinned.id)];
  return trace.orderedMoments || [];
}

function summarizeAxisStats(events) {
  const counts = Object.fromEntries(AXIS_ORDER.map((axisId) => [axisId, 0]));
  events.forEach((event) => {
    const axisId = String(event?.axis || '').trim().toLowerCase();
    if (axisId in counts) counts[axisId] += 1;
  });
  return counts;
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
