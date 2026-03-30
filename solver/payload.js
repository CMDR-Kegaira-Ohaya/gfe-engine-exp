import { AXES, MODES, REGISTERS, SIGMA, UNFOLDING } from './constants.js';
import { clip01, parseAlphaRef, stableNumber, toMagnitudeScale } from './utils.js';
import { deriveRelationParticipation } from './relation.js';

export function normalizeMode(mode) {
  const normalized = String(mode || 'load').replaceAll('_', '-');
  return MODES.includes(normalized) ? normalized : 'load';
}

export function normalizeSigma(sigma) {
  return SIGMA.includes(sigma) ? sigma : 'L';
}

export function normalizeUnfolding(unfolding) {
  return UNFOLDING.includes(unfolding) ? unfolding : 'acute';
}

export function normalizeRegister(register) {
  return REGISTERS.includes(register) ? register : 'retained';
}

function normalizeAxis(axis, fallback = 'Org') {
  return AXES.includes(axis) ? axis : fallback;
}

function normalizeEpsilon(event = {}) {
  const epsilon = event.epsilon || {};
  const deltaR = stableNumber(epsilon.delta_r ?? epsilon.deltaR ?? event.delta_r ?? event.deltaR, 0);
  const deltaI = stableNumber(epsilon.delta_i ?? epsilon.deltaI ?? event.delta_i ?? event.deltaI, 0);
  const deltaA = stableNumber(epsilon.delta_d ?? epsilon.deltaA ?? event.delta_d ?? event.deltaA ?? event.delta, 0);
  return { deltaR, deltaI, deltaA };
}

function normalizePrimitive(atom = {}, fallbackAxis = 'Org') {
  const axis = normalizeAxis(atom.axis ?? atom.d, fallbackAxis);
  const unfolding = normalizeUnfolding(atom.unfolding ?? atom.u);
  const register = normalizeRegister(atom.register ?? atom.r);
  const mode = normalizeMode(atom.mode ?? atom.mu);

  return {
    sigma: normalizeSigma(atom.sigma),
    d: axis,
    axis,
    unfolding,
    register,
    mode,
    mu: mode,
    epsilon: normalizeEpsilon(atom),
    magnitude: clip01(toMagnitudeScale(atom.magnitude ?? atom.g ?? 0))
  };
}

export function normalizePayloadEvent(event = {}) {
  const source = parseAlphaRef(event.alpha_source ?? event.alpha_from);
  const medium = parseAlphaRef(event.alpha_medium ?? event.medium);
  const receiving = parseAlphaRef(event.alpha_receiving ?? event.alpha_to);
  const fallbackAxis = normalizeAxis(event.axis ?? event.d ?? receiving.axis ?? source.axis ?? 'Org');

  const payloadBundleRaw = Array.isArray(event.payload_bundle) && event.payload_bundle.length
    ? event.payload_bundle
    : [event];

  return {
    ...event,
    timestep_idx: Number.isInteger(event.timestep_idx) ? event.timestep_idx : 0,
    alpha_source: source.raw,
    alpha_medium: medium.raw,
    alpha_receiving: receiving.raw,
    sourceParticipantId: source.participantId,
    mediumParticipantId: medium.participantId,
    receivingParticipantId: receiving.participantId,
    sourceAxis: normalizeAxis(source.axis, fallbackAxis),
    mediumAxis: normalizeAxis(medium.axis, fallbackAxis),
    receivingAxis: normalizeAxis(receiving.axis, fallbackAxis),
    axis: fallbackAxis,
    face: event.face || null,
    interference: event.interference || '',
    payload_bundle: payloadBundleRaw.map(atom => normalizePrimitive(atom, fallbackAxis))
  };
}

export function groupEventsByStep(payloadEvents = []) {
  const grouped = new Map();
  for (const rawEvent of payloadEvents) {
    const event = normalizePayloadEvent(rawEvent);
    const bucket = grouped.get(event.timestep_idx) || [];
    bucket.push(event);
    grouped.set(event.timestep_idx, bucket);
  }
  return grouped;
}

function defaultAggregateRow() {
  return {
    deltaRIn: 0,
    deltaROut: 0,
    deltaIEvent: 0,
    contestM: 0,
    contractDst: 0,
    eventCount: 0
  };
}

function mergeAggregateRow(target = defaultAggregateRow(), source = {}) {
  target.deltaRIn += source.deltaRIn || 0;
  target.deltaROut += source.deltaROut || 0;
  target.deltaIEvent += source.deltaIEvent || 0;
  target.contestM += source.contestM || 0;
  target.contractDst += source.contractDst || 0;
  target.eventCount += source.eventCount || 0;
  return target;
}

function incrementCounter(bucket = {}, key) {
  if (!key) return bucket;
  bucket[key] = (bucket[key] || 0) + 1;
  return bucket;
}

export function summarizeRelationTraces(relationTraces = []) {
  const summary = {
    trace_count: relationTraces.length,
    roles: {},
    faces: {},
    medium_participants: {},
    source_participants: {},
    receiving_participants: {},
    average_transfer: 0,
    average_continuity: 0,
  };

  if (!relationTraces.length) return summary;

  let transferSum = 0;
  let continuitySum = 0;

  for (const trace of relationTraces) {
    incrementCounter(summary.roles, trace.role || 'unknown');
    incrementCounter(summary.faces, trace.face || 'neutral');
    incrementCounter(summary.medium_participants, trace.medium?.participantId || 'unknown');
    incrementCounter(summary.source_participants, trace.source?.participantId || 'unknown');
    incrementCounter(summary.receiving_participants, trace.receiving?.participantId || 'unknown');
    transferSum += stableNumber(trace.adjusted_relation_transfer ?? trace.relation_transfer, 0);
    continuitySum += stableNumber(trace.adjusted_triad_continuity ?? trace.triad_continuity, 0);
  }

  summary.average_transfer = transferSum / relationTraces.length;
  summary.average_continuity = continuitySum / relationTraces.length;
  return summary;
}

export function aggregateAxisPayload(events = [], participantId, axis, weights, options = {}) {
  const totals = defaultAggregateRow();
  const relationTraces = [];
  const encounterContext = options.encounterContext || {};

  for (const event of events) {
    for (const primitive of event.payload_bundle || []) {
      if (primitive.axis !== axis) continue;
      const unfoldingWeight = primitive.unfolding === 'accumulated' ? weights.accumulatedWeight : weights.acuteWeight;
      const scaled = unfoldingWeight * clip01(primitive.magnitude);

      if (event.receivingParticipantId === participantId && primitive.register === 'retained') {
        totals.deltaRIn += ((weights.etaRByMode[primitive.mode] || 0) + primitive.epsilon.deltaR) * scaled;
        totals.deltaIEvent += ((weights.etaIByMode[primitive.mode] || 0) + primitive.epsilon.deltaI) * scaled;
        if (primitive.sigma === 'M') {
          totals.contestM += ((weights.etaAByMode[primitive.mode] || 0) + Math.max(0, primitive.epsilon.deltaA)) * scaled;
        }
        if (primitive.sigma === 'Dst') {
          totals.contractDst += ((weights.etaDstByMode[primitive.mode] || 0) + Math.max(0, primitive.epsilon.deltaA)) * scaled;
        }
        totals.eventCount += 1;
      }

      if (event.sourceParticipantId === participantId && primitive.register === 'emitted') {
        totals.deltaROut += (weights.emissionCostByMode[primitive.mode] || 0) * scaled;
        totals.eventCount += 1;
      }

      const relation = deriveRelationParticipation(
        event,
        primitive,
        participantId,
        axis,
        encounterContext,
        weights
      );

      mergeAggregateRow(totals, relation.aggregate);
      if (relation.trace) relationTraces.push(relation.trace);
    }
  }

  return { totals, relationTraces };
}

export function aggregateParticipantPayload(events = [], participantId, weights, options = {}) {
  const byAxis = {};
  const relationTraces = [];

  for (const axis of AXES) {
    const { totals, relationTraces: axisRelationTraces } = aggregateAxisPayload(
      events,
      participantId,
      axis,
      weights,
      options
    );
    byAxis[axis] = totals;
    relationTraces.push(...axisRelationTraces);
  }

  return {
    byAxis,
    relation_traces: relationTraces,
    relation_summary: summarizeRelationTraces(relationTraces),
  };
}

export function countParticipantModes(events = [], participantId) {
  const counts = {};
  for (const event of events) {
    const involved = event.sourceParticipantId === participantId || event.receivingParticipantId === participantId;
    if (!involved) continue;
    for (const primitive of event.payload_bundle || []) {
      counts[primitive.mode] = (counts[primitive.mode] || 0) + 1;
    }
  }
  return counts;
}
