(() => {
  const noticeMap = new Map([
    [
      'Use GPT to generate reading.\nThe panel now shows a suggested handoff cue.',
      'Use GPT with the reading handoff shown here.\nThe panel now shows suggested handoff text.',
    ],
    [
      'Load a local package or jump back to canonical repo cases from here.',
      'Load a local package or jump back to canonical cases from here.',
    ],
    [
      'Browse canonical repo cases from Open case.\nLocal package import remains available in Open case package.',
      'Browse canonical cases from Open case.\nLocal package import remains available in Open case package.',
    ],
    [
      'Suggested reading handoff copied.\nUse GPT to generate reading and save it when ready.',
      'Reading handoff text copied.\nUse it with GPT and save the reading when ready.',
    ],
    [
      'Use GPT to generate reading.\nThe suggested handoff is shown in the side panel.',
      'Use the reading handoff with GPT.\nThe suggested handoff text is shown in the side panel.',
    ],
    [
      'Clipboard access is unavailable here.\nThe suggested GPT handoff is shown in Generate reading.',
      'Clipboard access is unavailable here.\nThe suggested handoff text is shown in Reading handoff.',
    ],
  ]);

  const paragraphMap = new Map([
    [
      'Reading generation stays GPT-side, but the handoff is now clearer here.',
      'Reading stays GPT-side. This panel provides the handoff text.',
    ],
    [
      'Open or import a case, inspect the encoding, then use GPT to generate markdown for the Reading tab.',
      'Open or import a case, inspect the encoding, then use the handoff text with GPT to draft markdown for the Reading tab.',
    ],
    [
      'Generation, save, delete, and promotion stay GPT-side.',
      'Reading, save, delete, and promotion stay GPT-side.',
    ],
    [
      'Open or import a case first, then ask GPT to generate a reading from the loaded encoding and current timeline context.',
      'Open or import a case first, then use the reading handoff with GPT and the loaded encoding plus current timeline context.',
    ],
    [
      'Use the generated markdown in the Workbench v3 Reading tab. Save, delete, and promotion remain GPT-side.',
      'Use the handoff with GPT to draft markdown for the Workbench v3 Reading tab. Save, delete, and promotion remain GPT-side.',
    ],
    [
      'Load a local package here or jump back to the canonical repo catalog.',
      'Load a local package here or jump back to the canonical catalog.',
    ],
  ]);

  const headingMap = new Map([
    ['Generate reading', 'Reading handoff'],
  ]);

  const buttonMap = new Map([
    ['Generate reading', 'Reading handoff'],
    ['Open Generate reading', 'Open reading handoff'],
    ['Copy GPT handoff', 'Copy handoff text'],
    ['Browse repo cases', 'Browse canonical cases'],
  ]);

  function replaceExactText(node, map) {
    const current = node.textContent?.trim();
    if (!current) return;
    const next = map.get(current);
    if (next && node.textContent !== next) node.textContent = next;
  }

  function patchNotice() {
    const notice = document.getElementById('notice');
    if (!notice) return;
    const next = noticeMap.get(notice.textContent);
    if (next && notice.textContent !== next) notice.textContent = next;
  }

  function patchButtons(root = document) {
    root.querySelectorAll('button').forEach((button) => {
      const current = button.textContent?.trim();
      const next = buttonMap.get(current);
      if (next && button.textContent !== next) button.textContent = next;
    });
  }

  function patchParagraphs(root = document) {
    root.querySelectorAll('p').forEach((node) => replaceExactText(node, paragraphMap));
  }

  function patchHeadings(root = document) {
    root.querySelectorAll('h3').forEach((node) => replaceExactText(node, headingMap));
  }

  function patchPre(root = document) {
    root.querySelectorAll('pre').forEach((node) => {
      const text = node.textContent || '';
      let next = text;
      next = next.replace(/^Generate a case reading for /m, 'Draft a case reading for ');
      if (next !== text) node.textContent = next;
    });
  }

  function patchLabels() {
    const deleteBtn = document.getElementById('delete-btn');
    if (deleteBtn && deleteBtn.textContent !== 'Delete (GPT-side)') {
      deleteBtn.textContent = 'Delete (GPT-side)';
    }

    const sidePanelTitle = document.getElementById('side-panel-title');
    if (sidePanelTitle) replaceExactText(sidePanelTitle, headingMap);

    const sidePanelIntro = document.getElementById('side-panel-intro');
    if (sidePanelIntro) replaceExactText(sidePanelIntro, paragraphMap);

    const actionsPanel = document.getElementById('actions-panel');
    if (actionsPanel) patchButtons(actionsPanel);

    const sidePanelBody = document.getElementById('side-panel-body');
    if (sidePanelBody) {
      patchButtons(sidePanelBody);
      patchParagraphs(sidePanelBody);
      patchHeadings(sidePanelBody);
      patchPre(sidePanelBody);

      sidePanelBody.querySelectorAll('.placeholder-note').forEach((node) => {
        if (node.textContent?.trim() === 'Suggested GPT handoff:') {
          node.textContent = 'Suggested handoff text:';
        }
      });
    }

    const tabContent = document.getElementById('tab-content');
    if (tabContent) {
      patchButtons(tabContent);
      patchParagraphs(tabContent);
      patchHeadings(tabContent);
    }
  }

  let scheduled = false;
  function runPatch() {
    scheduled = false;
    patchNotice();
    patchLabels();
  }

  function schedulePatch() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(runPatch);
  }

  const observer = new MutationObserver(schedulePatch);
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedulePatch, { once: true });
  } else {
    schedulePatch();
  }
})();
