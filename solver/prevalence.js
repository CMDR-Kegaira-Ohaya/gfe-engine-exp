import { DEFAULT_WEIGHTS } from './config.js';
import { isObject, stableNumber, toCanonicalAxisState, sigmoid } from './utils.js';

function splitPrevalenceArgs(relationSummaryOrWeights = {}, maybeWeights = undefined) {
  if (maybeWeights) {
    return {
      relationSummary: isObject(relationSummaryOrWeights) ? relationSummaryOrWeights : {},
      weights: maybeWeights,
    };
  }

  const looksLikeWeights =
    isObject(relationSummaryOrWeights) &&
    (
      Object.prototype.hasOwnProperty.call(relationSummaryOrWeights, 'thetaGateCenter') ||
      Object.prototype.hasOwnProperty.call(relationSummaryOrWeights, 'acuteWeight') ||
      Object.prototype.hasOwnProperty.call(relationSummaryOrWeights, 'relationPrevalenceTraceMinimum')
    );

  return {
    relationSummary: looksLikeWeights ? {} : (isObject(relationSummaryOrWeights) ? relationSummaryOrWeights : {}),
    weights: looksLikeWeights ? relationSummaryOrWeights : DEFAULT_WEIGHTS,
  };
}

function normalizeRelationSummary(summary = {}) {
  return {
    trace_count: stableNumber(summary.trace_count, 0),
    average_transfer: stableNumber(summary.average_transfer, 0),
    average_continuity: stableNumber(summary.average_continuity, 0),
  };
}

export function derivePrevalence(participantAxes = {}, relationSummaryOrWeights = {}, maybeWeights = undefined) {
  const { relationSummary, weights } = splitPrevalenceArgs(relationSummaryOrWeights, maybeWeights);
  const cfg = toCanonicalAxisState(participantAxes.Cfg || {});
  const org = toCanonicalAxisState(participantAxes.Org || {});
  const leg = toCanonicalAxisState(participantAxes.Leg || {});
  const relation = normalizeRelationSummary(relationSummary);

  const cfgFamily = cfg.sigma === 'L' ? 'L' : 'M';
  const relationEvidence = relation.trace_count >= stableNumber(weights.relationPrevalenceTraceMinimum, 1);

  const continuityGap = relationEvidence
    ? Math.max(0, stableNumber(weights.relationPrevalenceContinuityFloor, 0.56) - relation.average_continuity)
    : 0;
  const transferGap = relationEvidence
    ? Math.max(0, stableNumber(weights.relationPrevalenceTransferFloor, 0.52) - relation.average_transfer)
    : 0;

  const destructiveContinuityGap = relationEvidence
    ? Math.max(0, stableNumber(weights.relationDestructiveContinuityFloor, 0.34) - relation.average_continuity)
    : 0;
  const destructiveTransferGap = relationEvidence
    ? Math.max(0, stableNumber(weights.relationDestructiveTransferFloor, 0.30) - relation.average_transfer)
    : 0;

  const fieldStress =
    Math.max(0, org.I - org.A) +
    Math.max(0, leg.I - leg.A);

  const relationMisalignment = continuityGap + transferGap;
  const destructiveBias = destructiveContinuityGap + destructiveTransferGap;
  const fieldBias = 0.08 * Math.max(0, fieldStress - 0.10);

  const misalignmentSignal =
    (cfgFamily === 'L' ? 0 : 0.14) +
    relationMisalignment +
    fieldBias;

  const destructive =
    cfg.sigma === 'Dst' ||
    destructiveBias >= stableNumber(weights.relationDestructiveBiasThreshold, 0.22);

  const family =
    destructive || misalignmentSignal >= stableNumber(weights.relationMisalignmentThreshold, 0.10)
      ? 'M'
      : 'L';

  const noteParts = [`cfg-${cfg.sigma}`];
  if (relationEvidence) noteParts.push('relation-evidence');
  if (relationMisalignment > 0) noteParts.push('relation-misalignment');
  if (fieldBias > 0) noteParts.push('field-stress');
  if (destructive) noteParts.push('destructive-bias');

  return {
    family,
    destructive,
    cfg_family: cfgFamily,
    relation_evidence: relationEvidence,
    relation_influence: {
      trace_count: relation.trace_count,
      average_transfer: relation.average_transfer,
      average_continuity: relation.average_continuity,
      misalignment_signal: relationMisalignment,
      destructive_bias: destructiveBias,
      field_bias: fieldBias,
    },
    note: noteParts.join('+'),
  };
}

export function deriveTheta(participantAxes = {}, prevalence = { family: 'L' }, weights = DEFAULT_WEIGHTS) {
  const cfg = toCanonicalAxisState(participantAxes.Cfg || {});
  const stressGap = Math.max(0, cfg.I - cfg.A);
  const relationStress =
    stableNumber(prevalence?.relation_influence?.misalignment_signal, 0) +
    stableNumber(prevalence?.relation_influence?.destructive_bias, 0);

  const activation = sigmoid(
    weights.thetaGateSlope * ((weights.thetaGateCenter - cfg.A) + stressGap + (0.5 * relationStress) - weights.thetaStressGap)
  );
  const active = activation >= 0.5;

  let blockedFamily = null;
  if (active) {
    blockedFamily = prevalence?.destructive
      ? 'L'
      : (prevalence.family === 'L' ? 'M' : 'L');
  }

  return {
    active,
    blocked_family: blockedFamily,
    note: active
      ? (prevalence?.destructive ? 'relation-conditioned-threshold-active' : 'mirrored-threshold-active')
      : '',
  };
}
