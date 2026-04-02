export function createShell(root) {
  if (!root) throw new Error('Missing #app root');

  root.innerHTML = `
    <div class="app-shell floating-workbench" data-drawer="none" data-inspector-window="closed" data-documents-window="closed" data-active-window="inspector">
      <header class="topbar panel map-topbar">
        <div class="topbar-main">
          <div class="eyebrow">GFE Product Area</div>
          <h1 id="current-title">Product Workbench</h1>
        </div>
        <div class="topbar-center">
          <div id="current-slug" class="topbar-slug">No case open</div>
          <div id="current-note" class="status-note">Whole structure first. Source and narrative remain stable companions.</div>
        </div>
        <div class="topbar-actions">
          <div id="current-mode">Lens: Structure</div>
          <div id="notice">Booting…</div>
          <div class="surface-toggle-row">
            <button type="button" class="surface-toggle-button" data-ui-surface="cases">Cases</button>
            <button type="button" class="surface-toggle-button" data-ui-surface="documents">Documents</button>
            <button type="button" class="surface-toggle-button" data-ui-surface="inspector">Inspector</button>
          </div>
        </div>
      </header>

      <main class="map-workspace">
        <section class="panel map-stage">
          <div class="map-stage-strip">
            <div id="lens-bar" class="lens-bar"></div>
            <div id="filter-bar" class="filter-bar"></div>
          </div>
          <section id="map-view" class="map-view spatial-plane" aria-label="Specified View"></section>
        </section>
      </main>

      <aside class="panel side-drawer cases-drawer" data-drawer-panel="cases" aria-label="Cases drawer">
        <div class="drawer-head">
          <div>
            <div class="eyebrow">Drawer</div>
            <h2>Cases</h2>
          </div>
          <button type="button" class="drawer-close" data-close-surface="cases">Close</button>
        </div>
        <div id="case-list" class="case-list drawer-scroll"></div>
      </aside>

      <section class="panel floating-window inspector-window" data-floating-window="inspector" aria-label="Inspector window">
        <div class="window-head">
          <div class="window-titlebar" data-window-drag="inspector">
            <div class="eyebrow">Window</div>
            <h2>Inspector</h2>
            <div class="window-hint">Drag to move • Resize from the corner</div>
          </div>
          <div class="window-controls">
            <button type="button" class="drawer-close" data-close-surface="inspector">Close</button>
          </div>
        </div>
        <div class="window-body">
          <div id="context-panel" class="context-panel floating-content"></div>
          <details class="panel repo-panel-shell utility-drawer">
            <summary class="repo-shell-summary">
              <div>
                <div class="eyebrow">Utility</div>
                <strong>Repo tools</strong>
              </div>
              <span class="muted">Collapsed by default</span>
            </summary>
            <div id="repo-panel" class="repo-panel"></div>
          </details>
        </div>
      </section>

      <section class="panel floating-window documents-window" data-floating-window="documents" aria-label="Documents window">
        <div class="window-head">
          <div class="window-titlebar" data-window-drag="documents">
            <div class="eyebrow">Window</div>
            <h2>Documents</h2>
            <div class="window-hint">Drag to move • Resize from the corner</div>
          </div>
          <div class="window-controls">
            <button type="button" class="drawer-close" data-close-surface="documents">Close</button>
          </div>
        </div>
        <div id="documents-panel" class="documents-panel floating-content"></div>
      </section>
    </div>
  `;

  return {
    appShell: root.querySelector('.app-shell'),
    notice: root.querySelector('#notice'),
    currentTitle: root.querySelector('#current-title'),
    currentMode: root.querySelector('#current-mode'),
    currentSlug: root.querySelector('#current-slug'),
    currentNote: root.querySelector('#current-note'),
    lensBar: root.querySelector('#lens-bar'),
    filterBar: root.querySelector('#filter-bar'),
    caseList: root.querySelector('#case-list'),
    mapView: root.querySelector('#map-view'),
    contextPanel: root.querySelector('#context-panel'),
    documentsPanel: root.querySelector('#documents-panel'),
    repoPanel: root.querySelector('#repo-panel'),
    casesDrawer: root.querySelector('[data-drawer-panel="cases"]'),
    inspectorWindow: root.querySelector('[data-floating-window="inspector"]'),
    documentsWindow: root.querySelector('[data-floating-window="documents"]'),
  };
}
