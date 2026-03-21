const MODE_RULES = {
  single: 'Uses the first enabled source as the assembled workspace.',
  serial: 'Appends enabled sources in source order into a longer timeline.',
  parts: 'Merges steps by timestep label across enabled sources.',
  themes: 'Includes only enabled sources whose theme matches the filter.',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function chip(label, value, tone = '') {
  const toneClass = tone ? ` ${tone}` : '';
  return `<span class="chip${toneClass}">${escapeHtml(label)} ${escapeHtml(value)}</span>`;
}

function participantChips(participant) {
  if (!participant) return '<div class="chip-row"><span class="chip">No participant</span></div>';
  const sigma = participant.axes?.Cfg?.sigma || '—';
  const prevalence = participant.prevalence?.family || '—';
  const theta = participant.theta?.active ? 'active' : 'inactive';
  const compensation = participant.compensation?.type || 'none';
  const cascade = participant.cascade?.active ? 'active' : 'inactive';
  const sigmaTone = sigma === 'L' ? 'good' : sigma === 'M' ? 'warn' : sigma === 'Dst' ? 'bad' : '';
  const thetaTone = theta === 'active' ? 'warn' : 'good';
  const compensationTone = compensation === 'adaptive' ? 'good' : compensation === 'maladaptive' ? 'bad' : '';
  const cascadeTone = cascade === 'active' ? 'warn' : 'good';
  return `<div class="chip-row">
    ${chip('Cfg σ', sigma, sigmaTone)}
    ${chip('Prev', prevalence)}
    ${chip('Θ', theta, thetaTone)}
    ${chip('Comp', compensation, compensationTone)}
    ${chip('Cascade', cascade, cascadeTone)}
  </div>`;
}

function ensurePolishBoard(els) {
  let board = document.getElementById('polish-board');
  if (!board) {
    board = document.createElement('section');
    board.id = 'polish-board';
    board.className = 'polish-board';
    els.summaryGrid.insertAdjacentElement('afterend', board);
  }
  return board;
}

function focusData(state) {
  const step = state.solved?.timeline?.[state.selectedTimestep] || null;
  const participant = step?.participants?.[state.selectedParticipantId] || null;
  return {
    step,
    participant,
    stepLabel: step?.timestep_label || '—',
    participantLabel: participant?.name || state.selectedParticipantId || '—',
    sourceRefs: Array.isArray(step?.source_refs) ? step.source_refs : [],
    participantCount: Object.keys(step?.participants || {}).length,
  };
}

function provenanceTone(mode, refCount) {
  if (mode === 'parts' && refCount > 1) return 'warn';
  if (mode === 'serial' && refCount > 1) return 'good';
  if (mode === 'themes') return 'good';
  return '';
}

function provenanceLabel(mode, refCount) {
  if (mode === 'parts') return refCount > 1 ? 'merged step' : 'single-part step';
  if (mode === 'serial') return refCount > 1 ? 'stacked serial step' : 'single serial step';
  if (mode === 'themes') return 'theme-filtered step';
  return 'single-source step';
}

function renderPolishBoard({ state, els, activeSources }) {
  const board = ensurePolishBoard(els);
  const focus = focusData(state);
  const enabled = activeSources();
  const disabledCount = state.sources.length - enabled.length;
  const rule = MODE_RULES[state.mode] || 'Workspace rule unavailable.';
  board.innerHTML = `
    <div class="card polish-card">
      <div class="section-title">Workspace rule</div>
      <div class="polish-title">${escapeHtml(state.mode)}</div>
      <div class="polish-copy">${escapeHtml(rule)}</div>
      <div class="chip-row compact">
        ${chip('Enabled', enabled.length)}
        ${chip('Disabled', disabledCount, disabledCount ? 'warn' : 'good')}
      </div>
    </div>
    <div class="card polish-card">
      <div class="section-title">Current focus</div>
      <div class="polish-title">${escapeHtml(focus.stepLabel)}</div>
      <div class="polish-copy">${escapeHtml(focus.participantLabel)}</div>
      <div class="chip-row compact">
        ${chip('Participants', focus.participantCount)}
        ${chip('Mode', provenanceLabel(state.mode, focus.sourceRefs.length), provenanceTone(state.mode, focus.sourceRefs.length))}
      </div>
    </div>
    <div class="card polish-card">
      <div class="section-title">Provenance</div>
      <div class="polish-copy">${focus.sourceRefs.length ? escapeHtml(focus.sourceRefs.join(' · ')) : 'No source refs on selected step.'}</div>
      <div class="chip-row compact">
        ${chip('Refs', focus.sourceRefs.length)}
        ${state.mode === 'themes' ? chip('Theme', state.themeFilter || 'no filter') : ''}
      </div>
    </div>
  `;
}

function decorateTimeline(state, els) {
  const items = [...els.timelineList.querySelectorAll('.timeline-item')];
  const steps = state.solved?.timeline || [];
  items.forEach((item, index) => {
    const step = steps[index];
    if (!step) return;
    const refCount = step.source_refs?.length || 0;
    item.classList.toggle('timeline-merged', state.mode === 'parts' && refCount > 1);
    item.classList.toggle('timeline-serial', state.mode === 'serial' && refCount > 1);
    let badgeRow = item.querySelector('.polish-provenance');
    if (!badgeRow) {
      badgeRow = document.createElement('div');
      badgeRow.className = 'chip-row compact polish-provenance';
      item.appendChild(badgeRow);
    }
    badgeRow.innerHTML = chip('Flow', provenanceLabel(state.mode, refCount), provenanceTone(state.mode, refCount));
  });
}

function jumpFromIssue(issue, state) {
  const path = issue?.path || '';
  const timelineMatch = path.match(/timeline\[(\d+)\]/);
  if (timelineMatch) state.selectedTimestep = Number(timelineMatch[1]);

  const eventMatch = path.match(/payload_events\[(\d+)\]/);
  if (eventMatch) {
    const eventIndex = Number(eventMatch[1]);
    const event = state.solved?.payload_events?.[eventIndex] || state.assembled?.payload_events?.[eventIndex];
    if (event?.timestep_idx != null) state.selectedTimestep = Number(event.timestep_idx) || 0;
    state.panel = 'payload';
  }

  const participantMatch = path.match(/participants\.([^\.\\[]+)/);
  if (participantMatch) {
    state.selectedParticipantId = participantMatch[1];
    state.panel = 'derived';
  } else if (timelineMatch && state.panel === 'validation') {
    state.panel = 'overview';
  }
}

function wireValidationJumps({ state, rerender }) {
  if (state.panel !== 'validation') return;
  const nodes = [...document.querySelectorAll('#tab-content .issue')];
  const issues = state.validation?.issues || [];
  nodes.forEach((node, index) => {
    const issue = issues[index];
    if (!issue || node.dataset.jumpBound === '1') return;
    node.dataset.jumpBound = '1';
    node.tabIndex = 0;
    node.classList.add('issue-jump');
    node.title = 'Jump to the referenced context';
    const handler = () => {
      jumpFromIssue(issue, state);
      rerender();
    };
    node.addEventListener('click', handler);
    node.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handler();
      }
    });
  });
}

export function applyPolish({ state, els, activeSources, rerender }) {
  renderPolishBoard({ state, els, activeSources });
  decorateTimeline(state, els);
  wireValidationJumps({ state, rerender });
}
