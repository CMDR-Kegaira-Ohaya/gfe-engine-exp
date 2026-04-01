export function createShell(root) {
  if (!root) throw new Error('Missing #app root');

  root.innerHTML = `
    <div class="app-shell">
      <header class="topbar panel">
        <div>
          <div class="eyebrow">GFE Product Area</div>
          <h1 id="current-title">Product Workbench</h1>
        </div>
        <div class="topbar-meta">
          <div id="current-mode">Lens: Structure</div>
          <div id="notice">Booting…</div>
        </div>
      </header>

      <main class="layout">
        <aside class="left-column">
          <section class="panel sidebar">
            <div class="panel-head">
              <h2>Overall View</h2>
              <p>Choose a case, then inspect the whole transformed case map.</p>
            </div>
            <div id="case-list" class="case-list"></div>
          </section>

          <section id="documents-panel" class="panel documents-panel sidebar-documents"></section>
        </aside>

        <section class="center-column">
          <section class="panel current-strip">
            <div>
              <div class="eyebrow">Specified View</div>
              <div id="current-slug">No case open</div>
            </div>
            <div class="current-tools">
              <div id="lens-bar" class="lens-bar"></div>
              <div id="filter-bar" class="filter-bar"></div>
              <div id="current-note" class="status-note">Whole structure first. Source and narrative remain stable companions.</div>
            </div>
          </section>

          <section id="map-view" class="panel map-view" aria-label="Specified View"></section>
        </section>

        <aside class="right-column">
          <section id="context-panel" class="panel context-panel"></section>

          <details class="panel repo-panel-shell">
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
