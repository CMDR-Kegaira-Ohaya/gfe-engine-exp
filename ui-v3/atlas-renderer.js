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
    (root) => enhanceAtlasMap(root),
  );
}
