// Workbench v3: Layout Debug HUD
// Purpose: allow users to capture precise layout/zoom metrics without screen sharing.
// Safe: UI-only. No engine/solver interaction.

(function () {
  const $ = (sel) => document.querySelector(sel);

  function num(n) {
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
  }

  function rectOf(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: num(r.x), y: num(r.y), w: num(r.width), h: num(r.height) };
  }

  function getActiveTab() {
    const btn = document.querySelector('#tabs .tab-btn.active');
    return btn?.dataset?.tab ?? null;
  }

  function collect() {
    const vv = window.visualViewport;
    const grid = $('.grid');
    const left = $('.left-panel');
    const center = $('.center-panel');
    const right = $('.right-panel');
    const tabContent = $('#tab-content');
    const timeline = $('#timeline');
    const atlas = $('#atlas');
    const docsPanel = $('#documents-panel');
    const focusInspector = $('#focus-inspector');

    return {
      time: new Date().toISOString(),
      location: window.location.href,
      viewport: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
        visualViewport: vv
          ? {
              width: num(vv.width),
              height: num(vv.height),
              scale: num(vv.scale),
              offsetLeft: num(vv.offsetLeft),
              offsetTop: num(vv.offsetTop),
              pageLeft: num(vv.pageLeft),
              pageTop: num(vv.pageTop),
            }
          : null,
      },
      activeTab: getActiveTab(),
      rects: {
        grid: rectOf(grid),
        leftPanel: rectOf(left),
        centerPanel: rectOf(center),
        rightPanel: rectOf(right),
        tabContent: rectOf(tabContent),
        timeline: rectOf(timeline),
        atlas: rectOf(atlas),
        documentsPanel: rectOf(docsPanel),
        focusInspector: rectOf(focusInspector),
      },
      computed: {
        gridTemplateColumns: grid ? getComputedStyle(grid).gridTemplateColumns : null,
        gridTemplateRowsCenter: center ? getComputedStyle(center).gridTemplateRows : null,
        tabContentOverflow: tabContent ? getComputedStyle(tabContent).overflow : null,
      },
      notes: [
        'If browser zoom is not 100%, visualViewport.scale and devicePixelRatio will reflect it.',
        'If the center area is blank check activeTab and tabContent height.',
      ],
    };
  }

  function ensureButton() {
    if ($('#gfe-layout-debug-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'gfe-layout-debug-btn';
    btn.type = 'button';
    btn.textContent = 'Layout debug';
    btn.title = 'Open layout debug overlay (captures zoom + panel sizes)';
    document.body.appendChild(btn);

    btn.addEventListener('click', () => toggleOverlay());
  }

  function overlayHtml(reportText) {
    return `
      <div id="gfe-layout-debug-overlay" role="dialog" aria-label="Layout debug">
        <div class="header">
          <div class="left">
            <div class="headline">Layout debug</div>
            <div class="sub">Copy this report into chat. It includes zoom + panel sizes.</div>
          </div>
          <div class="btn-row">
            <button type="button" id="gfe-layout-debug-copy">Copy</button>
            <button type="button" id="gfe-layout-debug-outline">Toggle outlines</button>
            <button type="button" id="gfe-layout-debug-close">Close</button>
          </div>
        </div>
        <div class="body">
          <pre id="gfe-layout-debug-pre"></pre>
        </div>
      </div>
`;
  }

  function toggleOverlay(forceOpen = null) {
    const existing = $('#gfe-layout-debug-overlay');
    const shouldOpen = forceOpen === null ? !existing : forceOpen;

    if (!shouldOpen) {
      existing?.remove();
      return;
    }

    const report = collect();
    const text = JSON.stringify(report, null, 2);

    document.body.insertAdjacentHTML('beforeend', overlayHtml(text));
    const pre = $('#gfe-layout-debug-pre');
    if (pre) pre.textContent = text;

    $('#gfe-layout-debug-close')?.addEventListener('click', () => toggleOverlay(false));
    $('#gfe-layout-debug-outline')?.addEventListener('click', () => {
      document.body.classList.toggle('gfe-outline-boxes');
      const refreshed = JSON.stringify(collect(), null, 2);
      if (pre) pre.textContent = refreshed;
    });
    $('#gfe-layout-debug-copy')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pre?.textContent ?? text);
        const b = $('#gfe-layout-debug-copy');
        if (b) {
          const old = b.textContent;
          b.textContent = 'Copied';
          setTimeout(() => (b.textContent = old), 900);
         }
      } catch (e) {
        // Fallback: select text for manual copy
        try {
          const range = document.createRange();
          range.selectNodeContents(pre);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        } catch (er) {
          // ignore
        }
      }
    });
  }

  // mount on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureButton, { once: true });
  } else {
    ensureButton();
  }
})();
