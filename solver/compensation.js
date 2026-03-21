import { ADAPTIVE_COMPENSATION_MODES, MALADAPTIVE_COMPENSATION_MODES } from './constants.js';

function totalCount(modeCounts = {}) {
  return Object.values(modeCounts).reduce((sum, value) => sum + (Number(value) || 0), 0);
}

export function deriveCompensation(modeCounts = {}, theta = { active: false }) {
  const total = totalCount(modeCounts);
  if (!total) {
    return { active: false, type: null, note: 'no-compensation-detected' };
  }

  const adaptiveCount = ADAPTIVE_COMPENSATION_MODES.reduce((sum, mode) => sum + (modeCounts[mode] || 0), 0);
  const maladaptiveCount = MALADAPTIVE_COMPENSATION_MODES.reduce((sum, mode) => sum + (modeCounts[mode] || 0), 0);

  let type = null;
  if (theta.active && maladaptiveCount >= adaptiveCount) type = 'maladaptive';
  else if (adaptiveCount > maladaptiveCount) type = 'adaptive';
  else if (maladaptiveCount > 0) type = 'maladaptive';
  else type = 'adaptive';

  return {
    active: true,
    type,
    adaptive_count: adaptiveCount,
    maladaptive_count: maladaptiveCount,
    note: type === 'adaptive' ? 'compensation-adaptive' : 'compensation-maladaptive'
  };
}
