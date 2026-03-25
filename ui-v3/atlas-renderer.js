import {
  renderAtlas as renderAtlasCore,
  renderTimeline as renderTimelineCore,
} from './atlas-renderer-core.js';

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
];

function applyCopyRules(root, rules) {
  if (!root) return;
  rules.forEach(({ selector, from, to }) => {
    root.querySelectorAll(selector).forEach((node) => {
      if (node.textContent?.trim() === from) node.textContent = to;
    });
  });
}

function renderWithPolish(renderFn, root, rules, ctx) {
  const result = renderFn(ctx);
  applyCopyRules(root, rules);
  return result;
}

export function renderTimeline(ctx) {
  return renderWithPolish(renderTimelineCore, ctx?.els?.timeline, TIMELINE_COPY_RULES, ctx);
}

export function renderAtlas(ctx) {
  return renderWithPolish(renderAtlasCore, ctx?.els?.atlas, ATLAS_COPY_RULES, ctx);
}
