import { clip01, stableNumber, toCanonicalScale } from './utils.js';
import { resolveOrderProfile } from './order.js';
import { resolveDistributedLegProfile } from './leg_distributed.js';

function mean(values = []) {
  const nums = values.filter(Number.isFinite);
  if (!nums.length) return 0;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

function readAxisState(encounterContext = {}, participantId, axis) {
  if (!participantId || !axis) {
    return { A: 0, R: 0, I: 0, sigma: 'L', valence: '' };
  }

  const participant =
    encounterContext?.participants?.[participantId] ||
    encounterContext?.[participantId] ||
    null;

  const axes = participant?._canonical_axes || participant?.axes || {};
  return {
    A: toCanonicalScale(axes?.[axis]?.A),
    R: toCanonicalScale(axes?.[axis]?.R),
    I: toCanonicalScale(axes?.[axis]?.I),
    sigma: axes?.[axis]?.sigma || 'L',
    valence: axes?.[axis]?.valence || '',
  };
}

function resolveFaceProfile(face, weights = {}) {
  if (face === 'inner') {
    return {
      face: 'inner',
      continuityBias: stableNumber(weights.faceInnerContinuityBias, 0.10),
      receivingMultiplier: stableNumber(weights.faceInnerReceivingMultiplier, 1.16),
      emissionMultiplier: stableNumber(weights.faceInnerEmissionMultiplier, 0.92),
      retentionMultiplier: stableNumber(weights.faceInnerRetentionMultiplier, 0.92),
    };
  }

  if (face === 'outer') {
    return {
      face: 'outer',
      continuityBias: -stableNumber(weights.faceOuterContinuityPenalty, 0.12),
      receivingMultiplier: stableNumber(weights.faceOuterReceivingMultiplier, 0.82),
      emissionMultiplier: stableNumber(weights.faceOuterEmissionMultiplier, 1.18),
      retentionMultiplier: stableNumber(weights.faceOuterRetentionMultiplier, 0.48),
    };
  }

  return {
    face: 'neutral',
    continuityBias: 0,
    receivingMultiplier: 1,
    emissionMultiplier: 1,
    retentionMultiplier: 0.8,
  };
}

export function buildEncounterContext(participantsById = {}) {
  const participants = {};
  for (const [participantId, participant] of Object.entries(participantsById || {})) {
    participants[participantId] = {
      id: participantId,
      axes: participant?._canonical_axes || participant?.axes || {},
    };
  }
  return { participants };
}

export function deriveRelationParticipation(
  event = {},
  primitive = {},
  participantId,
  axis,
  encounterContext = {},
  weights = {}
) {
  const empty = {
    aggregate: {
      deltaRIn: 0,
      deltaROut: 0,
      deltaIEvent: 0,
      contestM: 0,
      contractDst: 0,
      eventCount: 0,
    },
    trace: null,
  };

  const sourceAxis = event.sourceAxis || primitive.axis || axis || 'Org';
  const mediumAxis = event.mediumAxis || sourceAxis;
  const receivingAxis = event.receivingAxis || primitive.axis || axis || 'Org';

  const sourceState = readAxisState(encounterContext, event.sourceParticipantId, sourceAxis);
  const mediumState = readAxisState(encounterContext, event.mediumParticipantId, mediumAxis);
  const receivingState = readAxisState(encounterContext, event.receivingParticipantId, receivingAxis);

  const sourceDrive = mean([sourceState.R, sourceState.I]);
  const mediumConductance = mean([mediumState.A, mediumState.R]);
  const receivingHold = mean([receivingState.A, receivingState.R]);
  const faceProfile = resolveFaceProfile(event.face, weights);
  const orderProfile = resolveOrderProfile(event, weights);
  const legProfile = resolveDistributedLegProfile(event, primitive, axis, weights);

  const triadContinuity = clip01(
    1 -
      (0.7 * Math.abs(sourceDrive - mediumConductance)) -
      (0.5 * Math.abs(mediumConductance - receivingHold))
  );

  const relationTransfer = clip01(
    (0.45 * sourceDrive) +
      (0.35 * mediumConductance) +
      (0.20 * receivingHold)
  );

  const adjustedTriadContinuity = clip01(
    triadContinuity + faceProfile.continuityBias + orderProfile.continuityBias + legProfile.continuityBias
  );
  const adjustedRelationTransfer = clip01(
    relationTransfer * faceProfile.receivingMultiplier * orderProfile.receivingMultiplier * legProfile.receivingMultiplier
  );
  const scaledMagnitude = clip01(stableNumber(primitive.magnitude, 0));

  const receivingShift =
    (adjustedRelationTransfer - 0.5) *
    2 *
    scaledMagnitude *
    stableNumber(weights.relationReceivingGain, 0);

  const sourceEmissionCost =
    (1 - mediumConductance) *
    scaledMagnitude *
    stableNumber(weights.relationEmissionCost, 0) *
    faceProfile.emissionMultiplier *
    orderProfile.emissionMultiplier *
    legProfile.emissionMultiplier;

  const mediumBurden =
    mean([sourceDrive, receivingHold]) *
    scaledMagnitude *
    stableNumber(weights.relationMediumBurden, 0) *
    legProfile.mediumBurdenMultiplier;

  const contestGain =
    (1 - adjustedTriadContinuity) *
    scaledMagnitude *
    stableNumber(weights.relationContestGain, 0);

  const destructiveGain =
    (1 - adjustedRelationTransfer) *
    scaledMagnitude *
    stableNumber(weights.relationDestructiveGain, 0);

  const aggregate = {
    deltaRIn: 0,
    deltaROut: 0,
    deltaIEvent: 0,
    contestM: 0,
    contractDst: 0,
    eventCount: 0,
  };

  let role = null;

  if (participantId === event.receivingParticipantId && axis === primitive.axis) {
    role = 'receiving';
    aggregate.deltaRIn += receivingShift;
    aggregate.deltaIEvent += receivingShift * faceProfile.retentionMultiplier * orderProfile.retentionMultiplier * legProfile.retentionMultiplier;
    if (primitive.sigma === 'M') aggregate.contestM += contestGain;
    if (primitive.sigma === 'Dst') aggregate.contractDst += destructiveGain;
    aggregate.eventCount += 1;
  }

  if (participantId === event.sourceParticipantId && axis === primitive.axis) {
    role = role ? `${role}+source` : 'source';
    aggregate.deltaROut += sourceEmissionCost;
    aggregate.eventCount += 1;
  }

  if (participantId === event.mediumParticipantId && axis === mediumAxis) {
    role = role ? `${role}+medium` : 'medium';
    aggregate.deltaIEvent += mediumBurden;
    aggregate.deltaRIn += mediumBurden * 0.35;
    aggregate.eventCount += 1;
  }

  if (!aggregate.eventCount) return empty;

  return {
    aggregate,
    trace: {
      participantId,
      axis,
      primitiveAxis: primitive.axis,
      face: faceProfile.face,
      order_depth: orderProfile.order_depth,
      scan_index: orderProfile.scan_index,
      recursion_signal: orderProfile.recursion_signal,
      order_note: orderProfile.note,
      leg_scope: legProfile.leg_scope,
      trace_persistence: legProfile.trace_persistence,
      distributed_span: legProfile.distributed_span,
      persistence_signal: legProfile.persistence_signal,
      leg_note: legProfile.note,
      source: {
        participantId: event.sourceParticipantId,
        axis: sourceAxis,
        drive: sourceDrive,
      },
      medium: {
        participantId: event.mediumParticipantId,
        axis: mediumAxis,
        conductance: mediumConductance,
      },
      receiving: {
        participantId: event.receivingParticipantId,
        axis: receivingAxis,
        hold: receivingHold,
      },
      relation_transfer: relationTransfer,
      triad_continuity: triadContinuity,
      adjusted_relation_transfer: adjustedRelationTransfer,
      adjusted_triad_continuity: adjustedTriadContinuity,
      role,
    },
  };
}
