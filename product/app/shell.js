export function createShell(root) {
  if (!root) throw new Error('Missing #app root');

  root.innerHTML = `
    <div class="app-shell layered-workbench">
      <header class="topbar panel compact-topbar">
        <div class="topbar-main">
          <div class="eyebrow">GFE Product Area</div>
          <h1 id="current-title">Product Workbench</h1>
        </div>
        <div class="topbar-meta">
          <div id="current-mode">Lens: Structure</div>
          <div id="notice">Booting…</div>
        </div>
      </header>

      <main class="workspace-frame">
        <aside class="left-column workbench-rail">
          <section class="panel sidebar case-rail">
            <div class="panel-head compact-panel-head">
              <h2>Cases</h2>
              <p>Keep the case switcher compact, readable, and always available.</p>
            </div>
            <div id="case-list" class="case-list rail-scroll"></div>
          </section>
        </aside>

        <section class="center-column workbench-main">
          <section class="panel current-strip compact-strip">
            <div class="strip-identity">
              <div class="eyebrow">Specified View</div>
              <div id="current-slug">No case open</div>
            </div>
            <div class="current-tools">
              <div id="lens-bar" class="lens-bar"></div>
              <div id="filter-bar" class="filter-bar"></div>
              <div id="current-note" class="status-note">Whole structure first. Source and narrative remain stable companions.</div>
            </div>
          </section>

          <section id="map-view" class="panel map-view spatial-plane" aria-label="Specified View"></section>
        </section>

        <aside class="right-column workbench-rail">
          <section id="context-panel" class="panel context-panel inspector-plane"></section>

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
      </main>

      <section class="panel bottom-dock documents-dock" aria-label="Stable documents dock">
        <div id="documents-panel" class="documents-panel dock-documents"></div>
      </section>
    </div>
  `;

  return {
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
