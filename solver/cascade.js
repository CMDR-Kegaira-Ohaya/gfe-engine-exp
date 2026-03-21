import { AXES } from './constants.js';

function iterateAttempts(participantData = {}) {
  const cascade = participantData.cascade || {};
  if (Array.isArray(cascade.attempts)) {
    return cascade.attempts;
  }
  return [];
}

export function deriveCascade(participantData = {}) {
  const attempts = iterateAttempts(participantData);
  const axes = participantData.axes || {};

  const local_completions = attempts.map(attempt => {
    const axis = AXES.includes(attempt.axis) ? attempt.axis : 'Org';
    const axisState = axes[axis] || { A: 0, I: 0, sigma: 'L' };
    const cfgState = axes.Cfg || { A: 0, sigma: 'L' };
    const cfgOked = (cfgState.A || 0) > 0 && cfgState.sigma !== 'Dst';
    const hasExplicitCompletion = typeof attempt.completed === 'boolean';
    const completed = hasExplicitCompletion ? attempt.completed : (cfgOked && (axisState.sigma !== 'Dst'));
    return {
      axis,
      cfg_gated: cfgOked,
      completed
    };
  });

  const active = local_completions.some(step => step.completed);
  return {
    active,
    local_completions,
    note: active ? 'local-completion-chain' : ''
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
        local_completions: Array.isArray(cascade.local_completions) ? cascade.local_completions.length : 0
      };
    }
    rows.push(row);
  }
  return rows;
}
