import { stableNumber, toCanonicalAxisState } from './utils.js';
import { DEFAULT_WEIGHTS } from './config.js';

function modeCount(modeCounts = {}, mode) {
  return stableNumber(modeCounts?.[mode], 0);
}

function sumCounts(modeCounts = {}) {
  return Object.values(modeCounts || {}).reduce((sum, value) => sum + stableNumber(value, 0), 0);
}

function ratio(modeCounts = {}, mode) {
  const total = sumCounts(modeCounts);
  if (!total) return 0;
  return modeCount(modeCounts, mode) / total;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, stableNumber(value, 0)));
}

export function deriveFailureGrammar(
  participantAxes = {},
  modeCounts = {},
  prevalence = { family: 'L', destructive: false },
  theta = { active: false },
  compensation = { active: false, type: null },
  relationSummary = {},
  weights = DEFAULT_WEIGHTS
) {
  const cfg = toCanonicalAxisState(participantAxes.Cfg || {});
  const emb = toCanonicalAxisState(participantAxes.Emb || {});
  const dir = toCanonicalAxisState(participantAxes.Dir || {});
  const leg = toCanonicalAxisState(participantAxes.Leg || {});

  const overflowRatio = ratio(modeCounts, 'overflow');
  const substitutionRatio = ratio(modeCounts, 'substitute');
  const suppressionRatio = ratio(modeCounts, 'suppress');
  const routeRatio = ratio(modeCounts, 'route');
  const thresholdTransferRatio = ratio(modeCounts, 'threshold-transfer');

  const traceCount = stableNumber(relationSummary?.trace_count, 0);
  const averageTransfer = stableNumber(relationSummary?.average_transfer, 0);
  const averageContinuity = stableNumber(relationSummary?.average_continuity, 0);
  const misalignmentSignal = stableNumber(prevalence?.relation_influence?.misalignment_signal, 0);
  const destructiveBias = stableNumber(prevalence?.relation_influence?.destructive_bias, 0);

  const cfgStress = Math.max(0, cfg.I - cfg.A);
  const embStress = Math.max(0, emb.I - emb.A);
  const dirStress = Math.max(0, dir.I - dir.A);
  const legStress = Math.max(0, leg.I - leg.A);
  const formLoss = Math.max(0, 0.5 - cfg.A) + Math.max(0, 0.5 - dir.A) + Math.max(0, 0.5 - leg.A);

  const overflowScore = clamp01(
    (1.2 * overflowRatio) +
      (theta.active ? 0.20 : 0) +
      (traceCount ? Math.max(0, averageTransfer - 0.62) : 0) +
      (0.5 * misalignmentSignal)
  );

  const substitutionScore = clamp01(
    (1.25 * substitutionRatio) +
      (compensation?.type === 'adaptive' ? 0.20 : 0) +
      (routeRatio * 0.25) +
      (thresholdTransferRatio * 0.15) +
      (0.35 * misalignmentSignal)
  );

  const plasticDeformationScore = clamp01(
    (0.45 * formLoss) +
      (0.35 * (cfgStress + dirStress)) +
      (0.15 * overflowRatio) +
      (prevalence?.family === 'M' ? 0.08 : 0)
  );

  const suppressionScore = clamp01(
    (1.2 * suppressionRatio) +
      (compensation?.type === 'maladaptive' ? 0.18 : 0) +
      (0.35 * Math.max(0, 0.5 - averageTransfer)) +
      (0.25 * Math.max(0, 0.55 - averageContinuity)) +
      (0.2 * embStress)
  );

  const collapseScore = clamp01(
    (prevalence?.destructive ? 0.30 : 0) +
      (0.35 * destructiveBias) +
      (0.30 * formLoss) +
      (0.20 * Math.max(0, 0.35 - cfg.A)) +
      (0.10 * Math.max(0, 0.35 - leg.A))
  );

  const grammars = {
    overflow: {
      active: overflowScore >= stableNumber(weights.failureOverflowThreshold, 0.34),
      score: overflowScore,
      note: overflowScore >= stableNumber(weights.failureOverflowThreshold, 0.34)
        ? 'load exceeds available routing/holding margin'
        : '',
    },
    substitution: {
      active: substitutionScore >= stableNumber(weights.failureSubstitutionThreshold, 0.34),
      score: substitutionScore,
      note: substitutionScore >= stableNumber(weights.failureSubstitutionThreshold, 0.34)
        ? 'pressure resolves by replacement/rerouting pattern'
        : '',
    },
    'plastic-deformation': {
      active: plasticDeformationScore >= stableNumber(weights.failurePlasticThreshold, 0.38),
      score: plasticDeformationScore,
      note: plasticDeformationScore >= stableNumber(weights.failurePlasticThreshold, 0.38)
        ? 'maintained form shows altered axis availability'
        : '',
    },
    suppression: {
      active: suppressionScore >= stableNumber(weights.failureSuppressionThreshold, 0.34),
      score: suppressionScore,
      note: suppressionScore >= stableNumber(weights.failureSuppressionThreshold, 0.34)
        ? 'pressure expression is being damped or nulled'
        : '',
    },
    collapse: {
      active: collapseScore >= stableNumber(weights.failureCollapseThreshold, 0.42),
      score: collapseScore,
      note: collapseScore >= stableNumber(weights.failureCollapseThreshold, 0.42)
        ? 'destructive contraction exceeds ordinary suppression'
        : '',
    },
  };

  const ranked = Object.entries(grammars)
    .map(([name, data]) => ({ name, ...data }))
    .sort((left, right) => right.score - left.score);

  const primary = ranked[0]?.active ? ranked[0].name : null;
  const active = ranked.some(item => item.active);

  return {
    active,
    primary,
    grammars,
    note: active ? `failure-${primary}` : 'no-distinct-failure-grammar',
  };
}
