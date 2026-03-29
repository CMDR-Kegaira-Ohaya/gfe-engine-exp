
import { escapeHtml } from '../app/helpers.js';

export function renderRepoPanel(container, state) {
  if (!container) return;

  const repoBridge = state.repoBridge || {};
  const productNote = repoBridge.productNote || {};
  const caseSource = repoBridge.caseSource || {};
  const noteDraft = state.noteDraft || '';
  const noteBaseline = state.noteBaseline || '';
  const noteSource = state.noteSource || 'unknown';
  const caseDraft = state.caseSourceDraft || '';
  const caseBaseline = state.caseSourceBaseline || '';
  const caseSourceOrigin = state.caseSourceSource || 'unknown';
  const modeLabel = repoBridge.mode === 'repo' ? 'repo-connected' : 'local-only';
  const noteSaveLabel = productNote.saving ? 'Saving…' : 'Save product note';
  const noteDeleteLabel = productNote.deleting ? 'Deleting…' : 'Delete product note';
  const caseSaveLabel = caseSource.saving ? 'Saving…' : 'Save controlled case source';
  const noteDraftState = summarizeDraftState(noteBaseline, noteDraft);
  const caseDraftState = summarizeDraftState(caseBaseline, caseDraft);
  const saveRowLabel = repoBridge.mode === 'repo' ? 'Last verified write' : 'Last local save';
  const deleteRowLabel = repoBridge.mode === 'repo' ? 'Last verified delete' : 'Last local delete';
  const deleteReady = Boolean(productNote.lowLevelDeleteAvailable);
  const noteDeleteBlockedByDraft = noteDraftState.dirty;
  const noteDeleteBlockedByMode = repoBridge.mode !== 'repo' || !deleteReady;
  const noteDeleteDisabled = noteDeleteBlockedByDraft || noteDeleteBlockedByMode || productNote.saving || productNote.deleting;
  const deleteGuardLabel = noteDeleteBlockedByDraft
    ? 'Delete blocked until the loaded baseline is clean.'
    : noteDeleteBlockedByMode
      ? 'Delete requires repo mode and low-level git delete support.'
      : 'Delete ready for this product-local path.';

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
      <div class="detail-row"><span>Draft state</span><strong>${escapeHtml(noteDraftState.label)}</strong></div>
      <div class="detail-row"><span>${escapeHtml(saveRowLabel)}</span><strong>${escapeHtml(formatTimestamp(productNote.lastSavedAt))}</strong></div>
      <div class="detail-row"><span>Verified SHA</span><strong>${escapeHtml(productNote.lastSavedSha || '—')}</strong></div>
      <div class="detail-row"><span>Low-level delete</span><strong>${escapeHtml(deleteReady ? 'ready' : 'unavailable')}</strong></div>
      <div class="detail-row"><span>${escapeHtml(deleteRowLabel)}</span><strong>${escapeHtml(formatTimestamp(productNote.lastDeletedAt))}</strong></div>
      <div class="repo-write-badges">
        ${renderDraftBadge(noteDraftState)}
        ${renderDeleteBadge(deleteReady, noteDeleteBlockedByDraft)}
      </div>
      <p>${escapeHtml(productNote.message || 'No product-note status yet.')}</p>
      <div class="repo-guard-note">This path is product-local. Restore returns to the currently loaded baseline and does not touch case truth.</div>
      <label class="moment-subhead" for="product-note-input">Product note</label>
      <textarea id="product-note-input" class="repo-textarea" data-repo-note-input="true">${escapeHtml(noteDraft)}</textarea>
      <div class="repo-presave-summary ${noteDraftState.dirty ? 'ready' : 'idle'}">
        <div class="moment-subhead">Pre-save summary</div>
        <div class="detail-row"><span>Scope</span><strong>product-local</strong></div>
        <div class="detail-row"><span>Will write to</span><strong>${escapeHtml(productNote.targetPath || '—')}</strong></div>
        <div class="detail-row"><span>Connector mode</span><strong>${escapeHtml(modeLabel)}</strong></div>
        <div class="detail-row"><span>Draft state</span><strong>${escapeHtml(noteDraftState.dirty ? noteDraftState.label : 'No unsaved changes')}</strong></div>
      </div>
      <div class="repo-actions repo-actions-split">
        <button type="button" class="repo-secondary-button" data-repo-action="restore-product-note" ${!noteDraftState.dirty || productNote.saving || productNote.deleting ? 'disabled' : ''}>Restore loaded</button>
        <button type="button" class="repo-save-button" data-repo-action="save-product-note" ${productNote.saving || productNote.deleting || !noteDraftState.dirty ? 'disabled' : ''}>${escapeHtml(noteSaveLabel)}</button>
      </div>
      <div class="repo-presave-summary ${noteDeleteDisabled ? 'idle' : 'ready'}">
        <div class="moment-subhead">Guarded delete summary</div>
        <div class="detail-row"><span>Scope</span><strong>product-local</strong></div>
        <div class="detail-row"><span>Will remove</span><strong>${escapeHtml(productNote.targetPath || '—')}</strong></div>
        <div class="detail-row"><span>Connector mode</span><strong>${escapeHtml(modeLabel)}</strong></div>
        <div class="detail-row"><span>Delete guard</span><strong>${escapeHtml(deleteGuardLabel)}</strong></div>
      </div>
      <div class="repo-actions">
        <button type="button" class="repo-secondary-button" data-repo-action="delete-product-note" ${noteDeleteDisabled ? 'disabled' : ''}>${escapeHtml(noteDeleteLabel)}</button>
      </div>
    </div>

    <div class="context-section repo-section">
      <div class="eyebrow">Controlled case write</div>
      ${state.slug
        ? `
          <div class="detail-row"><span>Target path</span><strong>${escapeHtml(caseSource.targetPath || `cases/${state.slug}/source/case.md`)}</strong></div>
          <div class="detail-row"><span>Draft source</span><strong>${escapeHtml(caseSourceOrigin)}</strong></div>
          <div class="detail-row"><span>Draft state</span><strong>${escapeHtml(caseDraftState.label)}</strong></div>
          <div class="detail-row"><span>${escapeHtml(saveRowLabel)}</span><strong>${escapeHtml(formatTimestamp(caseSource.lastSavedAt))}</strong></div>
          <div class="detail-row"><span>Verified SHA</span><strong>${escapeHtml(caseSource.lastSavedSha || '—')}</strong></div>
          <div class="repo-write-badges">
            ${renderDraftBadge(caseDraftState)}
          </div>
          <p>${escapeHtml(caseSource.message || 'No case-source status yet.')}</p>
          <div class="repo-guard-note">This path is controlled. Restore returns to the currently loaded case baseline before any new guarded save.</div>
          <label class="moment-subhead" for="case-source-input">Current case source</label>
          <textarea id="case-source-input" class="repo-textarea repo-textarea-large" data-case-source-input="true">${escapeHtml(caseDraft)}</textarea>
          <div class="repo-presave-summary ${caseDraftState.dirty ? 'ready' : 'idle'}">
            <div class="moment-subhead">Pre-save summary</div>
            <div class="detail-row"><span>Scope</span><strong>controlled case</strong></div>
            <div class="detail-row"><span>Will write to</span><strong>${escapeHtml(caseSource.targetPath || `cases/${state.slug}/source/case.md`)}</strong></div>
            <div class="detail-row"><span>Connector mode</span><strong>${escapeHtml(modeLabel)}</strong></div>
            <div class="detail-row"><span>Draft state</span><strong>${escapeHtml(caseDraftState.dirty ? caseDraftState.label : 'No unsaved changes')}</strong></div>
          </div>
          <div class="repo-actions repo-actions-split">
            <button type="button" class="repo-secondary-button" data-repo-action="restore-case-source" ${!caseDraftState.dirty || caseSource.saving ? 'disabled' : ''}>Restore loaded</button>
            <button type="button" class="repo-save-button" data-repo-action="save-case-source" ${caseSource.saving || !caseDraftState.dirty ? 'disabled' : ''}>${escapeHtml(caseSaveLabel)}</button>
          </div>
        `
        : '<p>No case loaded yet. Controlled case save becomes available after a case opens.</p>'}
    </div>
  `;
}

function summarizeDraftState(baseline, draft) {
  const baselineText = String(baseline ?? '');
  const draftText = String(draft ?? '');
  const dirty = baselineText !== draftText;
  const lineDelta = countLines(draftText) - countLines(baselineText);
  const charDelta = draftText.length - baselineText.length;

  return {
    dirty,
    label: dirty
      ? `Unsaved (${formatSigned(lineDelta)} lines, ${formatSigned(charDelta)} chars)`
      : 'Clean',
  };
}

function renderDraftBadge(draftState) {
  return `<span class="artifact-pill ${draftState.dirty ? 'waiting' : 'present'}">${escapeHtml(draftState.dirty ? 'unsaved draft' : 'baseline matched')}</span>`;
}

function renderDeleteBadge(deleteReady, blockedByDraft) {
  const label = blockedByDraft
    ? 'delete blocked by draft'
    : deleteReady
      ? 'low-level delete ready'
      : 'low-level delete unavailable';
  const stateClass = blockedByDraft ? 'waiting' : (deleteReady ? 'present' : 'missing');
  return `<span class="artifact-pill ${stateClass}">${escapeHtml(label)}</span>`;
}

function countLines(value) {
  if (!value) return 0;
  return String(value).split('\n').length;
}

function formatSigned(value) {
  const number = Number(value) || 0;
  if (number > 0) return `+${number}`;
  return `${number}`;
}

function formatTimestamp(value) {
  if (!value) return 'Not recorded yet';
  return value;
}
