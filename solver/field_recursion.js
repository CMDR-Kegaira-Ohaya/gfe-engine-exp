import { clip01, stableNumber } from './utils.js';

export function resolveFieldRecursionProfile(event = {}, primitive = {}, axis = '', weights = {}) {
  const fieldInPlay = primitive.axis === 'Org' || axis === 'Org';
  if (!fieldInPlay) {
    return {
      field_scope: 'non-field',
      field_feedback: 0,
      field_depth: 0,
      field_signal: 0,
      continuityBias: 0,
      receivingMultiplier: 1,
      emissionMultiplier: 1,
      retentionMultiplier: 1,
      mediumBurdenMultiplier: 1,
      note: 'non-field-event',
    };
  }

  const fieldScope = event.field_scope || event.fieldScope || 'local';
  const fieldFeedback = Math.max(0, stableNumber(event.field_feedback ?? event.fieldFeedback, 0));
  const fieldDepth = Math.max(0, stableNumber(event.field_depth ?? event.fieldDepth, 0));
  const fieldSignal = clip01(
    (fieldFeedback * stableNumber(weights.fieldFeedbackStep, 0.18)) +
      (fieldDepth * stableNumber(weights.fieldDepthStep, 0.14))
  );

  if (fieldScope === 'recursive') {
    return {
      field_scope: 'recursive',
      field_feedback: fieldFeedback,
      field_depth: fieldDepth,
      field_signal: fieldSignal,
      continuityBias: fieldSignal * stableNumber(weights.fieldRecursiveContinuityGain, 0.16),
      receivingMultiplier: 1 + (fieldSignal * stableNumber(weights.fieldRecursiveReceivingGain, 0.18)),
      emissionMultiplier: Math.max(0.72, 1 - (fieldSignal * stableNumber(weights.fieldRecursiveEmissionSuppression, 0.10))),
      retentionMultiplier: 1 + (fieldSignal * stableNumber(weights.fieldRecursiveRetentionGain, 0.20)),
      mediumBurdenMultiplier: 1 + (fieldSignal * stableNumber(weights.fieldRecursiveMediumBurdenGain, 0.12)),
      note: fieldSignal > 0.40 ? 'recursive-field-closed-loop' : 'recursive-field-light-loop',
    };
  }

  return {
    field_scope: 'local',
    field_feedback: fieldFeedback,
    field_depth: fieldDepth,
    field_signal: fieldSignal * 0.35,
    continuityBias: 0,
    receivingMultiplier: 1,
    emissionMultiplier: 1,
    retentionMultiplier: 1,
    mediumBurdenMultiplier: 1,
    note: 'local-field-only',
  };
}
