import {
  renderAtlas as renderAtlasCore,
  renderTimeline as renderTimelineCore,
} from './atlas-renderer-core.js';
import { enhanceAtlasMap } from './atlas-map-enhancer.js';

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

function deriveAtlasViewKind(view) {
  const match = Array.from(view?.classList || []).find((cls) => cls.startsWith('atlas-view--'));
  return match ? match.replace('atlas-view--', '') : 'overview';
}

function fieldTitleFromView(view) {
  return view.dataset.mapHeading || view.querySelector('.atlas-heading')?.textContent?.trim() || 'Atlas field';
}

function mapNoteFromView(view) {
  return view.dataset.mapNote || view.querySelector('.atlas-note')?.textContent?.trim() || 'Atlas field view.';
}

function fieldPillsFromView(view) {
  const statePills = view.querySelector('.atlas-state-pills');
  return statePills ? statePills.cloneNode(true).outerHTML : '';
}

function sectionHeading(section) {
  return section.querySelector('h5')?.textContent?.trim()
    || section.querySelector('.expression-name,.event-card-title,.group-label')?.textContent?.trim()
    || 'Detail';
}

function sectionKicker(section) {
  return section.querySelector('.group-label')?.textContent?.trim().toLowerCase() || '';
}

function sectionHeadingText(section) {
  return section.querySelector('h5')?.textContent?.trim().toLowerCase() || '';
}

function inferMapKind(section, viewKind) {
  if (section.classList.contains('expression-card')) return 'expression';

  const kicker = sectionKicker(section);
  const heading = sectionHeadingText(section);
  const text = `${kicker} ${heading}`.trim();

  if (text.includes('expression') || text.includes('payload') || text.includes('primitive')) return 'expression';
  if (text.includes('relation') || text.includes('route') || text.includes('encounter')) return 'relations';
  if (text.includes('state') || text.includes('participant') || text.includes('structure')) return 'structure';

  if (viewKind === 'encounter') return 'relations';
  if (viewKind === 'participant') return 'structure';
  return 'default';
}

function annotateAtlasViewMetadata(root) {
  if (!root) return;

  root.querySelectorAll(':scope > .atlas-view').forEach((view) => {
    if (!view.dataset.mapViewKind) view.dataset.mapViewKind = deriveAtlasViewKind(view);

    const heading = view.querySelector('.atlas-heading')?.textContent?.trim();
    if (heading && !view.dataset.mapHeading) view.dataset.mapHeading = heading;
    if (heading && !view.dataset.mapFocusAnchor) view.dataset.mapFocusAnchor = heading;

    const note = view.querySelector('.atlas-note')?.textContent?.trim();
    if (note && !view.dataset.mapNote) view.dataset.mapNote = note;
  });
}

function annotateAtlasMapMetadata(root) {
  if (!root) return;

  root.querySelectorAll(':scope > .atlas-view').forEach((view) => {
    const viewKind = view.dataset.mapViewKind || deriveAtlasViewKind(view);
    view.querySelectorAll(':scope > .atlas-section-stack > .atlas-section, :scope > .atlas-section-stack > .expression-card').forEach((section) => {
      if (!section.dataset.mapLabel) section.dataset.mapLabel = sectionHeading(section);
      if (!section.dataset.mapKind) section.dataset.mapKind = inferMapKind(section, viewKind);
      if (!section.dataset.axis) {
        const axisNode = section.querySelector('[data-axis]');
        if (axisNode?.dataset.axis) section.dataset.axis = axisNode.dataset.axis;
      }
    });
  });
}

function ensureAtlasMapShells(root) {
  if (!root) return;

  root.querySelectorAll(':scope > .atlas-view').forEach((view) => {
    if (view.querySelector(':scope > .atlas-map-shell')) return;

    const mapShell = document.createElement('div');
    mapShell.className = 'atlas-map-shell';

    const field = document.createElement('section');
    field.className = 'atlas-map-field';
    field.dataset.viewKind = view.dataset.mapViewKind || deriveAtlasViewKind(view);
    field.dataset.focusAnchor = view.dataset.mapFocusAnchor || fieldTitleFromView(view);
    field.innerHTML = `
      <div class="atlas-map-field-head">
        <div class="group-label">Atlas field</div>
        <h5 class="atlas-map-field-title">${fieldTitleFromView(view)}</h5>
        <p class="atlas-map-field-note">${mapNoteFromView(view)}</p>
      </div>
      <div class="atlas-map-field-meta">${fieldPillsFromView(view)}</div>
      <div class="atlas-map-placeholder" aria-hidden="true">
        <div class="atlas-map-ring atlas-map-ring--a"></div>
        <div class="atlas-map-ring atlas-map-ring--b"></div>
        <div class="atlas-map-vector atlas-map-vector--a"></div>
        <div class="atlas-map-vector atlas-map-vector--b"></div>
      </div>
    `;

    const dock = document.createElement('section');
    dock.className = 'atlas-detail-dock';
    dock.innerHTML = `
      <div class="atlas-detail-dock-head">
        <div class="atlas-detail-dock-copy">
          <div class="group-label">Atlas detail</div>
          <h5 class="atlas-detail-dock-title">Current detail</h5>
          <p class="atlas-detail-dock-note">Select a marker in the field to inspect the matching atlas detail.</p>
        </div>
      </div>
      <div class="atlas-detail-dock-body"></div>
    `;

    mapShell.appendChild(field);
    mapShell.appendChild(dock);
    view.appendChild(mapShell);
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
      annotateAtlasViewMetadata(root);
      annotateAtlasMapMetadata(root);
      ensureAtlasMapShells(root);
      enhanceAtlasMap(root);
    },
  );
}
