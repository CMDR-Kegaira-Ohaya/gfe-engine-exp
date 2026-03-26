(() => {
  const appShell = document.querySelector('.app-shell');
  const notice = document.getElementById('notice');
  if (!appShell || !notice) return;

  function ensureBanner() {
    let banner = document.getElementById('workflow-banner');
    if (banner) return banner;

    banner = document.createElement('section');
    banner.id = 'workflow-banner';
    banner.className = 'workflow-banner';
    banner.innerHTML = `
      <div class="workflow-hero">
        <div class="workflow-copy-block">
          <div class="workflow-kicker">Start here</div>
          <h2 class="workflow-title" id="workflow-title">Open a case or import a package</h2>
          <p class="workflow-copy" id="workflow-copy">Choose one path to begin. The case appears in the center panel after it loads, and the deeper inspection surfaces can wait until later.</p>
        </div>
        <div class="workflow-actions">
          <button class="workflow-primary" type="button" data-workflow-primary></button>
          <button class="ghost workflow-secondary" type="button" data-workflow-open>Browse canonical cases</button>
          <button class="ghost workflow-secondary" type="button" data-workflow-import>Import local package</button>
        </div>
      </div>
      <div class="workflow-steps">
        <article class="workflow-step" data-workflow-step="open">
          <div class="workflow-step-head">
            <div class="workflow-step-kicker">Step 1</div>
            <span class="workflow-chip" data-workflow-chip="open">Now</span>
          </div>
          <h3 class="workflow-step-title">Load one case</h3>
          <p class="workflow-step-copy">Start by browsing the canonical catalog or importing a local package. You only need one path to begin.</p>
        </article>
        <article class="workflow-step" data-workflow-step="review">
          <div class="workflow-step-head">
            <div class="workflow-step-kicker">Step 2</div>
            <span class="workflow-chip" data-workflow-chip="review">Next</span>
          </div>
          <h3 class="workflow-step-title">Review what loaded</h3>
          <p class="workflow-step-copy">Read the case first. The title, source, and case tab tell you what is currently loaded.</p>
        </article>
        <article class="workflow-step" data-workflow-step="continue">
          <div class="workflow-step-head">
            <div class="workflow-step-kicker">Step 3</div>
            <span class="workflow-chip" data-workflow-chip="continue">Later</span>
          </div>
          <h3 class="workflow-step-title">Continue only if needed</h3>
          <p class="workflow-step-copy">Use reading handoff when you want GPT help. Encoding, timeline, and atlas stay available for deeper inspection later.</p>
        </article>
      </div>
    `;
    notice.insertAdjacentElement('afterend', banner);
    bindBannerActions(banner);
    return banner;
  }

  function clickMode(mode) {
    const button = document.querySelector(`[data-action-mode="${mode}"]`);
    if (!button) return false;
    button.click();
    return true;
  }

  function clickTab(tab) {
    const button = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
    if (!button) return false;
    button.click();
    return true;
  }

  function openImportPicker() {
    clickMode('package');
    const input = document.querySelector('[data-package-file-input]');
    if (!input) return false;
    input.click();
    return true;
  }

  function bindBannerActions(banner) {
    banner.addEventListener('click', (event) => {
      const target = event.target.closest('button');
      if (!target) return;

      if (target.hasAttribute('data-workflow-open')) {
        clickMode('open');
        return;
      }

      if (target.hasAttribute('data-workflow-import')) {
        openImportPicker();
        return;
      }

      if (!target.hasAttribute('data-workflow-primary')) return;

      const action = target.dataset.workflowAction || 'open';
      if (action === 'open') {
        clickMode('open');
        return;
      }
      if (action === 'import') {
        openImportPicker();
        return;
      }
      if (action === 'case') {
        clickTab('case');
        return;
      }
      if (action === 'reading-tab') {
        clickTab('reading');
        return;
      }
      if (action === 'reading-handoff') {
        clickMode('reading');
        return;
      }
      if (action === 'encoding') {
        clickTab('encoding');
      }
    });
  }

  function deriveState() {
    const slug = document.getElementById('current-slug')?.textContent?.trim() || '';
    const title = document.getElementById('current-title')?.textContent?.trim() || 'the current case';
    const status = document.getElementById('status-badge')?.textContent?.trim() || '';
    const activeTab = document.querySelector('.tab-btn.active')?.dataset?.tab || 'case';

    const hasCase = Boolean(slug && slug !== 'No case open');
    const hasReading = /reading (available|imported)/i.test(status);
    const readingMissing = hasCase && !hasReading;

    return { hasCase, hasReading, readingMissing, activeTab, title };
  }

  function setStepState(stepName, stateLabel) {
    const article = document.querySelector(`[data-workflow-step="${stepName}"]`);
    const chip = document.querySelector(`[data-workflow-chip="${stepName}"]`);
    if (!article || !chip) return;
    article.classList.remove('current', 'done', 'later');
    article.classList.add(stateLabel);
    chip.textContent =
      stateLabel === 'current' ? 'Now' :
      stateLabel === 'done' ? 'Done' :
      stateLabel === 'later' ? 'Later' :
      'Next';
  }

  function applyHierarchyClasses({ hasCase, hasReading, readingMissing, activeTab }) {
    appShell.classList.toggle('workflow-no-case', !hasCase);
    appShell.classList.toggle('workflow-has-case', hasCase);
    appShell.classList.toggle('workflow-on-case-tab', hasCase && activeTab === 'case');
    appShell.classList.toggle('workflow-away-from-case', hasCase && activeTab !== 'case');
    appShell.classList.toggle('workflow-has-reading', hasReading);
    appShell.classList.toggle('workflow-reading-missing', readingMissing);
  }

  function updateBanner() {
    const banner = ensureBanner();
    const state = deriveState();
    const { hasCase, hasReading, readingMissing, activeTab, title } = state;

    const primary = banner.querySelector('[data-workflow-primary]');
    const workflowTitle = banner.querySelector('#workflow-title');
    const workflowCopy = banner.querySelector('#workflow-copy');

    applyHierarchyClasses(state);

    if (!hasCase) {
      workflowTitle.textContent = 'Start with one clear choice';
      workflowCopy.textContent = 'Browse a canonical case or import a local package. After one case loads, the case tab becomes the main place to read first.';
      primary.textContent = 'Browse canonical cases';
      primary.dataset.workflowAction = 'open';
      setStepState('open', 'current');
      setStepState('review', 'later');
      setStepState('continue', 'later');
      return;
    }

    if (activeTab !== 'case') {
      workflowTitle.textContent = `“${title}” is loaded`);
      workflowCopy.textContent = 'The case is already open. Return to the case tab first whenever you want the simplest human-readable starting point.';
      primary.textContent = 'Read the case';
      primary.dataset.workflowAction = 'case';
      setStepState('open', 'done');
      setStepState('review', 'current');
      setStepState('continue', hasReading ? 'done' : 'later');
      return;
    }

    workflowTitle.textContent = `Review “${title}” first`;
    if (readingMissing) {
      workflowCopy.textContent = 'The case is loaded. Read it here first, then open reading handoff when you want GPT to draft a reading from the loaded case context.';
      primary.textContent = 'Open reading handoff';
      primary.dataset.workflowAction = 'reading-handoff';
      setStepState('open', 'done');
      setStepState('review', 'done');
      setStepState('continue', 'current');
      return;
    }

    workflowCopy.textContent = 'The case and a reading are available. Stay on the case for source review, or jump to the saved reading when you want the drafted interpretation.';
    primary.textContent = 'Open case reading';
    primary.dataset.workflowAction = 'reading-tab';
    setStepState('open', 'done');
    setStepState('review', 'done');
    setStepState('continue', 'current');
  }

  let scheduled = false;
  function scheduleUpdate() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      updateBanner();
    });
  }

  const observer = new MutationObserver(scheduleUpdate);
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'data-tab'],
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleUpdate, { once: true });
  } else {
    scheduleUpdate();
  }
})();
