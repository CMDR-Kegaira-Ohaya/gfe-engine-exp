import { clip01, stableNumber } from './utils.js';

export function resolveDistributedLegProfile(event = {}, primitive = {}, axis = '', weights = {}) {
  const legInPlay = primitive.axis === 'Leg' || axis === 'Leg';
  if (!legInPlay) {
    return {
      leg_scope: 'non-leg',
      trace_persistence: 0,
      distributed_span: 0,
      persistence_signal: 0,
      continuityBias: 0,
      receivingMultiplier: 1,
      emissionMultiplier: 1,
      retentionMultiplier: 1,
      mediumBurdenMultiplier: 1,
      note: 'non-leg-event',
    };
  }

  const legScope = event.leg_scope || event.legScope || 'local';
  const tracePersistence = Math.max(0, stableNumber(event.trace_persistence ?? event.tracePersistence, 0));
  const distributedSpan = Math.max(0, stableNumber(event.distributed_span ?? event.distributedSpan, 0));
  const persistenceSignal = clip01(
    (tracePersistence * stableNumber(weights.legTracePersistenceStep, 0.16)) +
      (distributedSpan * stableNumber(weights.legDistributedSpanStep, 0.12))
  );

  if (legScope === 'distributed') {
    return {
      leg_scope: 'distributed',
      trace_persistence: tracePersistence,
      distributed_span: distributedSpan,
      persistence_signal: persistenceSignal,
      continuityBias: persistenceSignal * stableNumber(weights.legDistributedContinuityGain, 0.14),
      receivingMultiplier: 1 + (persistenceSignal * stableNumber(weights.legDistributedReceivingGain, 0.18)),
      emissionMultiplier: Math.max(0.70, 1 - (persistenceSignal * stableNumber(weights.legDistributedEmissionSuppression, 0.12))),
      retentionMultiplier: 1 + (persistenceSignal * stableNumber(weights.legDistributedRetentionGain, 0.24)),
      mediumBurdenMultiplier: 1 + (persistenceSignal * stableNumber(weights.legDistributedMediumBurdenGain, 0.10)),
      note: persistenceSignal > 0.40 ? 'distributed-trace-persistent' : 'distributed-trace-light',
    };
  }

  return {
    leg_scope: 'local',
    trace_persistence: tracePersistence,
    distributed_span: distributedSpan,
    persistence_signal: persistenceSignal * 0.35,
    continuityBias: 0,
    receivingMultiplier: 1,
    emissionMultiplier: 1,
    retentionMultiplier: 1,
    mediumBurdenMultiplier: 1,
    note: 'local-leg-only',
  };
}
