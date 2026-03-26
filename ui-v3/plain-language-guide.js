(() => {
  const centerPanel = document.querySelector('.center-panel');
  if (!centerPanel) return;

  let lastHasCase = false;

  function ensureGuide() {
    let guide = document.getElementById('plain-language-guide');
    if (guide) return guide;

    const caseHeader = centerPanel.querySelector('.case-header');
    if (!caseHeader) return null;

    guide = document.createElement('section');
    guide.id = 'plain-language-guide';
    guide.className = 'plain-language-guide';
    guide.innerHTML = `
      <div class="plain-language-guide-head">
        <div class="plain-language-kicker">What you are looking at</div>
        <h3 class="plain-language-title" id="plain-language-title">Open a case to begin</h3>
        <p class="plain-language-copy" id="plain-language-copy">This area explains the current tab in one short sentence so you do not have to scan the whole page.</p>
      </div>
      <details class="plain-language-details" id="plain-language-details">
        <summary class="plain-language-summary">Explain tabs and status</summary>
        <div class="plain-language-details-body">
          <div class="plain-language-tab-row">
            <article class="plain-language-tab" data-explain-tab="case">
              <h3 class="plain-language-tab-title">Case</h3>
              <p class="plain-language-tab-copy">The original case material. Start here before you use the technical views.</p>
            </article>
            <article class="plain-language-tab" data-explain-tab="encoding">
              <h3 class="plain-language-tab-title">Case encoding</h3>
              <p class="plain-language-tab-copy">The structured map of the case. Use this when you want to inspect how the case was broken down.</p>
            </article>
            <article class="plain-language-tab" data-explain-tab="reading">
              <h3 class="plain-language-tab-title">Case reading</h3>
              <p class="plain-language-tab-copy">The drafted interpretation of the case. This is the human-facing reading surface.</p>
            </article>
          </div>
          <div class="plain-language-badge-row">
            <div class="plain-language-badge">
              <div class="plain-language-badge-label">Source</div>
              <div class="plain-language-badge-value" id="plain-language-source">Where this case came from.</div>
            </div>
            <div class="plain-language-badge">
              <div class="plain-language-badge-label">Status</div>
              <div class="plain-language-badge-value" id="plain-language-status">What is available right now.</div>
            </div>
            <div class="plain-language-badge">
              <div class="plain-language-badge-label">Validation</div>
              <div class="plain-language-badge-value" id="plain-language-validation">Whether the loaded package looks okay.</div>
            </div>
          </div>
        </div>
      </details>
    `;

    const tabs = centerPanel.querySelector('.tabs');
    if (tabs) centerPanel.insertBefore(guide, tabs);
    else caseHeader.insertAdjacentElement('afterend', guide);
    return guide;
  }

  function getText(id) {
    return document.getElementById(id)?.textContent?.trim() || '';
  }

  function deriveState() {
    const slug = getText('current-slug');
    const title = getText('current-title') || 'this case';
    const sourceText = getText('source-badge');
    const statusText = getText('status-badge');
    const validationText = getText('validation-badge');
    const activeTab = document.querySelector('.tab-btn.active')?.dataset?.tab || 'case';
    const hasCase = Boolean(slug && slug !== 'No case open');
    const hasReading = /reading (available|imported)/i.test(statusText);
    return { hasCase, title, sourceText, statusText, validationText, activeTab, hasReading };
  }

  function buildHeadline(state) {
    if (!state.hasCase) {
      return {
        title: 'Open a case to begin',
        copy: 'This area explains the current tab in one short sentence so you do not have to scan the whole page.',
      };
    }

    if (state.activeTab === 'encoding') {
      return {
        title: `Viewing case encoding for “${state.title}”`,
        copy: 'This is the technical breakdown of the case. Return to the Case tab whenever you want the source-first view again.',
      };
    }

    if (state.activeTab === 'reading') {
      return {
        title: state.hasReading
          ? `Viewing case reading for “${state.title}”`
          : `Viewing the reading slot for “${state.title}”`,
        copy: state.hasReading
          ? 'This tab shows the drafted interpretation. Go back to Case whenever you want the original source material.'
          : 'This tab will show a drafted reading after you use reading handoff with GPT.',
      };
    }

    return {
      title: `Viewing case for “${state.title}”`,
      copy: 'This is the original source material. Start here before moving to encoding, reading, timeline, or atlas.',
    };
  }

  function explainSource(text, hasCase) {
    if (!hasCase) return 'No source is loaded yet.';
    if (/local/i.test(text)) return 'This case came from a local package you imported.';
    if (/(canonical|repo)/i.test(text)) return 'This case came from the canonical repo catalog.';
    return text || 'Where this case came from.';
  }

  function explainStatus(text, hasCase, hasReading) {
    if (!hasCase) return 'No case is loaded yet.';
    if (hasReading) return 'The case and a reading are both available right now.';
    if (/encoding/i.test(text)) return 'The case is available and the encoding is loaded. The reading still needs to be drafted next.';
    return text || 'What is available right now.';
  }

  function explainValidation(text, hasCase) {
    if (!hasCase) return 'Validation will appear after a case loads.';
    if (/(ok|pass|valid)/i.test(text)) return 'The loaded case looks okay from the current validation signals.';
    if (/unknown/i.test(text)) return 'The UI has not confirmed the validation state yet.';
    return text || 'Whether the loaded package looks okay.';
  }

  function updateSubtitle(headline) {
    const subtitle = document.getElementById('current-subtitle');
    if (subtitle) subtitle.textContent = headline.copy;
  }

  function updateGuide() {
    const guide = ensureGuide();
    if (!guide) return;

    const state = deriveState();
    const headline = buildHeadline(state);
    const details = guide.querySelector('#plain-language-details');

    guide.classList.toggle('compact', state.hasCase);
    if (!state.hasCase) {
      details.open = false;
    } else if (!lastHasCase) {
      details.open = false;
    }
    lastHasCase = state.hasCase;

    const title = guide.querySelector('#plain-language-title');
    const copy = guide.querySelector('#plain-language-copy');
    if (title) title.textContent = headline.title;
    if (copy) copy.textContent = headline.copy;

    updateSubtitle(headline);

    guide.querySelectorAll('[data-explain-tab]').forEach((card) => {
      const isActive = card.dataset.explainTab === state.activeTab;
      card.classList.toggle('active', isActive);
      card.classList.toggle('muted', !state.hasCase || !isActive);
    });

    const sourceExplainer = guide.querySelector('#plain-language-source');
    const statusExplainer = guide.querySelector('#plain-language-status');
    const validationExplainer = guide.querySelector('#plain-language-validation');

    if (sourceExplainer) sourceExplainer.textContent = explainSource(state.sourceText, state.hasCase);
    if (statusExplainer) statusExplainer.textContent = explainStatus(state.statusText, state.hasCase, state.hasReading);
    if (validationExplainer) validationExplainer.textContent = explainValidation(state.validationText, state.hasCase);
  }

  let scheduled = false;
  function scheduleUpdate() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      updateGuide();
    });
  }

  const observer = new MutationObserver(scheduleUpdate);
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'data-tab', 'open'],
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleUpdate, { once: true });
  } else {
    scheduleUpdate();
  }
})();
