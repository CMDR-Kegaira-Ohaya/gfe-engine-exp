function buildAtlasRenderer(ctx) {
  const {
    state,
    els,
    esc,
    label,
    axisToken,
    pluralize,
    LENSES,
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
  if (!values.length) return '';
  const className = extraClass ? `atlas-pill-row ${extraClass}` : 'atlas-pill-row';
  return `<div class="${className}">${values.map((value) => `<span class="atlas-pill">${esc(value)}</span>`).join('')}</div>`;
}

function renderAtlasSummarySection(kicker, heading, pills, body, options = {}) {
  const sectionClass = options.className ? `atlas-section ${options.className}` : 'atlas-section';
  const dataAxis = options.axis ? ` data-axis="${esc(options.axis)}"` : '';
  const dataMapKind = options.mapKind ? ` data-map-kind="${esc(options.mapKind)}"` : '';
  const dataMapLabel = ` data-map-label="${esc(options.mapLabel || heading)}"`;
  return `<section class="${sectionClass}"${dataAxis}${dataMapKind}${dataMapLabel}>
    <div class="section-heading-row">
      <div>
        <div class="group-label">${esc(kicker)}</div>
        <h5>${esc(heading)}</h5>
      </div>
      ${pills?.length ? pillRow(pills, options.pillClass || 'compact') : ''}
    </div>
    ${body}
  </section>`;
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

  return `<div class="chip-row">
    ${participants.map((participantId) => `<button
      class="step-chip${state.participantFocus === participantId ? ' active' : ''}"
      data-participant-focus="${esc(participantId)}"
      data-step-index="${stepIndex}"
      aria-pressed="${String(state.participantFocus === participantId)}"
    >${esc(label(participantId))}</button>`).join('')}
  </div>`;
}

function renderEncounterButtons(stepIndex, events) {
  if (!events.length) return '<div class="inline-empty">No actions are encoded for this step yet.</div>';

  return `<div class="encounter-list">
    ${events.map((event, encounterIndex) => {
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
    }).join('')}
  </div>`;
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
          <div class="timeline-sub">${esc(`${pluralize(Object.keys(step.participants || {}).length, 'actor')} · ${pluralize(events.length, 'action')}`)}</div>
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

function renderAxisCards(axes = {}) {
  const entries = Object.entries(axes);
  if (!entries.length) return '<div class="inline-empty">No axis data is available here yet.</div>';

  return `<div class="atlas-axis-grid">
    ${entries.map(([name, axis]) => `<section class="axis-card" data-axis="${esc(axisToken(name))}">
      <div class="axis-card-top">
        <div class="group-label">State</div>
        <h4>${esc(label(name))}</h4>
      </div>
      <dl class="axis-values">
        <div><dt>A</dt><dd>${esc(axis.A ?? '—')}</dd></div>
        <div><dt>R</dt><dd>${esc(axis.R ?? '—')}</dd></div>
        <div><dt>I</dt><dd>${esc(axis.I ?? '—')}</dd></div>
      </dl>
    </section>`).join('')}
  </div>`;
}

function renderEventCards(events, emptyMessage = 'No relation events are encoded here yet.') {
  if (!events.length) return `<div class="inline-empty">${esc(emptyMessage)}</div>`;

  return `<div class="event-card-stack">
    ${events.map((event) => {
      const primitiveCount = Array.isArray(event.payload_bundle) ? event.payload_bundle.length : 0;
      const route = `${label(event.sourceParticipantId || event.alpha_source || '—')} → ${label(event.receivingParticipantId || event.alpha_receiving || '—')}`;
      const axis = `${label(event.axis || 'axis')} axis`;
      const axisKey = axisToken(event.axis || 'axis');
      return `<section class="event-card" data-axis="${esc(axisKey)}">
        <div class="event-card-kicker">Route</div>
        <div class="event-card-title">${esc(encounterLabel(event))}</div>
        <div class="event-card-route">${esc(route)}</div>
        ${pillRow([
          axis,
          event.face ? `Face ${label(event.face)}` : null,
          (event.mediumParticipantId || event.alpha_medium) ? `Medium ${label(event.mediumParticipantId || event.alpha_medium)}` : null,
          pluralize(primitiveCount, 'primitive'),
        ].filter(Boolean), `compact axis-pill-row axis-pill-row--${esc(axisKey)}`)}
      </section>`;
    }).join('')}
  </div>`;
}

function renderExpressionParticipantCard(participantId, participantData) {
  const axisEntries = Object.entries(participantData.axes || {});
  return `<section class="expression-card" data-map-kind="expression" data-map-label="${esc(label(participantId))}">
    <div class="section-heading-row">
      <div>
        <div class="group-label">Participant state</div>
        <h5>${esc(label(participantId))}</h5>
      </div>
      <span class="badge">State</span>
    </div>
    ${axisEntries.length ? `<div class="expression-grid">${axisEntries.map(([axisName, axisData]) => `<div class="expression-row" data-axis="${esc(axisToken(axisName))}"><div class="expression-name">${esc(label(axisName))}</div>${pillRow([`A:${axisData.A ?? '—'}`, `R:${axisData.R ?? '—'}`, `I:${axisData.I ?? '—'}`], `compact axis-pill-row axis-pill-row--${esc(axisToken(axisName))}`)}</div>`).join('')}</div>` : '<div class="inline-empty">No axis state is available for this participant yet.</div>'}
  </section>`;
}

function renderAtlasLensSwitch() {
  return `<section class="atlas-lens-shell">
    <div class="lens-row">
      <div class="group-label">Lens</div>
      <div class="lens-btn-row">
        ${LENSES.map((lens) => `<button class="lens-btn${state.atlasLens === lens.id ? ' active' : ''}" data-atlas-lens="${lens.id}" aria-pressed="${String(state.atlasLens === lens.id)}">${esc(lens.label)}</button>`).join('')}
      </div>
    </div>
    <p class="lens-note">${esc(lensMeta().note)}</p>
  </section>`;
}

function renderAtlasStateStrip(viewKind) {
  const modeText = viewKind === 'participant'
    ? 'Participant focus'
    : viewKind === 'encounter'
      ? 'Encounter focus'
      : 'Step overview';

  const pills = [
    `Moment ${selectedMomentLabel()}`,
    `Lens ${lensMeta().short}`,
    modeText,
  ];

  return `<section class="atlas-state-strip atlas-state-strip--${viewKind}">
    <div class="atlas-state-heading">
      <span class="atlas-mode-tag atlas-mode-tag--${viewKind}">${esc(modeText)}</span>
      <div class="atlas-state-context">${esc(selectedMomentLabel())}</div>
    </div>
    ${pillRow(pills, 'compact atlas-state-pills')}
  </section>`;
}

function renderAtlasProvenanceStrip() {
  const entry = getEntry();
  const items = [
    getCaseMeta(entry),
    getSourceMeta(entry),
    getReadingMeta(entry),
    getValidationMeta(),
  ];

  return `<section class="atlas-provenance-strip">
    <div class="atlas-provenance-head">
      <div class="group-label">Artifact status</div>
    </div>
    <div class="atlas-provenance-grid">
      ${items.map((item) => `<div class="atlas-provenance-item atlas-provenance-item--${item.tone}">
        <div class="atlas-provenance-label">${esc(item.label)}</div>
        <div class="atlas-provenance-value">${esc(item.text)}</div>
      </div>`).join('')}
    </div>
  </section>`;
}

function atlasShell(viewKind, kicker, heading, note, body, showClearFocus = false) {
  return `<div
    class="atlas-view atlas-view--${viewKind}"
    data-map-view-kind="${esc(viewKind)}"
    data-map-heading="${esc(heading)}"
    data-map-note="${esc(note)}"
    data-map-focus-anchor="${esc(heading)}"
  >
    <div class="focus-row atlas-top-row">
      <div>
        <div class="context-kicker">${esc(kicker)}</div>
        <h4 class="atlas-heading">${esc(heading)}</h4>
      </div>
      ${showClearFocus ? '<button class="ghost subtle-btn" data-clear-focus="true">Clear focus</button>' : ''}
    </div>
    ${renderAtlasStateStrip(viewKind)}
    ${renderAtlasProvenanceStrip()}
    ${renderAtlasLensSwitch()}
    <p class="atlas-note">${esc(note)}</p>
    ${body}
  </div>`;
}

function renderStructureOverview(step) {
  const participants = Object.entries(step.participants || {});
  if (!participants.length) return '<div class="inline-empty">This step has no actor entries to display yet.</div>';

  return `<div class="atlas-section-stack">
    ${participants.map(([participantId, participantData]) => renderAtlasSummarySection(
      'Participant',
      label(participantId),
      [
        `A:${participantData.axes?.identity?.A ?? '—'}`,
        `R:${participantData.axes?.identity?.R ?? '—'}`,
        `I:${participantData.axes?.identity?.I ?? '—'}`,
      ],
      renderAxisCards(participantData.axes || {}),
      {
        pillClass: 'compact axis-pill-row axis-pill-row--identity',
        mapKind: 'structure',
        mapLabel: label(participantId),
      },
    )).join('')}
  </div>`;
}

function renderStructureParticipant(stepIndex, participantId, participantData) {
  const events = participantEvents(stepIndex, participantId);
  const roles = roleCounts(events, participantId);

  return `<div class="atlas-section-stack">
    ${renderAtlasSummarySection(
      'Participant state',
      label(participantId),
      [
        pluralize(events.length, 'linked action'),
        `Source ${roles.source}`,
        `Receiving ${roles.receiving}`,
        `Medium ${roles.medium}`,
      ],
      renderAxisCards(participantData.axes || {}),
      {
        mapKind: 'structure',
        mapLabel: label(participantId),
      },
    )}
  </div>`;
}

function renderStructureEncounter(event) {
  const axisKey = axisToken(event.axis || 'axis');
  return `<div class="atlas-section-stack">
    ${renderAtlasSummarySection(
      'Encounter state',
      encounterLabel(event),
      [
        `Source ${label(event.sourceParticipantId || event.alpha_source || '—')}`,
        `Receiving ${label(event.receivingParticipantId || event.alpha_receiving || '—')}`,
        `Medium ${label(event.mediumParticipantId || event.alpha_medium || '—')}`,
        `${label(event.axis || 'axis')} axis`,
      ],
      `<dl class="encounter-detail-list" data-axis="${esc(axisKey)}">
        <div><dt>Source</dt><dd>${esc(label(event.sourceParticipantId || event.alpha_source || '—'))}</dd></div>
        <div><dt>Receiving</dt><dd>${esc(label(event.receivingParticipantId || event.alpha_receiving || '—'))}</dd></div>
        <div><dt>Medium</dt><dd>${esc(label(event.mediumParticipantId || event.alpha_medium || '—'))}</dd></div>
        <div><dt>Axis</dt><dd>${esc(label(event.axis || '—'))}</dd></div>
      </dl>`,
      {
        axis: axisKey,
        pillClass: `axis-pill-row axis-pill-row--${esc(axisKey)}`,
        mapKind: 'structure',
        mapLabel: encounterLabel(event),
      },
    )}
  </div>`;
}

function renderRelationsOverview(stepIndex, step) {
  return `<div class="atlas-section-stack">
    ${renderAtlasSummarySection(
      'Relation field',
      selectedMomentLabel(),
      [
        pluralize(Object.keys(step.participants || {}).length, 'participant'),
        pluralize(getStepEvents(stepIndex).length, 'encounter'),
      ],
      renderEventCards(getStepEvents(stepIndex)),
      {
        mapKind: 'relations',
        mapLabel: selectedMomentLabel(),
      },
    )}
  </div>`;
}

function renderRelationsParticipant(stepIndex, participantId) {
  const events = participantEvents(stepIndex, participantId);
  const roles = roleCounts(events, participantId);

  return `<div class="atlas-section-stack">
    ${renderAtlasSummarySection(
      'Linked encounters',
      label(participantId),
      [
        pluralize(events.length, 'linked encounter'),
        `Source ${roles.source}`,
        `Receiving ${roles.receiving}`,
        `Medium ${roles.medium}`,
      ],
      renderEventCards(events, 'No encounters in this step include the focused participant yet.'),
      {
        mapKind: 'relations',
        mapLabel: label(participantId),
      },
    )}
  </div>`;
}

function renderRelationsEncounter(event) {
  const axisKey = axisToken(event.axis || 'axis');
  return `<div class="atlas-section-stack">
    ${renderAtlasSummarySection(
      'Encounter route',
      encounterLabel(event),
      [
        `Route ${label(event.sourceParticipantId || event.alpha_source || '—')} → ${label(event.receivingParticipantId || event.alpha_receiving || '—')}`,
        (event.mediumParticipantId || event.alpha_medium) ? `Medium ${label(event.mediumParticipantId || event.alpha_medium)}` : 'No medium',
        `${label(event.axis || 'axis')} axis`,
      ],
      renderEventCards([event]),
      {
        axis: axisKey,
        pillClass: `axis-pill-row axis-pill-row--${esc(axisKey)}`,
        mapKind: 'relations',
        mapLabel: encounterLabel(event),
      },
    )}
  </div>`;
}

function renderExpressionOverview(stepIndex, step) {
  const participants = Object.entries(step.participants || {});
  const events = getStepEvents(stepIndex);

  return `<div class="atlas-section-stack">
    ${renderAtlasSummarySection(
      'Expression field',
      selectedMomentLabel(),
      [
        pluralize(participants.length, 'participant state'),
        pluralize(events.length, 'encounter expression'),
      ],
      `${participants.length ? participants.map(([participantId, participantData]) => renderExpressionParticipantCard(participantId, participantData)).join('') : '<div class="inline-empty">No participant expression state is available for this step yet.</div>'}
      ${events.length ? renderAtlasSummarySection(
        'Encounter expression',
        'Current encounter surfaces',
        [],
        `<div class="event-card-stack">${events.map((event) => `<section class="event-card" data-axis="${esc(axisToken(event.axis || 'axis'))}"><div class="event-card-kicker">Expression</div><div class="event-card-title">${esc(encounterLabel(event))}</div>${pillRow([
          event.face ? `Face ${label(event.face)}` : null,
          event.interference ? `Interference ${event.interference}` : null,
          pluralize(Array.isArray(event.payload_bundle) ? event.payload_bundle.length : 0, 'primitive'),
        ].filter(Boolean), `compact axis-pill-row axis-pill-row--${esc(axisToken(event.axis || 'axis'))}`)}</section>`).join('')}</div>`,
        {
          mapKind: 'expression',
          mapLabel: 'Current encounter surfaces',
        },
      ) : ''}`,
      {
        mapKind: 'expression',
        mapLabel: selectedMomentLabel(),
      },
    )}
  </div>`;
}

function renderExpressionParticipant(stepIndex, participantId, participantData) {
  const events = participantEvents(stepIndex, participantId);

  return `<div class="atlas-section-stack">
    ${renderExpressionParticipantCard(participantId, participantData)}
    ${renderAtlasSummarySection(
      'Expression links',
      'Current linked encounters',
      [],
      events.length ? `<div class="event-card-stack">${events.map((event) => `<section class="event-card" data-axis="${esc(axisToken(event.axis || 'axis'))}"><div class="event-card-kicker">Expression</div><div class="event-card-title">${esc(encounterLabel(event))}</div>${pillRow([
        event.face ? `Face ${label(event.face)}` : null,
        event.interference ? `Interference ${event.interference}` : null,
        pluralize(Array.isArray(event.payload_bundle) ? event.payload_bundle.length : 0, 'primitive'),
      ].filter(Boolean), `compact axis-pill-row axis-pill-row--${esc(axisToken(event.axis || 'axis'))}`)}</section>`).join('')}</div>` : '<div class="inline-empty">No expression-linked encounters include this participant in the selected step yet.</div>',
      {
        mapKind: 'expression',
        mapLabel: 'Current linked encounters',
      },
    )}
  </div>`;
}

function renderExpressionEncounter(event) {
  const primitives = Array.isArray(event.payload_bundle) ? event.payload_bundle : [];
  const axisKey = axisToken(event.axis || 'axis');

  return `<div class="atlas-section-stack">
    ${renderAtlasSummarySection(
      'Encounter expression',
      encounterLabel(event),
      [
        event.face ? `Face ${label(event.face)}` : 'Face —',
        event.interference ? `Interference ${event.interference}` : 'Interference —',
        pluralize(primitives.length, 'primitive'),
      ],
      `<dl class="encounter-detail-list" data-axis="${esc(axisKey)}">
        <div><dt>Face</dt><dd>${esc(label(event.face || '—'))}</dd></div>
        <div><dt>Interference</dt><dd>${esc(event.interference || '—')}</dd></div>
        <div><dt>Axis</dt><dd>${esc(label(event.axis || '—'))}</dd></div>
      </dl>`,
      {
        axis: axisKey,
        pillClass: `axis-pill-row axis-pill-row--${esc(axisKey)}`,
        mapKind: 'expression',
        mapLabel: encounterLabel(event),
      },
    )}
    ${renderAtlasSummarySection(
      'Payload bundle',
      'Current primitives',
      [],
      primitives.length ? `<div class="primitive-list" data-axis="${esc(axisKey)}">${primitives.map((primitive, index) => `<div class="primitive-chip"><b>${index + 1}.</b><span>${esc(label(primitive.sigma || 'L'))}</span><span>${esc(label(primitive.mode || primitive.mu || 'load'))}</span><span>${esc(label(primitive.register || 'retained'))}</span></div>`).join('')}</div>` : '<div class="inline-empty">No payload bundle detail is attached to this encounter.</div>',
      {
        axis: axisKey,
        mapKind: 'expression',
        mapLabel: 'Current primitives',
      },
    )}
  </div>`;
}

function renderAtlasOverview(stepIndex, step) {
  if (state.atlasLens === 'relations') {
    return atlasShell('overview', 'Relation Atlas', selectedMomentLabel(), 'Step overview is active. The relations lens surfaces encounter routing for the selected moment.', renderRelationsOverview(stepIndex, step));
  }

  if (state.atlasLens === 'expression') {
    return atlasShell('overview', 'Relation Atlas', selectedMomentLabel(), 'Step overview is active. The expression lens surfaces compact state and face summaries for this moment.', renderExpressionOverview(stepIndex, step));
  }

  return atlasShell('overview', 'Relation Atlas', selectedMomentLabel(), 'Step overview is active. The structure lens shows how encoded state is arranged across the selected moment.', renderStructureOverview(step));
}

function renderParticipantFocus(stepIndex, step, participantId) {
  const participantData = step.participants?.[participantId];
  if (!participantData) return '<div class="empty">The selected participant is not available in this step.</div>';

  if (state.atlasLens === 'relations') {
    return atlasShell('participant', 'Participant focus', label(participantId), 'Focus stays anchored to the selected moment while the relations lens narrows to linked encounters.', renderRelationsParticipant(stepIndex, participantId), true);
  }

  if (state.atlasLens === 'expression') {
    return atlasShell('participant', 'Participant focus', label(participantId), 'Focus stays anchored to the selected moment while the expression lens narrows to state and face signatures.', renderExpressionParticipant(stepIndex, participantId, participantData), true);
  }

  return atlasShell('participant', 'Participant focus', label(participantId), 'Focus stays anchored to the selected moment while the structure lens narrows to one participant.', renderStructureParticipant(stepIndex, participantId, participantData), true);
}

function renderEncounterFocus(event) {
  if (!event) return '<div class="empty">The selected encounter is not available in this step.</div>';

  if (state.atlasLens === 'relations') {
    return atlasShell('encounter', 'Encounter focus', encounterLabel(event), 'The relations lens emphasizes who meets whom here and how the route is carried.', renderRelationsEncounter(event), true);
  }

  if (state.atlasLens === 'expression') {
    return atlasShell('encounter', 'Encounter focus', encounterLabel(event), 'The expression lens emphasizes face, interference, and payload details attached to this encounter.', renderExpressionEncounter(event), true);
  }

  return atlasShell('encounter', 'Encounter focus', encounterLabel(event), 'The structure lens emphasizes how this encounter is wired across the selected moment.', renderStructureEncounter(event), true);
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
    els.atlas.innerHTML = renderParticipantFocus(state.activeStep, step, state.participantFocus);
    return;
  }

  if (state.encounterFocus) {
    els.atlasStatusBadge.textContent = `Encounter · ${short}`;
    els.atlas.innerHTML = renderEncounterFocus(getEncounterEvent());
    return;
  }

  els.atlasStatusBadge.textContent = `Step · ${short}`;
  els.atlas.innerHTML = renderAtlasOverview(state.activeStep, step);
}

  return {
    renderTimeline,
    renderAtlas,
  };
}

export function renderTimeline(ctx) {
  return buildAtlasRenderer(ctx).renderTimeline();
}

export function renderAtlas(ctx) {
  return buildAtlasRenderer(ctx).renderAtlas();
}
