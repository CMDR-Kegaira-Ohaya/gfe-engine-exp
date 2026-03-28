function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderDocumentsPanel(container, state) {
  if (!container) return;

  const bundle = state.bundle;
  if (!bundle) {
    container.innerHTML = '<div class="documents-empty">Documents will appear here when a case loads.</div>';
    return;
  }

  const active = state.activeDocument || 'source';
  const sourceText = bundle.source?.text || '';
  const narrativeText = bundle.narrative?.text || '';

  container.innerHTML = `
    <div class="documents-head">
      <div>
        <div class="eyebrow">Documents</div>
        <h2>Source and narrative</h2>
      </div>
      <div class="doc-tabs">
        <button type="button" class="doc-tab${active === 'source' ? ' active' : ''}" data-document-tab="source">Source</button>
        <button type="button" class="doc-tab${active === 'narrative' ? ' active' : ''}" data-document-tab="narrative">Narrative</button>
      </div>
    </div>
    <div class="documents-body">
      ${active === 'source'
        ? (sourceText
            ? `<pre>${esc(sourceText)}</pre>`
            : '<div class="documents-empty">Source case is missing for this item.</div>')
        : (narrativeText
            ? `<pre>${esc(narrativeText)}</pre>`
            : '<div class="documents-empty">Narrative return is not yet available for this item.</div>')}
    </div>
  `;
}
