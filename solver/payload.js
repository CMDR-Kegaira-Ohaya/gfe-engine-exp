import { MODES } from './constants.js';
import { clip01, parseAlphaRef, toCanonicalScale } from './utils.js';

export function normalizeMode(mode) {
  const normalized = String(mode || 'load').replaceAll('_', '-');
  return MODES.includes(normalized) ? normalized : 'load';
}

export function normalizePayloadEvent(event) {
  const source = parseAlphaRef(event.alpha_source ?? event.alpha_from);
  const medium = parseAlphaRef(event.alpha_medium ?? event.medium);
  const receiving = parseAlphaRef(event.alpha_receiving ?? event.alpha_to);
  const axis = event.axis ?? event.d ?? receiving.axis ?? source.axis ?? 'Org';

  return {
    ...event,
    timestep_idx: Number.isInteger(event?.timestep_idx) ? event.timestep_idx : 0,
    alpha_source: source.raw,
    alpha_medium: medium.raw,
    alpha_receiving: receiving.raw,
    sourceParticipantId: source.participantId,
    mediumParticipantId: medium.participantId,
    receivingParticipantId: receiving.participantId,
    axis,
    d: axis,
    sigma: event?.sigma || 'L',
    unfolding: event?.unfolding || 'acute',
    register: event?.register || 'retained',
    mode: normalizeMode(event?.mode || event?.mu),
    magnitude: clip01(Number(event?.magnitude ?? 0))
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

export function aggregateAxisContributions(events, participantId, axis, weights) {
  const totals = {
    retainedIn: 0,
    emittedOut: 0,
    intensityDelta: 0,
    misalignmentContest: 0,
    destructiveContract: 0
  };

  for (const event of events) {
    if (event.axis !== axis) continue;

    const mag = clip01(event.magnitude);
    const unfoldingWeight = event.unfolding === 'accumulated' ? weights.accumulatedWeight : weights.acuteWeight;
    const mode = event.mode;

    if (event.receivingParticipantId === participantId && event.register === 'retained') {
      totals.retainedIn += (weights.retainedRetentionByMode[mode] || 0) * unfoldingWeight * mag;
      totals.intensityDelta += (weights.intensityByMode[mode] || 0) * unfoldingWeight * mag;
      if (event.sigma === 'M') {
        totals.misalignmentContest += (weights.misalignmentAvailabilityByMode[mode] || 0) * unfoldingWeight * mag;
      }
      if (event.sigma === 'Dst') {
        totals.destructiveContract += (weights.destructiveAvailabilityByMode[mode] || 0) * unfoldingWeight * mag;
      }
    }

    if (event.sourceParticipantId === participantId && event.register === 'emitted') {
      totals.emittedOut += (weights.emittedRetentionCostByMode[mode] || 0) * unfoldingWeight * mag;
    }
  }

  return totals;
}

export function normalizePayloadBundle(payloadBundle = []) {
  return payloadBundle.map(atom => ({
    ...atom,
    mode: normalizeMode(atom.mode || atom.mu),
    magnitude: clip01(toCanonicalScale(atom.magnitude ?? atom.g ?? 0))
  }));
}
