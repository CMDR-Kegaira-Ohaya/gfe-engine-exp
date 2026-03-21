import { DEFAULT_WEIGHTS } from './config.js';
import { toCanonicalAxisState, sigmoid } from './utils.js';

export function derivePrevalence(participantAxes = {}, weights = DEFAULT_WEIGHTS) {
  const cfg = toCanonicalAxisState(participantAxes.Cfg || {});
  const family = cfg.sigma === 'L' ? 'L' : 'M';
  return {
    family,
    note: `derived-from-${cfg.sigma}`
  };
}

export function deriveTheta(participantAxes = {}, prevalence = { family: 'L' }, weights = DEFAULT_WEIGHTS) {
  const cfg = toCanonicalAxisState(participantAxes.Cfg || {});
  const stressGap = Math.max(0, cfg.I - cfg.A);
  const activation = sigmoid(
    weights.thetaGateSlope * ((weights.thetaGateCenter - cfg.A) + stressGap - weights.thetaStressGap)
  );
  const active = activation >= 0.5;
  return {
    active,
    blocked_family: active ? (prevalence.family === 'L' ? 'M' : 'L') : null,
    note: active ? 'mirrored-threshold-active' : ''
  };
}
