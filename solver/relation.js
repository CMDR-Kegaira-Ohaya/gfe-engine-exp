import { clip01, stableNumber, toCanonicalScale } from './utils.js';

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

  const scaledMagnitude = clip01(stableNumber(primitive.magnitude, 0));

  const receivingShift =
    (relationTransfer - 0.5) *
    2 *
    scaledMagnitude *
    stableNumber(weights.relationReceivingGain, 0);

  const sourceEmissionCost =
    (1 - mediumConductance) *
    scaledMagnitude *
    stableNumber(weights.relationEmissionCost, 0);

  const mediumBurden =
    mean([sourceDrive, receivingHold]) *
    scaledMagnitude *
    stableNumber(weights.relationMediumBurden, 0);

  const contestGain =
    (1 - triadContinuity) *
    scaledMagnitude *
    stableNumber(weights.relationContestGain, 0);

  const destructiveGain =
    (1 - relationTransfer) *
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
    aggregate.deltaIEvent += receivingShift * 0.8;
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
      role,
    },
  };
}
