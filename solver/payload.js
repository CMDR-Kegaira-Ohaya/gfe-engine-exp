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
  const deltaR = stableNumber(
    epsilon?.delta_r ?? epsilon?.deltaR ?? epsilon?.dR ?? event.delta_r ?? event.deltaR ?? event.delta_R,
    0
  );
  const deltaI = stableNumber(
    epsilon?.delta_i ?? epsilon?.deltaI ?? epsilon?.dI ?? event.delta_i ?? event.deltaI ?? event.delta_I,
    0
  );
  const deltaA = stableNumber(
    epsilon?.delta_a ?? epsilon?.deltaA ?? epsilon?.delta ?? epsilon?.delta_d ?? event.delta_a ?? event.deltaA ?? event.delta ?? event.delta_d,
    0
  );
  return { deltaR, deltaI, deltaA };
}

function normalizePrimitive(event = {}, fallbackAxis = 'Org') {
  const axis = normalizeAxis(event.axis ?? event.d, fallbackAxis);
  const unfolding = normalizeUnfolding(event.unfolding ?? event.u);
  const register = normalizeRegister(event.register ?? event.r);
  const mode = normalizeMode(event.mode ?? event.mu);
  const magnitude = clip01(toMagnitudeScale(event.magnitude ?? event.g ?? 0));

  return {
    sigma: normalizeSigma(event.sigma),
    d: axis,
    axis,
    unfolding,
    u: unfolding,
    register,
    r: register,
    mode,
    mu: mode,
    epsilon: normalizeEpsilon(event),
    magnitude
  };
}

export function normalizePayloadEvent(event = {}) {
  const source = parseAlphaRef(event.alpha_source ?? event.alpha_from);
  const medium = parseAlphaRef(event.alpha_medium ?? event.medium);
  const receiving = parseAlphaRef(event.alpha_receiving ?? event.alpha_to);

  const fallbackAxis = normalizeAxis(
    event.axis ?? event.d ?? receiving.axis ?? source.axis ?? 'Org',
    'Org'
  );

  const payloadBundleRaw = Array.isArray(event.payload_bundle) && event.payload_bundle.length
    ? event.payload_bundle
    : [event];

  const payload_bundle = payloadBundleRaw.map(atom => normalizePrimitive(atom, fallbackAxis));

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
    d: fallbackAxis,
    face: event.face || null,
    payload_bundle,
    interference: event.interference || '',
    bearing: event.bearing || '',
    effect: event.effect || ''
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
      const unfoldingWeight = primitive.unfolding === 'accumulated'
        ? weights.accumulatedWeight
        : weights.acuteWeight;
      const magnitude = clip01(primitive.magnitude);
      const scaled = unfoldingWeight * magnitude;

      if (event.receivingParticipantId === participantId && primitive.register === 'retained') {
        totals.deltaRIn += ((weights.etaRByMode[primitive.mode] || 0) + primitive.epsilon.deltaR) * scaled;
        totals.deltaIEvent += ((weights.etaByMode??,{});
      }
    }
  }

  return totals;
}
