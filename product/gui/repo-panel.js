import { escapeHtml } from '../app/helpers.js';

export function renderRepoPanel(container, state) {
  if (!container) return;

  const repoBridge = state.repoBridge || {};
  const noteDraft = state.noteDraft || '';
  const noteSource = state.noteSource || 'unknown';
  const modeLabel = repoBridge.mode === 'repo' ? 'repo-connected' : 'local-only';
  const saveLabel = repoBridge.saving ? 'Saving…' : 'Save product note';

  container.innerHTML = `
    <div class="repo-head">
      <div>
        <div class="eyebrow">Repo bridge</div>
        <h2>Product-local save path</h2>
      </div>
      <div class="repo-mode-pill ${repoBridge.mode === 'repo' ? 'connected' : 'local'}">${escapeHtml(modeLabel)}</div>
    </div>

    <div class="context-section">
      <div class="detail-row"><span>Target path</span><strong>${escapeHtml(repoBridge.targetPath || '—')}</strong></div>
      <div class="detail-row"><span>Draft source</span><strong>${escapeHtml(noteSource)}</strong></div>
      <div class="detail-row"><span>Last save</span><strong>${escapeHtml(formatTimestamp(repoBridge.lastSavedAt))}</strong></div>
    </div>

    <div class="context-section">
      <div class="eyebrow">Bridge status</div>
      <p>${escapeHtml(repoBridge.message || 'No bridge status yet.')}</p>
    </div>

    <div class="context-section">
      <label class="moment-subhead" for="product-note-input">Product note</label>
      <textarea id="product-note-input" class="repo-textarea" data-repo-note-input="true">${escapeHtml(noteDraft)}</textarea>
    </div>

    <div class="repo-actions">
      <button type="button" class="repo-save-button" data-repo-action="save-product-note" ${repoBridge.saving ? 'disabled' : ''}>${escapeHtml(saveLabel)}</button>
    </div>
  `;
}

function formatTimestamp(value) {
  if (!value) return 'Not saved yet';
  return value;
}
