const POSITION_GROUPS = {
  expression: [
    { top: '18%', left: '20%' },
    { top: '28%', left: '68%' },
    { top: '56%', left: '24%' },
    { top: '68%', left: '64%' },
    { top: '44%', left: '46%' },
  ],
  relations: [
    { top: '22%', left: '22%' },
    { top: '26%', left: '70%' },
    { top: '52%', left: '18%' },
    { top: '62%', left: '68%' },
    { top: '42%', left: '48%' },
  ],
  structure: [
    { top: '18%', left: '28%' },
    { top: '24%', left: '60%' },
    { top: '48%', left: '24%' },
    { top: '60%', left: '58%' },
    { top: '72%', left: '40%' },
  ],
  default: [
    { top: '20%', left: '20%' },
    { top: '28%', left: '66%' },
    { top: '50%', left: '22%' },
    { top: '62%', left: '66%' },
    { top: '42%', left: '44%' },
  ],
};

const LENSES = [
  { id: 'structure', label: 'Structure (V)' },
  { id: 'relations', label: 'Relations (H)' },
  { id: 'expression', label: 'Expression (R)' },
];

function buildAtlasRenderer(ctx) {
  const {
    state,
    els,
    esc,
    label,
    axisToken,
    pluralize,
    lensMeta,
    getEntry,
    getSourceMeta,
    getReadingMeta,
    getValidationMeta,
    getCaseMeta,
    getTimeline,
    getStep,
    getStepEvents,
    getEncounterEvent,
    selectedMomentLabel,
    participantEvents,
    roleCounts,
    countPrimitives,
    countFaces,
    encounterLabel,
    getTimelineSummary,
    focusSummary,
    setActiveStep,
  } = ctx;

  function pillRow(values, extraClass = '') {
    const items = values.filter(Boolean);
    if (!items.length) return '';
    const className = extraClass ? `atlas-pill-row ${extraClass}` : 'atlas-pill-row';
    return `<div class="${className}">${items.map((value) => `<span class="atlas-pill">${esc(value)}</span>`).join('')}</div>`;
  }

  function axisCards(axes = {}) {
    const entries = Object.entries(axes);
    if (!entries.length) return '<div class="inline-empty">No axis data is available here yet.</div>';
    return `<div class="atlas-axis-grid">${entries.map(([name, axis]) => `
      <section class="axis-card" data-axis="${esc(axisToken(name))}">
        <div class="axis-card-top">
          <div class="group-label">State</div>
          <h4>${esc(label(name))}</h4>
        </div>
        <dl class="axis-values">
          <div><dt>A</dt><dd>${esc(axis?.A ?? '—')}</dd></div>
          <div><dt>R</dt><dd>${esc(axis?.R ?? '—')}</dd></div>
          <div><dt>I</dt><dd>${esc(axis?.I ?? '—')}</dd></div>
        </dl>
      </section>
    `).join('')}</div>`;
  }

  function encounterDetailList(event) {
    const axisKey = axisToken(event?.axis || 'axis');
    return `<dl class="encounter-detail-list" data-axis="${esc(axisKey)}">
      <div><dt>Source</dt><dd>${esc(label(event?.sourceParticipantId || event?.alpha_source || '—'))}</dd></div>
      <div><dt>Receiving</dt><dd>${esc(label(event?.receivingParticipantId || event?.alpha_receiving || '—'))}</dd></div>
      <div><dt>Medium</dt><dd>${esc(label(event?.mediumParticipantId || event?.alpha_medium || '—'))}</dd></div>
      <div><dt>Axis</dt><dd>${esc(label(event?.axis || '—'))}</dd></div>
    </dl>`;
  }

  function primitiveList(primitives = [], axisKey = 'default') {
    if (!primitives.length) return '<div class="inline-empty">No payload bundle detail is attached to this encounter.</div>';
    return `<div class="primitive-list" data-axis="${esc(axisKey)}">
      ${primitives.map((primitive, index) => `
        <div class="primitive-chip">
          <b>${index + 1}.</b>
          <span>${esc(label(primitive?.sigma || 'L'))}</span>
          <span>${esc(label(primitive?.mode || primitive?.mu || 'load'))}</span>
          <span>${esc(label(primitive?.register || 'retained'))}</span>
        </div>
      `).join('')}
    </div>`;
  }

  function summarySection({ kicker, heading, pills = [], body, kind = 'default', axis = 'default', targetId }) {
    return {
      id: targetId,
      kind,
      axis,
      label: heading,
      html: `<section id="${esc(targetId)}" class="atlas-section" data-kind="${esc(kind)}" data-axis="${esc(axis)}">
        <div class="section-heading-row">
          <div>
            <div class="group-label">${esc(kicker)}</div>
            <h5>${esc(heading)}</h5>
          </div>
          ${pillRow(pills, kind === 'default' ? 'compact' : `compact axis-pill-row axis-pill-row--${esc(kind)}`)}
        </div>
        ${body}
      </section>`,
    };
  }

  function renderFocusStrip() {
    const step = getStep();
    if (!step) return '<div class="timeline-focus-strip empty">No focus context yet.</div>';
    const focus = focusSummary();
    const pills = [
      `Moment ${selectedMomentLabel()}`,
      `Lens ${lensMeta().short}`,
      focus.kind === 'overview' ? 'Overview' : `${label(focus.kind)} focus`,
    ];
    return `<section class="timeline-focus-strip">
      <div class="focus-strip-shell">
        <div class="focus-strip-copy">
          <div class="group-label">Timeline ↔ Atlas</div>
          <div class="focus-strip-title">${esc(focus.title)}</div>
          <div class="focus-strip-note">${esc(focus.note)}</div>
        </div>
        <div class="focus-strip-meta">
          ${pillRow(pills, 'compact')}
          ${state.participantFocus || state.encounterFocus ? '<button class="ghost subtle-btn" data-clear-focus="true">Clear focus</button>' : ''}
        </div>
      </div>
    </section>`;
  }

  function renderParticipantChips(stepIndex, step) {
    const participants = Object.keys(step.participants || {});
    if (!participants.length) return '<div class="inline-empty">No actors are encoded for this step yet.</div>';
    return `<div class="chip-row">${participants.map((participantId) => `
      <button
        class="step-chip${state.participantFocus === participantId ? ' active' : ''}"
        data-participant-focus="${esc(participantId)}"
        data-step-index="${stepIndex}"
        aria-pressed="${String(state.participantFocus === participantId)}"
      >${esc(label(participantId))}</button>
    `).join('')}</div>`;
  }

  function renderEncounterButtons(stepIndex, events) {
    if (!events.length) return '<div class="inline-empty">No actions are encoded for this step yet.</div>';
    return `<div class="encounter-list">${events.map((event, encounterIndex) => {
      const isActive = state.encounterFocus
        && state.encounterFocus.stepIndex === stepIndex
        && state.encounterFocus.encounterIndex === encounterIndex;
      const primitiveCount = Array.isArray(event.payload_bundle) ? event.payload_bundle.length : 0;
      const faceText = event.face ? ` · ${label(event.face)}` : '';
      const subtitle = `${label(event.axis || 'axis')} axis${faceText} · ${pluralize(primitiveCount, 'primitive')}`;
      return `<button class="encounter-btn${isActive ? ' active' : ''}" data-encounter-focus="${encounterIndex}" data-step-index="${stepIndex}" aria-pressed="${String(Boolean(isActive))}">
        <div class="encounter-title">${esc(encounterLabel(event))}</div>
        <div class="encounter-sub">${esc(subtitle)}</div>
      </button>`;
    }).join('')}</div>`;
  }

  function renderTimelineStepCard(step, stepIndex) {
    const active = stepIndex === state.activeStep;
    const events = getStepEvents(stepIndex);
    const summary = getTimelineSummary(stepIndex, step);
    return `<section class="timeline-step-card${active ? ' active' : ''}">
      <button class="timeline-step-select" data-step-select="${stepIndex}" aria-expanded="${String(active)}">
        <div class="timeline-step-header">
          <div>
            <div class="timeline-label">${esc(step.timestep_label || `Step ${stepIndex + 1}`)}</div>
            <div class="timeline-sub">${esc(`${pluralize(Object.keys(step.participants || {}).length, 'actor')} · ${pluralize(events.length, 'action')}`)</div>
            <div class="timeline-summary-row">
              <span class="timeline-summary-kicker">${esc(summary.kicker)}</span>
              <span class="timeline-summary-copy">${esc(summary.text)}</span>
            </div>
          </div>
          <span class="badge">${active ? 'Selected' : `Step ${stepIndex + 1}`}</span>
        </div>
      </button>
      ${active ? `<div class="timeline-step-detail">
        <p class="step-detail-summary">Click an actor to set participant focus. Click an action to set encounter focus. The atlas responds without changing the selected moment.</p>
        <section class="step-detail-block">
          <div class="step-detail-label">Actors</div>
          ${renderParticipantChips(stepIndex, step)}
        </section>
        <section class="step-detail-block">
          <div class="step-detail-label">Actions</div>
          ${renderEncounterButtons(stepIndex, events)}
        </section>
      </div>` : ''}
    </section>`;
  }

  function renderTimeline() {
    const timeline = getTimeline();
    els.timestepBadge.textContent = String(timeline.length);
    if (!timeline.length) {
      els.timeline.innerHTML = `${renderFocusStrip()}<div class="empty">No timeline loaded.</div>`;
      return;
    }
    if (state.activeStep >= timeline.length) setActiveStep(0);
    els.timeline.innerHTML = `${renderFocusStrip()}${timeline.map((step, stepIndex) => renderTimelineStepCard(step, stepIndex)).join('')}`;
  }

  function renderLensSwitch() {
    return `<section class="atlas-lens-shell">
      <div class="lens-row">
        <div class="group-label">Lens</div>
        <div class="lens-btn-row">
          ${LENSES.map((lens) => `
            <button class="lens-btn${state.atlasLens === lens.id ? ' active' : ''}" data-atlas-lens="${lens.id}" aria-pressed="${String(state.atlasLens === lens.id)}">${esc(lens.label)}</button>
          `).join('')}
        </div>
      </div>
      <p class="lens-note">${esc(lensMeta().note)}</p>
    </section>`;
  }

  function renderAtlasStateStrip(viewKind) {
    const modeText = viewKind === 'participant' ? 'Participant focus' : viewKind === 'encounter' ? 'Encounter focus' : 'Step overview';
    return `<section class="atlas-state-strip atlas-state-strip--${esc(viewKind)}">
      <div class="atlas-state-heading">
        <span class="atlas-mode-tag atlas-mode-tag--${esc(viewKind)}">${esc(modeText)}</span>
        <div class="atlas-state-context">${esc(selectedMomentLabel())}</div>
      </div>
      ${pillRow([`Moment ${selectedMomentLabel()}`, `Lens ${lensMeta().short}`, modeText], 'compact atlas-state-pills')}
    </section>`;
  }

  function renderProvenanceStrip() {
    const entry = getEntry();
    const items = [getCaseMeta(entry), getSourceMeta(entry), getReadingMeta(entry), getValidationMeta()];
    return `<section class="atlas-provenance-strip">
      <div class="atlas-provenance-head"><div class="group-label">Artifact status</div></div>
      <div class="atlas-provenance-grid">${items.map((item) => `
        <div class="atlas-provenance-item atlas-provenance-item--${esc(item.tone)}">
          <div class="atlas-provenance-label">${esc(item.label)}</div>
          <div class="atlas-provenance-value">${esc(item.text)}</div>
        </div>
      `).join('')}</div>
    </section>`;
  }

  function detailFromParticipants(participants, pillsForParticipant) {
    return participants.map(([participantId, participantData], index) => summarySection({
      kicker: 'Participant state',
      heading: label(participantId),
      pills: pillsForParticipant(participantId, participantData),
      kind: state.atlasLens === 'relations' ? 'relations' : state.atlasLens === 'expression' ? 'expression' : 'structure',
      axis: state.atlasLens === 'relations' ? 'relations' : state.atlasLens === 'expression' ? 'expression' : 'structure',
      targetId: `atlas-target-${index + 1}`,
      body: axisCards(participantData.axes || {}),
    }));
  }

  function eventSection(event, index, kicker, body) {
    return summarySection({
      kicker,
      heading: encounterLabel(event),
      pills: [
        event.face ? `Face ${label(event.face)}` : null,
        event.interference ? `Interference ${event.interference}` : null,
        `${label(event.axis || 'axis')} axis`,
        pluralize(Array.isArray(event.payload_bundle) ? event.payload_bundle.length : 0, 'primitive'),
      ],
      kind: state.atlasLens === 'expression' ? 'expression' : 'relations',
      axis: axisToken(event.axis || 'axis'),
      targetId: `atlas-target-${index + 1}`,
      body,
    });
  }

  function collectOverviewDetails(stepIndex, step) {
    if (state.atlasLens === 'relations') {
      return getStepEvents(stepIndex).map((event, index) => eventSection(event, index, 'Encounter route', `
        ${encounterDetailList(event)}
      `));
    }
    if (state.atlasLens === 'expression') {
      const participants = detailFromParticipants(Object.entries(step.participants || {}), () => []);
      const encounters = getStepEvents(stepIndex).map((event, index) => eventSection(event, participants.length + index, 'Encounter expression', `
        ${encounterDetailList(event)}
        ${primitiveList(Array.isArray(event.payload_bundle) ? event.payload_bundle : [], axisToken(event.axis || 'axis'))}
      `));
      return [...participants, ...encounters];
    }
    return detailFromParticipants(Object.entries(step.participants || {}), (_participantId, participantData) => [
      `A:${participantData.axes?.identity?.A ?? '—'}`,
      `R:${participantData.axes?.identity?.R ?? '—'}`,
      `I:${participantData.axes?.identity?.I ?? '—'}`,
    ]);
  }

  function collectParticipantDetails(stepIndex, step, participantId) {
    const participantData = step.participants?.[participantId];
    if (!participantData) return [];
    const linkedEvents = participantEvents(stepIndex, participantId);
    const roles = roleCounts(linkedEvents, participantId);
    if (state.atlasLens === 'relations') {
      return linkedEvents.map((event, index) => eventSection(event, index, 'Linked encounters', encounterDetailList(event)));
    }
    if (state.atlasLens === 'expression') {
      return [
        summarySection({
          kicker: 'Participant state',
          heading: label(participantId),
          pills: [],
          kind: 'expression',
          axis: 'expression',
          targetId: 'atlas-target-1',
          body: axisCards(participantData.axes || {}),
        }),
        ...linkedEvents.map((event, index) => eventSection(event, index + 1, 'Expression links', `
          ${encounterDetailList(event)}
          ${primitiveList(Array.isArray(event.payload_bundle) ? event.payload_bundle : [], axisToken(event.axis || 'axis'))}
        `)),
      ];
    }
    return [summarySection({
      kicker: 'Participant state',
      heading: label(participantId),
      pills: [
        pluralize(linkedEvents.length, 'linked action'),
        `Source ${roles.source}`,
        `Receiving ${roles.receiving}`,
        `Medium ${roles.medium}`,
      ],
      kind: 'structure',
      axis: 'structure',
      targetId: 'atlas-target-1',
      body: axisCards(participantData.axes || {}),
    })];
  }

  function collectEncounterDetails(event) {
    if (!event) return [];
    if (state.atlasLens === 'expression') {
      return [eventSection(event, 0, 'Encounter expression', `
        ${encounterDetailList(event)}
        ${primitiveList(Array.isArray(event.payload_bundle) ? event.payload_bundle : [], axisToken(event.axis || 'axis'))}
      `)];
    }
    return [eventSection(event, 0, state.atlasLens === 'relations' ? 'Encounter route' : 'Encounter state', encounterDetailList(event))];
  }

  function zonesMarkup(groups) {
    const defs = [['structure', 'Structure'], ['relations', 'Relations'], ['expression', 'Expression']];
    const zones = defs.filter(([kind]) => groups[kind]?.length).map(([kind, zoneLabel]) => `
      <div class="atlas-map-zone atlas-map-zone--${kind} ${groups[kind]?.length ? 'is-active' : ''}" data-zone-label="${zoneLabel}" data-kind="${kind}"></div>
    `).join('');
    return `<div class="atlas-map-zones">${zones}</div>`;
  }

  function groupTargets(details) {
    return details.reduce((acc, detail) => {
      const kind = detail.kind || 'default';
      (acc[kind] ||= []).push(detail);
      return acc;
    }, { structure: [], relations: [], expression: [], default: [] });
  }

  function markerMarkup(detail, localIndex, globalIndex) {
    const pool = POSITION_GROUPS[detail.kind] || POSITION_GROUPS.default;
    const pos = pool[localIndex % pool.length] || POSITION_GROUPS.default[globalIndex % POSITION_GROUPS.default.length];
    return `<a class="atlas-map-marker" href="#${esc(detail.id)}" data-target="${esc(detail.id)}" data-axis="${esc(detail.axis)}" data-kind="${esc(detail.kind)}" style="top:${pos.top};left:${pos.left};">
      <span class="atlas-map-label">
        <span class="atlas-map-index">${globalIndex + 1}</span>
        <span class="atlas-map-text">${esc(detail.label)}</span>
      </span>
    </a>`;
  }

  function mapShell({ viewKind, kicker, heading, note, details, showClearFocus = false }) {
    const groups = groupTargets(details);
    let globalIndex = 0;
    const markers = ['structure', 'relations', 'expression', 'default'].flatMap((kind) =>
      (groups[kind] || []).map((detail, localIndex) => markerMarkup(detail, localIndex, globalIndex++))
    ).join('');
    return `<div class="atlas-view atlas-view--${esc(viewKind)}">
      <div class="focus-row atlas-top-row">
        <div>
          <div class="context-kicker">${esc(kicker)}</div>
          <h4 class="atlas-heading">${esc(heading)}</h4>
        </div>
        ${showClearFocus ? '<button class="ghost subtle-btn" data-clear-focus="true">Clear focus</button>' : ''}
      </div>
      ${renderAtlasStateStrip(viewKind)}
      ${renderProvenanceStrip()}
      ${renderLensSwitch()}
      <p class="atlas-note">${esc(note)}</p>
      <div class="atlas-map-shell">
        <section class="atlas-map-field" data-view-kind="${esc(viewKind)}" data-focus-anchor="${esc(heading)}">
          <div class="atlas-map-field-head">
            <div class="group-label">Atlas field</div>
            <h5 class="atlas-map-field-title">${esc(heading)}</h5>
            <p class="atlas-map-field-note">${esc(note)}</p>
          </div>
          <div class="atlas-map-field-meta">${pillRow([`Moment ${selectedMomentLabel()}`, `Lens ${lensMeta().short}`, viewKind === 'overview' ? 'Overview' : `${label(viewKind)} focus`], 'compact atlas-state-pills')}</div>
          <div class="atlas-map-placeholder" aria-hidden="true">
            <div class="atlas-map-ring atlas-map-ring--a"></div>
            <div class="atlas-map-ring atlas-map-ring--b"></div>
            <div class="atlas-map-vector atlas-map-vector--a"></div>
            <div class="atlas-map-vector atlas-map-vector--b"></div>
          </div>
          ${zonesMarkup(groups)}
          <div class="atlas-map-interactives">
            <div class="atlas-map-focus-node" aria-hidden="true"></div>
            ${markers || '<div class="inline-empty">No atlas targets are available yet.</div>'}
          </div>
        </section>
        <section class="atlas-detail-dock">
          <div class="atlas-detail-dock-head">
            <div class="atlas-detail-dock-copy">
              <div class="group-label">Atlas detail</div>
              <h5 class="atlas-detail-dock-title">Current inspection</h5>
              <p class="atlas-detail-dock-note">Markers in the field jump to the current atlas detail inside this dock.</p>
            </div>
          </div>
          <div class="atlas-detail-dock-body">
            ${details.length ? details.map((detail, index) => detail.html.replace('class="atlas-section"', `class="atlas-section${index === 0 ? ' is-targeted' : ''}"`)).join('') : '<div class="inline-empty">No atlas detail is available yet.</div>'}
          </div>
        </section>
      </div>
    </div>`;
  }

  function renderAtlas() {
    const step = getStep();
    const short = lensMeta().short;
    if (!step) {
      els.atlasStatusBadge.textContent = 'No step';
      els.atlas.innerHTML = '<div class="empty">No relation atlas data yet.</div>';
      return;
    }

    if (state.participantFocus) {
      els.atlasStatusBadge.textContent = `Participant · ${short}`;
      els.atlas.innerHTML = mapShell(vewKind = 'participant');
    }
  }
}

export function renderTimeline(ctx) {
  return buildAtlasRenderer(ctx).renderTimeline();
}

export function renderAtlas(ctx) {
  return buildAtlasRenderer(ctx).renderAtlas();
}
