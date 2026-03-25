function replaceExactText(root, selector, from, to) {
  if (!root) return;
  root.querySelectorAll(selector).forEach((node) => {
    if (node.textContent?.trim() === from) node.textContent = to;
  });
}

export function polishTimelineCopy(root) {
  replaceExactText(
    root,
    '.step-detail-summary',
    'Click an actor to set participant focus. Click an action to set encounter focus. The atlas responds without changing the selected moment.',
    'Select an actor to set participant focus. Select an encounter to set encounter focus. The atlas updates without changing the selected moment.',
  );
  replaceExactText(root, '.step-detail-label', 'Actions', 'Encounters');
  replaceExactText(root, '.inline-empty', 'No actions are encoded for this step yet.', 'No encounters are encoded for this step yet.');
}

export function polishAtlasCopy(root) {
  replaceExactText(root, '.empty', 'No relation atlas data yet.', 'No atlas data yet.');
  replaceExactText(root, '.group-label', 'Relation field', 'Relations field');
  replaceExactText(root, 'h5', 'Current encounter surfaces', 'Encounter details');
  replaceExactText(root, 'h5', 'Current linked encounters', 'Linked encounter details');
}
