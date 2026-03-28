import { escapeHtml } from '../app/helpers.js';

export function renderRepoPanel(container, state) {
  if (!container) return;

  const repoBridge = state.repoBridge || {};
  const productNote = repoBridge.productNote || {};
  const caseSource = repoBridge.caseSource || {};
  const noteDraft = state.noteDraft || '';
  const noteSource = state.noteSource || 'unknown';
  const caseDraft = state.caseSourceDraft || '';
  const caseSourceOrigin = state.caseSourceSource || 'unknown';
  const modeLabel = repoBridge.mode === 'repo' ? 'repo-connected' : 'local-only';
  const noteSaveLabel = productNote.saving ? 'Saving…' : 'Save product note';
  const caseSaveLabel = caseSource.saving ? 'Saving…' : 'Save controlled case source';

  container.innerHTML = `
    <div class="repo-head">
      <div>
        <div class="eyebrow">Repo bridge</div>
        <h2>Guarded save paths</h2>
      </div>
      <div class="repo-mode-pill ${repoBridge.mode === 'repo' ? 'connected' : 'local'}">${escapeHtml(modeLabel)}</div>
    </div>

    <div class="context-section repo-section">
      <div class="eyebrow">Product-local write</div>
      <div class="detail-row"><span>Target path</span><strong>${escapeHtml(productNote.targetPath || '—')}</strong></div>
      <div class="detail-row"><span>Draft source</span><strong>${escapeHtml(noteSource)}</strong></div>
      <div class="detail-row"><span>Last save</span><strong>${escapeHtml(formatTimestamp(productNote.lastSavedAt))}</strong></div>
      <p>${escapeHtml(productNote.message || 'No product-note status yet.')}</p>
      <label class="moment-subhead" for="product-note-input">Product note</label>
      <textarea id="product-note-input" class="repo-textarea" data-repo-note-input="true">${escapeHtml(noteDraft)}</textarea>
      <div class="repo-actions">
        <button type="button" class="repo-save-button" data-repo-action="save-product-note" ${productNote.saving ? 'disabled' : ''}>${escapeHtml(noteSaveLabel)}</button>
      </div>
    </div>

    <div class="context-section repo-section">
      <div class="eyebrow">Controlled case write</div>
      ${state.slug
        ? `
          <div class="detail-row"><span>Target path</span><strong>${escapeHtml(caseSource.targetPath || `cases/${state.slug}/source/case.md`)}</strong></div>
          <div class="detail-row"><span>Draft source</span><strong>${escapeHtml(caseSourceOrigin)}</strong></div>
          <div class="detail-row"><span>Last save</span><strong>${escapeHtml(formatTimestamp(caseSource.lastSavedAt))}</strong></div>
          <p>${escapeHtml(caseSource.message || 'No case-source status yet.')}</p>
          <label class="moment-subhead" for="case-source-input">Current case source</label>
          <textarea id="case-source-input" class="repo-textarea repo-textarea-large" data-case-source-input="true">${escapeHtml(caseDraft)}</textarea>
          <div class="repo-actions">
            <button type="button" class="repo-save-button" data-repo-action="save-case-source" ${caseSource.saving ? 'disabled' : ''}>${escapeHtml(caseSaveLabel)}</button>
          </div>
        `
        : '<p>No case loaded yet. Controlled case save becomes available after a case opens.</p>'}
    </div>
  `;
}

function formatTimestamp(value) {
  if (!value) return 'Not saved yet';
  return value;
}
