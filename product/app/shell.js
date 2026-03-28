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
          <div id="current-mode">Mode: structure</div>
          <div id="notice">Booting…</div>
        </div>
      </header>

      <main class="layout">
        <aside class="panel sidebar">
          <div class="panel-head">
            <h2>Overall View</h2>
            <p>Choose a case, then inspect the whole transformed case map.</p>
          </div>
          <div id="case-list" class="case-list"></div>
        </aside>

        <section class="center-column">
          <section class="panel current-strip">
            <div>
              <div class="eyebrow">Specified View</div>
              <div id="current-slug">No case open</div>
            </div>
            <div class="status-note">Solved structure first. Source and narrative stay secondary.</div>
          </section>

          <section id="map-view" class="panel map-view" aria-label="Specified View"></section>
        </section>

        <aside class="right-column">
          <section id="context-panel" class="panel context-panel"></section>
          <section id="documents-panel" class="panel documents-panel"></section>
        </aside>
      </main>
    </div>
  `;

  return {
    notice: root.querySelector('#notice'),
    currentTitle: root.querySelector('#current-title'),
    currentMode: root.querySelector('#current-mode'),
    currentSlug: root.querySelector('#current-slug'),
    caseList: root.querySelector('#case-list'),
    mapView: root.querySelector('#map-view'),
    contextPanel: root.querySelector('#context-panel'),
    documentsPanel: root.querySelector('#documents-panel'),
  };
}
