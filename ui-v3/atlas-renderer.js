import {
  renderAtlas as renderAtlasCore,
  renderTimeline as renderTimelineCore,
} from './atlas-renderer-core.js';

const POSITION_GROUPS = {
  expression: [
    { top: '18%', left: '20%' },
    { top: '28%', left: '68%' },
    { top: '56%', left: '24%' },
    { top: '68%', left: '64%' },
    { top: '44%', left: '46%' },
  ],
  relations: [
    { top: '22%', left: '22%' },
    { top: '26%', left: '70%' },
    { top: '52%', left: '18%' },
    { top: '62%', left: '68%' },
    { top: '42%', left: '48%' },
  ],
  structure: [
    { top: '18%', left: '28%' },
    { top: '24%', left: '60%' },
    { top: '48%', left: '24%' },
    { top: '60%', left: '58%' },
    { top: '72%', left: '40%' },
  ],
  default: [
    { top: '20%', left: '20%' },
    { top: '28%', left: '66%' },
    { top: '50%', left: '22%' },
    { top: '62%', left: '66%' },
    { top: '42%', left: '44%' },
  ],
};

const TIMELINE_COPY_RULES = [
  {
    selector: '.timeline-step-detail .step-detail-summary',
    from: 'Click an actor to set participant focus. Click an action to set encounter focus. The atlas responds without changing the selected moment.',
    to: 'Select an actor to set participant focus. Select an encounter to set encounter focus. The atlas updates without changing the selected moment.',
  },
  {
    selector: '.timeline-step-detail .step-detail-label',
    from: 'Actions',
    to: 'Encounters',
  },
  {
    selector: '.timeline-step-detail .inline-empty',
    from: 'No actions are encoded for this step yet.',
    to: 'No encounters are encoded for this step yet.',
  },
  {
    selector: '.timeline-sub',
    transform: (text) => text.replace(/\baction(s)?\b/g, 'encounter$1'),
  },
];

const ATLAS_COPY_RULES = [
  {
    selector: ':scope > .empty',
    from: 'No relation atlas data yet.',
    to: 'No atlas data yet.',
  },
  {
    selector: '.atlas-section .group-label',
    from: 'Relation field',
    to: 'Relations field',
  },
  {
    selector: '.atlas-section h5',
    from: 'Current encounter surfaces',
    to: 'Encounter details',
  },
  {
    selector: '.atlas-section h5',
    from: 'Current linked encounters',
    to: 'Linked encounter details',
  },
  {
    selector: '.context-kicker',
    from: 'Relation Atlas',
    to: 'Atlas',
  },
  {
    selector: '.atlas-section-stack .inline-empty',
    from: 'No relation events are encoded here yet.',
    to: 'No encounters are encoded here yet.',
  },
];

function applyCopyRules(root, rules) {
  if (!root) return;

  rules.forEach((rule) => {
    root.querySelectorAll(rule.selector).forEach((node) => {
      const current = node.textContent?.trim();
      if (!current) return;

      if (rule.transform) {
        const next = rule.transform(current);
        if (next && next !== current) node.textContent = next;
        return;
      }

      if (current === rule.from) node.textContent = rule.to;
    });
  });
}

function annotateAtlasMapMetadata(root) {
  if (!root) return;

  root.querySelectorAll(':scope > .atlas-view').forEach((view) => {
    view.querySelectorAll(':scope > .atlas-section-stack > .atlas-section, :scope > .atlas-section-stack > .expression-card').forEach((section) => {
      if (!section.dataset.axis) {
        const axisNode = section.querySelector('[data-axis]');
        if (axisNode?.dataset.axis) section.dataset.axis = axisNode.dataset.axis;
      }
    });
  });
}

function atlasRootFrom(root = document) {
  return root.matches?.('#atlas') ? root : root.querySelector('#atlas');
}

function detailNodesFromView(view) {
  const mapShell = view.querySelector(':scope > .atlas-map-shell');
  const preservedNodes = [
    view.querySelector('.atlas-top-row'),
    view.querySelector('.atlas-state-strip'),
    view.querySelector('.atlas-provenance-strip'),
    view.querySelector('.atlas-lens-shell'),
    view.querySelector('.atlas-note'),
    mapShell,
  ];

  return Array.from(view.children).filter((node) => !preservedNodes.includes(node));
}

function axisFromSection(section) {
  return section.dataset.axis || section.querySelector('[data-axis]')?.dataset.axis || 'unknown';
}

function markerTextFromSection(section) {
  return section.dataset.mapLabel || 'Detail';
}

function sectionKind(section) {
  if (section.dataset.mapKind) return section.dataset.mapKind;
  if (section.classList.contains('expression-card')) return 'expression';
  return 'default';
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function sectionSearchText(section) {
  return normalizeText(section.textContent || '');
}

function groupedTargets(targets) {
  const groups = { expression: [], relations: [], structure: [], default: [] };
  targets.forEach((target) => {
    groups[sectionKind(target)].push(target);
  });
  return groups;
}

function clearTargeted(dockBody) {
  dockBody.querySelectorAll('.is-targeted').forEach((node) => node.classList.remove('is-targeted'));
}

function syncActiveZone(field, kind) {
  field.querySelectorAll('.atlas-map-zone').forEach((zone) => {
    zone.classList.toggle('is-active', zone.dataset.kind === kind);
  });
}

function focusAnchor(field) {
  return normalizeText(field.dataset.focusAnchor || field.querySelector('.atlas-map-field-title')?.textContent || '');
}

function targetPriority(field, marker) {
  const viewKind = field.dataset.viewKind || 'overview';
  const activeKind = marker.dataset.kind || 'default';
  const markerText = normalizeText(marker.dataset.text || '');
  const targetText = normalizeText(marker.dataset.targetText || '');
  const anchor = focusAnchor(field);

  if (viewKind === 'overview') return 'broad';

  if (viewKind === 'participant') {
    if (anchor && (markerText.includes(anchor) || targetText.includes(anchor))) return 'primary';
    if (activeKind === 'structure' || activeKind === 'relations') return 'secondary';
    return 'muted';
  }

  if (viewKind === 'encounter') {
    const encounterWords = ['encounter', 'route', 'payload', 'current primitives', 'current detail'];
    if (anchor && (markerText.includes(anchor) || targetText.includes(anchor))) return 'primary';
    if (encounterWords.some((word) => markerText.includes(word) || targetText.includes(word))) return 'secondary';
    if (activeKind === 'relations' || activeKind === 'expression') return 'secondary';
    return 'muted';
  }

  return 'broad';
}

function applyMarkerEmphasis(field, activeMarker) {
  const viewKind = field.dataset.viewKind || 'overview';
  const activeKind = activeMarker?.dataset.kind || 'default';

  field.querySelectorAll('.atlas-map-marker').forEach((marker) => {
    marker.classList.remove('is-muted', 'is-secondary');
    if (marker === activeMarker) return;

    if (viewKind === 'overview') {
      if (marker.dataset.kind !== activeKind) marker.classList.add('is-secondary');
      return;
    }

    const priority = targetPriority(field, marker);
    if (priority === 'primary' || priority === 'secondary') {
      marker.classList.add('is-secondary');
      return;
    }
    marker.classList.add('is-muted');
  });
}

function activateMarker(field, dockBody, marker, target, options = {}) {
  field.querySelectorAll('.atlas-map-marker').forEach((node) => node.classList.remove('is-active'));
  clearTargeted(dockBody);
  marker.classList.add('is-active');
  target.classList.add('is-targeted');
  syncActiveZone(field, marker.dataset.kind || 'default');
  applyMarkerEmphasis(field, marker);
  if (options.scroll !== false) target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function placeMarker(marker, kind, localIndex, globalIndex) {
  const pool = POSITION_GROUPS[kind] || POSITION_GROUPS.default;
  const pos = pool[localIndex % pool.length] || POSITION_GROUPS.default[globalIndex % POSITION_GROUPS.default.length];
  marker.style.top = pos.top;
  marker.style.left = pos.left;
}

function buildZoneLayer(groups) {
  const zones = document.createElement('div');
  zones.className = 'atlas-map-zones';

  [['structure', 'Structure'], ['relations', 'Relations'], ['expression', 'Expression']].forEach(([kind, label]) => {
    if (!groups[kind].length) return;
    const zone = document.createElement('div');
    zone.className = `atlas-map-zone atlas-map-zone--${kind}`;
    zone.dataset.zoneLabel = label;
    zone.dataset.kind = kind;
    zones.appendChild(zone);
  });

  return zones;
}

function buildMarkers(field, dockBody, targets) {
  const interactives = document.createElement('div');
  interactives.className = 'atlas-map-interactives';

  const focusNode = document.createElement('div');
  focusNode.className = 'atlas-map-focus-node';
  focusNode.setAttribute('aria-hidden', 'true');
  interactives.appendChild(focusNode);

  const groups = groupedTargets(targets);
  const markerMap = new Map();
  let globalIndex = 0;
  let firstMarker = null;

  ['structure', 'relations', 'expression', 'default'].forEach((kind) => {
    groups[kind].forEach((target, localIndex) => {
      globalIndex += 1;
      target.dataset.mapTarget = `atlas-target-${globalIndex}`;
      target.tabIndex = 0;

      const marker = document.createElement('button');
      marker.type = 'button';
      marker.className = 'atlas-map-marker';
      marker.dataset.target = target.dataset.mapTarget;
      marker.dataset.axis = axisFromSection(target);
      marker.dataset.kind = kind;
      marker.dataset.text = markerTextFromSection(target);
      marker.dataset.targetText = sectionSearchText(target);

      placeMarker(marker, kind, localIndex, globalIndex - 1);

      marker.innerHTML = `
        <span class="atlas-map-label">
          <span class="atlas-map-index">${globalIndex}</span>
          <span class="atlas-map-text">${markerTextFromSection(target)}</span>
        </span>
      `;

      marker.addEventListener('click', () => activateMarker(field, dockBody, marker, target));
      markerMap.set(target.dataset.mapTarget, { marker, target });
      if (!firstMarker) firstMarker = { marker, target };
      interactives.appendChild(marker);
    });
  });

  dockBody.addEventListener('click', (event) => {
    const target = event.target.closest('.atlas-section, .expression-card');
    if (!target?.dataset.mapTarget) return;
    const pair = markerMap.get(target.dataset.mapTarget);
    if (!pair) return;
    activateMarker(field, dockBody, pair.marker, pair.target, { scroll: false });
  });

  dockBody.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target.closest('.atlas-section, .expression-card');
    if (!target?.dataset.mapTarget) return;
    const pair = markerMap.get(target.dataset.mapTarget);
    if (!pair) return;
    event.preventDefault();
    activateMarker(field, dockBody, pair.marker, pair.target, { scroll: false });
  });

  return { interactives, zones: buildZoneLayer(groups), firstMarker };
}

function wireAtlasMap(root = document) {
  const atlasRoot = atlasRootFrom(root);
  if (!atlasRoot) return;

  atlasRoot.querySelectorAll(':scope > .atlas-view').forEach((view) => {
    const mapShell = view.querySelector(':scope > .atlas-map-shell');
    const field = mapShell?.querySelector(':scope > .atlas-map-field');
    const dock = mapShell?.querySelector(':scope > .atlas-detail-dock');
    const dockBody = dock?.querySelector(':scope > .atlas-detail-dock-body');
    if (!mapShell || !field || !dockBody) return;

    field.dataset.viewKind = view.dataset.mapViewKind || 'overview';
    field.dataset.focusAnchor = view.dataset.mapFocusAnchor || field.querySelector('.atlas-map-field-title')?.textContent?.trim() || '';

    field.querySelectorAll('.atlas-map-zones, .atlas-map-interactives').forEach((node) => node.remove());
    dockBody.replaceChildren();

    const detailNodes = detailNodesFromView(view);
    detailNodes.forEach((node) => dockBody.appendChild(node));

    const targets = Array.from(dockBody.querySelectorAll(':scope > .atlas-section, :scope > .expression-card'));
    if (targets.length) {
      const { interactives, zones, firstMarker } = buildMarkers(field, dockBody, targets);
      field.appendChild(zones);
      field.appendChild(interactives);
      if (firstMarker) activateMarker(field, dockBody, firstMarker.marker, firstMarker.target);
    }
  });
}

function renderWithPolish(renderFn, root, rules, ctx, afterRender) {
  const result = renderFn(ctx);
  applyCopyRules(root, rules);
  if (afterRender) afterRender(root, ctx, result);
  return result;
}

export function renderTimeline(ctx) {
  return renderWithPolish(renderTimelineCore, ctx?.els?.timeline, TIMELINE_COPY_RULES, ctx);
}

export function renderAtlas(ctx) {
  return renderWithPolish(
    renderAtlasCore,
    ctx?.els?.atlas,
    ATLAS_COPY_RULES,
    ctx,
    (root) => {
      annotateAtlasMapMetadata(root);
      wireAtlasMap(root);
    },
  );
}
