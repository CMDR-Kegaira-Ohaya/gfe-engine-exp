const MARKER_POSITIONS = [
  { top: '18%', left: '18%' },
  { top: '26%', left: '66%' },
  { top: '48%', left: '20%' },
  { top: '58%', left: '66%' },
  { top: '72%', left: '36%' },
  { top: '40%', left: '44%' },
];

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

function axisFromSection(section) {
  return section.dataset.axis || section.querySelector('[data-axis]')?.dataset.axis || 'unknown';
}

function markerTextFromSection(section) {
  const heading = section.querySelector('h5')?.textContent?.trim();
  if (heading) return heading;
  const label = section.querySelector('.expression-name,.event-card-title,.group-label')?.textContent?.trim();
  return label || 'Detail';
}

function clearTargeted(dockBody) {
  dockBody.querySelectorAll('.is-targeted').forEach((node) => node.classList.remove('is-targeted'));
}

function activateMarker(field, dockBody, marker, target) {
  field.querySelectorAll('.atlas-map-marker').forEach((node) => node.classList.remove('is-active'));
  clearTargeted(dockBody);
  marker.classList.add('is-active');
  target.classList.add('is-targeted');
  target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function buildMarkers(field, dockBody, targets) {
  const interactives = document.createElement('div');
  interactives.className = 'atlas-map-interactives';

  const focusNode = document.createElement('div');
  focusNode.className = 'atlas-map-focus-node';
  focusNode.setAttribute('aria-hidden', 'true');
  interactives.appendChild(focusNode);

  targets.forEach((target, index) => {
    target.dataset.mapTarget = `atlas-target-${index + 1}`;

    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = 'atlas-map-marker';
    marker.dataset.target = target.dataset.mapTarget;
    marker.dataset.axis = axisFromSection(target);

    const pos = MARKER_POSITIONS[index % MARKER_POSITIONS.length];
    marker.style.top = pos.top;
    marker.style.left = pos.left;

    marker.innerHTML = `
      <span class="atlas-map-label">
        <span class="atlas-map-index">${index + 1}</span>
        <span class="atlas-map-text">${markerTextFromSection(target)}</span>
      </span>
    `;

    marker.addEventListener('click', () => activateMarker(field, dockBody, marker, target));
    interactives.appendChild(marker);
  });

  return interactives;
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
      </div>
    `;

    const dock = document.createElement('section');
    dock.className = 'atlas-detail-dock';
    dock.innerHTML = `
      <div class="atlas-detail-dock-head">
        <div class="atlas-detail-dock-copy">
          <div class="group-label">Atlas detail</div>
          <h5 class="atlas-detail-dock-title">Current inspection</h5>
          <p class="atlas-detail-dock-note">Click markers in the field to move through the current atlas detail.</p>
        </div>
      </div>
      <div class="atlas-detail-dock-body"></div>
    `;

    const dockBody = dock.querySelector('.atlas-detail-dock-body');
    detailNodes.forEach((node) => dockBody.appendChild(node));

    const targets = Array.from(dockBody.querySelectorAll(':scope > .atlas-section, :scope > .expression-card'));
    if (targets.length) {
      field.appendChild(buildMarkers(field, dockBody, targets));
    }

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
