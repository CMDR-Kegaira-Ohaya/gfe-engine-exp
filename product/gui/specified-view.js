import { escapeHtml } from '../app/helpers.js';
import { lensLabel, normalizeLens } from '../app/lenses.js';
import {
  buildCaseGraph,
  canonAxisLabel,
  CANON_AXES,
} from '../app/case-graph.js';
import { targetLabel } from '../app/interaction-state.js';

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
  const graph = buildCaseGraph(bundle, state);
  const selectedMoment = graph.moments.find((moment) => moment.momentIndex === graph.activeMoment);
  const traceLabel = graph.traceTarget ? targetLabel(bundle, graph.traceTarget) : '';
  const pinLabel = state.pinned ? targetLabel(bundle, state.pinned) : '';

  container.innerHTML = `
    <div class="map-summary compact-map-summary compact-node-summary">
      <div>
        <div class="eyebrow">Case map</div>
        <h2>${escapeHtml(bundle.identity.title)}</h2>
        <p>${escapeHtml(bundle.identity.synopsis || 'Entity map stays primary. The selected moment reshapes relations, status, and payload visibility.')}</p>
      </div>
      <div class="summary-badges compact-summary-badges">
        <span class="badge badge-lens">lens: ${escapeHtml(lensLabel(lens))}</span>
        <span class="badge">structure: ${escapeHtml(bundle.status.structural)}</span>
        <span class="badge">entities: ${escapeHtml(graph.nodes.length)}</span>
        <span class="badge">moment: ${escapeHtml(selectedMoment?.shortLabel || 'M1')}</span>
        ${pinLabel ? `<span class="badge badge-pinned">pin: ${escapeHtml(pinLabel)}</span>` : ''}
        ${traceLabel ? `<span class="badge badge-traced">trace: ${escapeHtml(traceLabel)}</span>` : ''}
      </div>
    </div>

    ${renderStructuralRegistry(graph, bundle)}
    ${renderMomentStrip(graph)}
    ${renderEntityMap(graph)}
  `;
}

function renderStructuralRegistry(graph, bundle) {
  return `
    <section class="structural-registry node-registry-strip compact-node-registry-strip">
      <div class="structural-registry-head compact-node-registry-head">
        <div>
          <div class="eyebrow">Structural registry</div>
          <h3>Canon 5-axis rack</h3>
        </div>
        <div class="structural-registry-stats compact-node-registry-stats">
          <div class="registry-stat"><strong>${escapeHtml(graph.moments.length)}</strong><span>moments</span></div>
          <div class="registry-stat"><strong>${escapeHtml(bundle.status.provenance?.solverCertified ? 'yes' : 'no')}</strong><span>solver</span></div>
        </div>
      </div>
      <div class="structural-registry-grid compact-node-registry-grid">
        ${CANON_AXES.map((axisId) => renderAxisRegistryGroup(axisId, graph.axisStats[axisId] || 0)).join('')}
      </div>
    </section>
  `;
}

function renderAxisRegistryGroup(axisId, count) {
  const width = Math.min(100, count * 18);
  return `
    <div class="registry-group axis-rail axis-${escapeHtml(axisId)} ${count ? 'dominant' : ''}">
      <div class="axis-rail-head">
        <strong class="axis-rail-label">${escapeHtml(canonAxisLabel(axisId))}</strong>
        <span class="axis-rail-values">${escapeHtml(count)}</span>
      </div>
      <div class="axis-rail-track compact-axis-track">
        <div class="axis-half left"><span class="axis-fill sigma-l" style="width:${width}%"></span></div>
        <div class="axis-theta">Θ</div>
        <div class="axis-half right"><span class="axis-fill sigma-m" style="width:${width}%"></span></div>
      </div>
    </div>
  `;
}

function renderMomentStrip(graph) {
  return `
    <section class="moment-strip panel-strip">
      <div class="moment-strip-head">
        <div>
          <div class="eyebrow">Moment strip</div>
          <h3>${escapeHtml(graph.activeStep?.timestep_label || `Step ${graph.activeMoment + 1}`))}</h3>
        </div>
        <div class="moment-strip-note">Select time here. The entity map updates without replacing the whole board.</div>
      </div>
      <div class="moment-strip-track">
        ${graph.moments.map((moment) => renderMomentPill(moment)).innerJoin? '' : graph.moments.map((moment) => renderMomentPill(moment)).innerJoin('')}
      </div>
    </section>
  `; 
}

function renderMomentPill(moment) {
  const tone = resolveMomentTone(moment);
  return `
    <button
      type="button"
      class="moment-pill ${moment.isActive ? 'active' : ''} ${moment.isDimmed ? 'dimmed' : ''}"
      data-select-type="moment"
      data-select-id="${moment.momentIndex}"
      title="${escapeHtml(moment.label)}"
      aria-pressed="${moment.isActive ? 'true' : 'false'}"
    >
      <span class="moment-pill-status ${tone}" aria-hidden="true"></span>
      <span class="moment-pill-text">
        <strong>${escapeHtml(moment.shortLabel)}</strong>
        <span>${escapeHtml(moment.label)}</span>
      </span>
    </button>
  `; 
}

function resolveMomentTone(moment) {
  if (moment.isActive) return 'focus';
  if (moment.isAnchor) return 'anchor';
  if (moment.isTraced) return 'trace';
  if (moment.hasPayload) return 'payload';
  return 'quiet';
}

function renderEntityMap(graph) {
  const { cols, rows, viewWidth, viewHeight } = graph.boardMeta;

  return `
    <section class="entity-map-shell spatial-plane">
      <div class="entity-map-head">
        <div>
          <div class="eyebrow">Entity map</div>
          <h3>Persistent nodes, moment-shaped relations</h3>
        </div>
        <div class="entity-map-note">Nodes stay compact: title plus status only. Open the inspector for the full readout.</div>
      </div>
      <div class="entity-map-frame" style="--board-cols:${cols}; --board-rows:${rows};">
        <svg class="entity-map-lines" viewBox="0 0 ${viewWidth} ${viewHeight}" preserveAspectRatio="none" aria-hidden="true">
          ${graph.edges.map((edge) => renderEdge(edge, graph.nodes)).join('')}
        </svg>
        <div class="entity-map-grid" style="--board-cols:${cols};">
          ${graph.nodes.map((node) => renderEntityNode(node)).join('')}
        </div>
      </div>
    </section>
  `;
}

function renderEdge(edge, nodes) {
  const fromNode = nodes.find((node) => node.entityId === edge.fromId);
  const toNode = nodes.find((node) => node.entityId === edge.toId);
  if (!fromNode || !toNode) return '';

  return `<line class="board-line ${escapeHtml(edge.tone)}" x1="${fromNode.centerX}" y1="${fromNode.centerY}" x2="${toNode.centerX}" y2="${toNode.centerY}"></line>`;
}

function renderEntityNode(node) {
  return `
    <article
      class="entity-node ${node.isSelected ? 'active' : ''}${node.isPinned ? ' pinned' : ''}${node.isTraced ? ' traced' : ''}${node.isDimmed ? ' dimmed' : ''}"
      style="grid-column:${node.col}; grid-row:${node.row};"
    >
      <button
        class="entity-node-button"
        type="button"
        data-select-type="entity"
        data-select-id="${escapeHtml(node.entityId)}"
        title="${escapeHtml(node.label)}"
      >
        <span class="entity-node-status ${escapeHtml(node.tone)}" aria-hidden="true"></span>
        <span class="entity-node-label">${escapeHtml(node.label)}</span>
      </button>
    </article>
  `;
}
