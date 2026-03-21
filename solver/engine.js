import { AXES, GROUNDING_AXES } from './constants.js';
import { DEFAULT_WEIGHTS } from './config.js';
import { aggregateAxisContributions, groupEventsByStep } from './payload.js';
import { clip01, deepClone, ensureAxesContainer, toCanonicalScale, toDisplayScale } from './utils.js';

export function cfgGate(cfgAxis, weights = DEFAULT_WEIGHTS) {
  const a = toCanonicalScale(cfgAxis?.A);
  const x = weights.cfgGateSlope * (a - weights.cfgGateCenter);
  return 1 / (1 + Math.exp(-x));
}

export function solveParticipantStep(previousParticipant = {}, events = [], weights = DEFAULT_WEIGHTS) {
  const previousAxes = ensureAxesContainer(previousParticipant.axes || {});
  const nextAxes = {};

  for (const axis of AXES) {
    const prev = previousAxes[axis];
    const A = toCanonicalScale(prev.A);
    const R = toCanonicalScale(prev.R);
    const I = toCanonicalScale(prev.I);
    const contributions = aggregateAxisContributions(events, previousParticipant.id, axis, weights);

    const nextR = clip01(
      R + contributions.retainedIn - (weights.emittedRegisterCost * contributions.emittedOut)
    );

    const nextI = clip01(
      I + contributions.intensityDelta + weights.relaxationRI * (nextR - I)
    );

    const gate = cfgGate(previousAxes.Cfg, weights);
    const nextA = clip01(
      A
      - contributions.misalignmentContest
      - contributions.destructiveContract
      + gate * weights.relaxationIA * (nextI - A)
    );

    let sigma = prev.sigma || 'L';
    if (contributions.destructiveContract > 0 || nextA < 0.2) sigma = 'Dst';
    else if (contributions.misalignmentContest > 0 || nextA < A || nextI > nextA + 0.1) sigma = 'M';
    else sigma = 'L';

    nextAxes[axis] = {
      A: toDisplayScale(nextA),
      R: toDisplayScale(nextR),
      I: toDisplayScale(nextI),
      sigma,
      valence: prev.valence || ''
    };
  }

  const cfgSigma = nextAxes.Cfg.sigma;
  const prevalence = {
    family: cfgSigma === 'Dst' ? 'M' : cfgSigma,
    note: previousParticipant.prevalence?.note || ''
  };

  const envelope = {
    adm: nextAxes.Cfg.A,
    bear: nextAxes.Emb.A,
    coh: nextAxes.Org.A,
    floor: Math.min(nextAxes.Cfg.A, nextAxes.Emb.A, nextAxes.Org.A)
  };

  return {
    ...deepClone(previousParticipant),
    axes: nextAxes,
    prevalence,
    envelope
  };
}

export function solveCase(caseData, options = {}) {
  const weights = { ...DEFAULT_WEIGHTS, ...(options.weights || {}) };
  const groupedEvents = groupEventsByStep(caseData.payload_events || []);
  const solved = deepClone(caseData);
  solved.solver = {
    version: '0.1.0',
    mode: 'derived',
    weights
  };

  const timeline = Array.isArray(solved.timeline) ? solved.timeline : [];
  for (let stepIndex = 0; stepIndex < timeline.length; stepIndex += 1) {
    const step = timeline[stepIndex];
    const stepEvents = groupedEvents.get(stepIndex) || [];
    const participants = step.participants || {};
    for (const [pid, participantData] of Object.entries(participants)) {
      participantData.id = pid;
      participantData.axes = ensureAxesContainer(participantData.axes);
      participants[pid] = solveParticipantStep(participantData, stepEvents, weights);
    }
  }

  solved.envelope_summary = buildEnvelopeSummary(solved);
  return solved;
}

export function buildEnvelopeSummary(caseData) {
  const summary = [];
  for (const step of caseData.timeline || []) {
    const row = { timestep_label: step.timestep_label, participants: {} };
    for (const [pid, participantData] of Object.entries(step.participants || {})) {
      const axes = participantData.axes || {};
      row.participants[pid] = {
        Adm: axes.Cfg?.A ?? 0,
        Bear: axes.Emb?.A ?? 0,
        Coh: axes.Org?.A ?? 0,
        Envelope: Math.min(
          axes.Cfg?.A ?? 0,
          axes.Emb?.A ?? 0,
          axes.Org?.A ?? 0
        )
      };
    }
    summary.push(row);
  }
  return summary;
}
