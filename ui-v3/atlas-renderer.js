import {
  renderAtlas as renderAtlasCore,
  renderTimeline as renderTimelineCore,
} from './atlas-renderer-core.js';

function replaceExactText(root, selector, from, to) {
  if (!root) return;
  root.querySelectorAll(selector).forEach((node) => {
    if (node.textContent?.trim() === from) node.textContent = to;
  });
}

function polishTimelineCopy(root) {
  replaceExactText(
    root,
    '.timeline-step-detail .step-detail-summary',
    'Click an actor to set participant focus. Click an action to set encounter focus. The atlas responds without changing the selected moment.',
    'Select an actor to set participant focus. Select an encounter to set encounter focus. The atlas updates without changing the selected moment.',
  );
  replaceExactText(root, '.timeline-step-detail .step-detail-label', 'Actions', 'Encounters');
  replaceExactText(
    root,
    '.timeline-step-detail .inline-empty',
    'No actions are encoded for this step yet.',
    'No encounters are encoded for this step yet.',
  );
}

function polishAtlasCopy(root) {
  replaceExactText(root, ':scope > .empty', 'No relation atlas data yet.', 'No atlas data yet.');
  replaceExactText(root, '.atlas-section .group-label', 'Relation field', 'Relations field');
  replaceExactText(root, '.atlas-section h5', 'Current encounter surfaces', 'Encounter details');
  replaceExactText(root, '.atlas-section h5', 'Current linked encounters', 'Linked encounter details');
}

export function renderTimeline(ctx) {
  const result = renderTimelineCore(ctx);
  polishTimelineCopy(ctx?.els?.timeline);
  return result;
}

export function renderAtlas(ctx) {
  const result = renderAtlasCore(ctx);
  polishAtlasCopy(ctx?.els?.atlas);
  return result;
}
