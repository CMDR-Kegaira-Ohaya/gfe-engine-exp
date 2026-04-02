import { escapeHtml, eventsForStep } from '../app/helpers.js';
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
    <div class="map-summary compact-map-summary compact-node-summary">
      <div>
        <div class="eyebrow">Case map</div>
        <h2>${escapeHtml(bundle.identity.title)}</h2>
        <p>${escapeHtml(bundle.identity.synopsis || 'Map the solved arrangement first; inspect detail from the panel on the right.')}</p>
      </div>
      <div class="summary-badges compact-summary-badges">
        <span class="badge badge-lens">lens: ${escapeHtml(lensLabel(lens))}</span>
        <span class="badge">structure: ${escapeHtml(bundle.status.structural)}</span>
        <span class="badge">moments: ${escapeHtml(visibleStepRefs.length)} / ${escapeHtml(steps.length)}</span>
        <span class="badge">payload: ${escapeHtml(momentsWithEvents)}</span>
        ${state.pinned ? `<span class="badge badge-pinned">pin: ${escapeHtml(targetLabel(bundle, state.pinned))}</span>` : ''}
        ${traceTarget ? `<span class="badge badge-traced">trace: ${escapeHtml(targetLabel(bundle, traceTarget))}</span>` : ''}
      </div>
    </div>

    ${renderStructuralRegistry(axisStats, bundle, visibleStepRefs.length)}

    <section class="node-board-shell spatial-plane lens-${escapeHtml(lens)} compact-node-board-shell">
      <div class="node-board-head compact-node-board-head">
        <div class="eyebrow">Grid map</div>
        <div class="node-board-note">Nodes stay compact. Click a node to send full detail to the inspector.</div>
      </div>
      <div class="node-board-frame compact-node-board-frame" style="--board-cols:${board.cols}; --board-rows:${board.rows};">
        <svg class="node-board-lines" viewBox="0 0 ${board.viewWidth} ${board.viewHeight}" preserveAspectRatio="none" aria-hidden="true">
          ${boardLines.map(renderBoardLine).join('')}
        </svg>
        <div class="node-board-grid compact-node-board-grid">
          ${board.items.map((item) => renderMomentNode(item, state, trace)).join('')}
        </div>
      </div>
    </section>
  `;
}

function renderStructuralRegistry(axisStats, bundle, visibleMoments) {
  return `
    <section class="structural-registry node-registry-strip compact-node-registry-strip">
      <div class="structural-registry-head compact-node-registry-head">
        <div>
          <div class="eyebrow">Structural registry</div>
          <h3>Canon 5-axis rack</h3>
        </div>
        <div class="structural-registry-stats compact-node-registry-stats">
          <div class="registry-stat"><strong>${escapeHtml(visibleMoments)}</strong><span>visible</span></div>
          <div class="registry-stat"><strong>${escapeHtml(bundle.status.provenance?.solverCertified ? 'yes' : 'no')}</strong><span>solver</span></div>
        </div>
      </div>
      <div class="structural-registry-grid compact-node-registry-grid">
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
        <span class="axis-rail-values">${escapeHtml(count)}</span>
      </div>
      <div class="axis-rail-track compact-axis-track">
        <div class="axis-half left"><span class="axis-fill sigma-l" style="width:${Math.min(100, count * 14)}%"></span></div>
        <div class="axis-theta">Θ</div>
        <div class="axis-half right"><span class="axis-fill sigma-m" style="width:${Math.min(100, count * 14)}%"></span></div>
      </div>
    </div>
  `;
}

function renderMomentNode(item, state, trace) {
  const { step, stepIndex, stepEvents } = item;
  const target = { type: 'moment', id: String(stepIndex) };
  const isSelected = sameTarget(state.selection, target);
  const isPinned = sameTarget(state.pinned, target);
  const isTraced = trace.moments.has(String(stepIndex));
  const isAnchor = trace.anchorMoment === stepIndex;
  const tone = resolveMomentTone({ isSelected, isPinned, isTraced, isAnchor, hasPayload: stepEvents.length > 0 });

  return `
    <article class="grid-node moment-node compact-moment-node ${isSelected ? 'active' : ''}${isPinned ? ' pinned' : ''}${isTraced ? ' traced' : ''}${isAnchor ? ' anchor' : ''} tone-${tone}">
      <button class="moment-node-button" type="button" data-select-type="moment" data-select-id="${stepIndex}" title="${escapeHtml(step?.timestep_label || `Step ${stepIndex + 1}`)}">
        <span class="moment-node-status ${tone}" aria-hidden="true"></span>
        <span class="moment-node-button-label">${escapeHtml(step?.timestep_label || `Step ${stepIndex + 1}`)}</span>
      </button>
    </article>
  `;
}

function resolveMomentTone({ isSelected, isPinned, isTraced, isAnchor, hasPayload }) {
  if (isSelected || isPinned) return 'focus';
  if (isAnchor) return 'anchor';
  if (isTraced) return 'trace';
  if (hasPayload) return 'payload';
  return 'quiet';
}

function buildBoardLayout(visibleStepRefs) {
  const count = visibleStepRefs.length;
  const cols = Math.min(6, Math.max(3, Math.ceil(Math.sqrt(count * 2.2))));
  const cellWidth = 176;
  const cellHeight = 82;
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
