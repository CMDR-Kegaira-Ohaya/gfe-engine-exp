import { DEFAULT_WEIGHTS } from './config.js';
import { aggregateParticipantPayload, groupEventsByStep, countParticipantModes } from './payload.js';
import { derivePrevalence, deriveTheta } from './prevalence.js';
import { deriveEnvelope, buildEnvelopeSummary } from './envelope.js';
import { deriveCompensation } from './compensation.js';
import { deriveCascade, buildCascadeSummary } from './cascade.js';
import { updateParticipantAxes, cfgGate } from './state.js';
import { deepClone, defaultParticipantState, ensureAxesContainer } from './utils.js';

function mergeParticipantBase(previousParticipant = {}, participantData = {}, participantId = null) {
  const base = deepClone(previousParticipant?.id ? previousParticipant : defaultParticipantState(participantId));
  const incoming = deepClone(participantData || {});
  return {
    ...base,
    ...incoming,
    id: participantId || incoming.id || base.id || null,
    axes: ensureAxesContainer(incoming.axes || base.axes || {}),
  };
}

export function solveParticipantStep(previousParticipant = {}, events = [], weights = DEFAULT_WEIGHTS) {
  const participant = mergeParticipantBase(previousParticipant, previousParticipant, previousParticipant.id || null);
  const aggregates = aggregateParticipantPayload(events, participant.id, weights);
  const updatedAxes = updateParticipantAxes(participant.axes, aggregates, weights);
  const prevalence = derivePrevalence(updatedAxes.canonical, weights);
  const theta = deriveTheta(updatedAxes.canonical, prevalence, weights);
  const mode_counts = countParticipantModes(events, participant.id);
  const compensation = deriveCompensation(mode_counts, theta);
  const envelope = deriveEnvelope(updatedAxes.canonical);
  const cascade = deriveCascade({
    ...participant,
    axes: updatedAxes.display,
    _canonical_axes: updatedAxes.canonical,
    compensation,
  });

  return {
    ...participant,
    axes: updatedAxes.display,
    _canonical_axes: updatedAxes.canonical,
    prevalence,
    theta,
    compensation,
    envelope,
    cascade,
    solver_debug: {
      cfg_gate: updatedAxes.cfg_gate,
      aggregates,
      mode_counts,
    },
  };
}

export function solveCase(caseData, options = {}) {
  const weights = { ...DEFAULT_WEIGHTS, ...(options.weights || {}) };
  const groupedEvents = groupEventsByStep(caseData.payload_events || []);
  const solved = deepClone(caseData);

  solved.solver = {
    version: '0.2.1',
    mode: 'canon-locked-runtime',
    weights,
  };

  const timeline = Array.isArray(solved.timeline) ? solved.timeline : [];
  const previousParticipants = new Map();

  for (let stepIndex = 0; stepIndex < timeline.length; stepIndex += 1) {
    const step = timeline[stepIndex];
    const stepEvents = groupedEvents.get(stepIndex) || [];
    const stepParticipants = step.participants || {};

    for (const [participantId, participantData] of Object.entries(stepParticipants)) {
      const merged = mergeParticipantBase(previousParticipants.get(participantId), participantData, participantId);
      const solvedParticipant = solveParticipantStep(merged, stepEvents, weights);
      stepParticipants[participantId] = solvedParticipant;
      previousParticipants.set(participantId, solvedParticipant);
    }
  }

  solved.envelope_summary = buildEnvelopeSummary(solved);
  solved.cascade_summary = buildCascadeSummary(solved);
  return solved;
}

export { buildEnvelopeSummary, buildCascadeSummary, cfgGate };
