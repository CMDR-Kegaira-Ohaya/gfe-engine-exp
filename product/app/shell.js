export function createShell(root) {
  if (!root) throw new Error('Missing #app root');

  root.innerHTML = `
    <div class="app-shell full-map-mode" data-surface="none">
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

      <aside class="panel drawer drawer-left cases-drawer" data-drawer="cases" aria-label="Cases drawer">
        <div class="drawer-head">
          <div>
            <div class="eyebrow">Drawer</div>
            <h2>Cases</h2>
          </div>
          <button type="button" class="drawer-close" data-close-surface="cases">Close</button>
        </div>
        <div id="case-list" class="case-list drawer-scroll"></div>
      </aside>

      <aside class="panel drawer drawer-right inspector-drawer" data-drawer="inspector" aria-label="Inspector drawer">
        <div class="drawer-head">
          <div>
            <div class="eyebrow">Drawer</div>
            <h2>Inspector</h2>
          </div>
          <button type="button" class="drawer-close" data-close-surface="inspector">Close</button>
        </div>
        <div id="context-panel" class="context-panel drawer-scroll"></div>
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
      </aside>

      <section class="panel tray documents-tray" data-tray="documents" aria-label="Documents tray">
        <div class="tray-head">
          <div>
            <div class="eyebrow">Tray</div>
            <h2>Documents</h2>
          </div>
          <button type="button" class="drawer-close" data-close-surface="documents">Close</button>
        </div>
        <div id="documents-panel" class="documents-panel tray-documents"></div>
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
  };
}
