import { DEFAULT_WEIGHTS } from './config.js';
import { aggregateParticipantPayload, groupEventsByStep, countParticipantModes } from './payload.js';
import { derivePrevalence, deriveTheta } from './prevalence.js';
import { deriveEnvelope, buildEnvelopeSummary } from './envelope.js';
import { deriveCompensation } from './compensation.js';
import { deriveCascade, buildCascadeSummary } from './cascade.js';
import { deriveFailureGrammar } from './failure.js';
import { updateParticipantAxes, cfgGate } from './state.js';
import { buildEncounterContext } from './relation.js';
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

export function solveParticipantStep(previousParticipant = {}, events = [], weights = DEFAULT_WEIGHTS, options = {}) {
  const participant = mergeParticipantBase(previousParticipant, previousParticipant, previousParticipant.id || null);
  const payloadAudit = aggregateParticipantPayload(events, participant.id, weights, options);
  const aggregates = payloadAudit.byAxis;
  const updatedAxes = updateParticipantAxes(participant.axes, aggregates, weights);
  const prevalence = derivePrevalence(updatedAxes.canonical, payloadAudit.relation_summary, weights);
  const theta = deriveTheta(updatedAxes.canonical, prevalence, weights);
  const mode_counts = countParticipantModes(events, participant.id);
  const compensation = deriveCompensation(mode_counts, theta);
  const failure = deriveFailureGrammar(
    updatedAxes.canonical,
    mode_counts,
    prevalence,
    theta,
    compensation,
    payloadAudit.relation_summary,
    weights
  );
  const envelope = deriveEnvelope(updatedAxes.canonical);
  const cascade = deriveCascade({
    ...participant,
    axes: updatedAxes.display,
    _canonical_axes: updatedAxes.canonical,
    compensation,
    failure,
  });

  return {
    ...participant,
    axes: updatedAxes.display,
    _canonical_axes: updatedAxes.canonical,
    prevalence,
    theta,
    compensation,
    failure,
    envelope,
    cascade,
    solver_debug: {
      cfg_gate: updatedAxes.cfg_gate,
      aggregates,
      mode_counts,
      relation_traces: payloadAudit.relation_traces,
      relation_summary: payloadAudit.relation_summary,
      failure_summary: failure,
    },
  };
}

export function solveCase(caseData, options = {}) {
  const weights = { ...DEFAULT_WEIGHTS, ...(options.weights || {}) };
  const groupedEvents = groupEventsByStep(caseData.payload_events || []);
  const solved = deepClone(caseData);

  solved.solver = {
    version: '0.4.0',
    mode: 'canon-locked-runtime',
    weights,
  };

  const timeline = Array.isArray(solved.timeline) ? solved.timeline : [];
  const previousParticipants = new Map();

  for (let stepIndex = 0; stepIndex < timeline.length; stepIndex += 1) {
    const step = timeline[stepIndex];
    const stepEvents = groupedEvents.get(stepIndex) || [];
    const stepParticipants = step.participants || {};

    const mergedParticipants = new Map();
    for (const [participantId, participantData] of Object.entries(stepParticipants)) {
      mergedParticipants.set(
        participantId,
        mergeParticipantBase(previousParticipants.get(participantId), participantData, participantId)
      );
    }

    const encounterContext = buildEncounterContext(Object.fromEntries(mergedParticipants.entries()));

    for (const [participantId, mergedParticipant] of mergedParticipants.entries()) {
      const solvedParticipant = solveParticipantStep(mergedParticipant, stepEvents, weights, { encounterContext });
      stepParticipants[participantId] = solvedParticipant;
      previousParticipants.set(participantId, solvedParticipant);
    }
  }

  solved.envelope_summary = buildEnvelopeSummary(solved);
  solved.cascade_summary = buildCascadeSummary(solved);
  return solved;
}

export { buildEnvelopeSummary, buildCascadeSummary, cfgGate };
