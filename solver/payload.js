import { AXES, MODES, REGISTERS, SIGMA, UNFOLDING } from './constants.js';
import { clip01, parseAlphaRef, stableNumber, toMagnitudeScale } from './utils.js';

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

export function aggregateAxisPayload(events = [], participantId, axis, weights) {
  const totals = defaultAggregateRow();

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
    }
  }

  return totals;
}

export function aggregateParticipantPayload(events = [], participantId, weights) {
  return Object.fromEntries(
    AXES.map(axis => [axis, aggregateAxisPayload(events, participantId, axis, weights)])
  );
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
