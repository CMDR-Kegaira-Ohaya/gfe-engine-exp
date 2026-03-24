function fieldTitleFromView(view) {
  const heading = view.querySelector('.atlas-heading')?.textContent?.trim();
  return heading || 'Atlas field';
}

function fieldNoteFromView(view) {
  const note = view.querySelector('.atlas-note')?.textContent?.trim();
  return note || 'Semantic field staging area.';
}

function fieldPillsFromView(view) {
  const statePills = view.querySelector('.atlas-state-pills');
  return statePills ? statePills.cloneNode(true).outerHTML : '';
}

function applyAtlasMapStage(root = document) {
  root.querySelectorAll('#atlas > .atlas-view').forEach((view) => {
    if (view.dataset.mapStaged === 'true') return;

    const topRow = view.querySelector('.atlas-top-row');
    const stateStrip = view.querySelector('.atlas-state-strip');
    const provenance = view.querySelector('.atlas-provenance-strip');
    const lens = view.querySelector('.atlas-lens-shell');
    const note = view.querySelector('.atlas-note');

    const detailNodes = Array.from(view.children).filter((node) => ![
      topRow,
      stateStrip,
      provenance,
      lens,
      note,
    ].includes(node));

    const shell = document.createElement('div');
    shell.className = 'atlas-map-shell';

    const field = document.createElement('section');
    field.className = 'atlas-map-field';
    field.innerHTML = `
      <div class="atlas-map-field-head">
        <div class="group-label">Atlas field</div>
        <h5 class="atlas-map-field-title">${fieldTitleFromView(view)}</h5>
        <p class="atlas-map-field-note">${fieldNoteFromView(view)}</p>
      </div>
      <div class="atlas-map-field-meta">${fieldPillsFromView(view)}</div>
      <div class="atlas-map-placeholder" aria-hidden="true">
        <div class="atlas-map-ring atlas-map-ring--a"></div>
        <div class="atlas-map-ring atlas-map-ring--b"></div>
        <div class="atlas-map-vector atlas-map-vector--a"></div>
        <div class="atlas-map-vector atlas-map-vector--b"></div>
        <div class="atlas-map-node atlas-map-node--anchor-a"></div>
        <div class="atlas-map-node atlas-map-node--focus"></div>
        <div class="atlas-map-node atlas-map-node--anchor-b"></div>
      </div>
    `;

    const dock = document.createElement('section');
    dock.className = 'atlas-detail-dock';
    dock.innerHTML = `
      <div class="atlas-detail-dock-head">
        <div class="atlas-detail-dock-copy">
          <div class="group-label">Atlas detail</div>
          <h5 class="atlas-detail-dock-title">Current inspection</h5>
          <p class="atlas-detail-dock-note">Structured detail stays fixed here while the atlas grows toward map behavior.</p>
        </div>
      </div>
      <div class="atlas-detail-dock-body"></div>
    `;

    const dockBody = dock.querySelector('.atlas-detail-dock-body');
    detailNodes.forEach((node) => dockBody.appendChild(node));

    view.appendChild(shell);
    shell.appendChild(field);
    shell.appendChild(dock);
    view.dataset.mapStaged = 'true';
  });
}

const observer = new MutationObserver(() => {
  applyAtlasMapStage();
});

applyAtlasMapStage();
observer.observe(document.body, {
  childList: true,
  subtree: true,
});
