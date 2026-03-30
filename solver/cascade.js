import { AXES } from './constants.js';

function iterateAttempts(participantData = {}) {
  const cascade = participantData.cascade || {};
  if (Array.isArray(cascade.attempts)) {
    return cascade.attempts;
  }
  return [];
}

function normalizeFailure(failure = {}) {
  return {
    active: !!failure?.active,
    primary: failure?.primary || null,
  };
}

function projectionStateForFailure(primaryFailure, compensation = {}) {
  if (primaryFailure === 'collapse') return 'collapsed';
  if (primaryFailure === 'suppression') return 'suppressed';
  if (primaryFailure === 'plastic-deformation') return 'deformed';
  if (primaryFailure === 'overflow') return 'overflow-conditioned';
  if (primaryFailure === 'substitution') return 'substituted';
  if (compensation?.active) return `compensated-${compensation.type || 'adaptive'}`;
  return 'nominal';
}

export function deriveCascade(participantData = {}) {
  const attempts = iterateAttempts(participantData);
  const axes = participantData.axes || {};
  const compensation = participantData.compensation || { active: false, type: null };
  const failure = normalizeFailure(participantData.failure || {});
  const theta = participantData.theta || { active: false };
  const prevalence = participantData.prevalence || { family: 'L', destructive: false };

  const hardBlocked = failure.primary === 'collapse' || failure.primary === 'suppression';
  const degraded = failure.primary === 'plastic-deformation';
  const rerouted = failure.primary === 'overflow' || failure.primary === 'substitution';

  const local_completions = attempts.map(attempt => {
    const axis = AXES.includes(attempt.axis) ? attempt.axis : 'Org';
    const axisState = axes[axis] || { A: 0, I: 0, sigma: 'L' };
    const cfgState = axes.Cfg || { A: 0, sigma: 'L' };
    const cfgOk = (cfgState.A || 0) > 0 && cfgState.sigma !== 'Dst';
    const hasExplicitCompletion = typeof attempt.completed === 'boolean';
    const baseCompleted = hasExplicitCompletion ? attempt.completed : (cfgOk && (axisState.sigma !== 'Dst'));
    const completed = hardBlocked ? false : baseCompleted;

    return {
      axis,
      cfg_gated: cfgOk,
      completed,
      blocked_by_failure: hardBlocked,
      projection_state: projectionStateForFailure(failure.primary, compensation),
    };
  });

  const active = !hardBlocked && local_completions.some(step => step.completed);

  let projection_mode = '';
  if (hardBlocked) projection_mode = `${failure.primary}-blocked-chain`;
  else if (degraded) projection_mode = 'deformed-chain';
  else if (rerouted) projection_mode = `${failure.primary}-conditioned-chain`;
  else if (compensation?.active) projection_mode = `compensated-${compensation.type || 'adaptive'}-chain`;
  else if (active) projection_mode = 'local-completion-chain';

  const noteParts = [];
  if (projection_mode) noteParts.push(projection_mode);
  if (theta?.active) noteParts.push('theta-active');
  if (prevalence?.destructive) noteParts.push('destructive-prevalence');
  else if (prevalence?.family) noteParts.push(`family-${prevalence.family}`);

  return {
    active,
    blocked: hardBlocked,
    degraded,
    rerouted,
    primary_failure: failure.primary,
    projection_mode,
    local_completions,
    note: noteParts.join('+'),
  };
}

export function buildCascadeSummary(caseData) {
  const rows = [];
  for (const step of caseData.timeline || []) {
    const row = { timestep_label: step.timestep_label, participants: {} };
    for (const [participantId, participantData] of Object.entries(step.participants || {})) {
      const cascade = participantData.cascade || deriveCascade(participantData);
      row.participants[participantId] = {
        active: !!cascade.active,
        blocked: !!cascade.blocked,
        degraded: !!cascade.degraded,
        rerouted: !!cascade.rerouted,
        primary_failure: cascade.primary_failure || null,
        projection_mode: cascade.projection_mode || '',
        local_completions: Array.isArray(cascade.local_completions)
          ? cascade.local_completions.filter(item => item.completed).length
          : 0,
      };
    }
    rows.push(row);
  }
  return rows;
}
