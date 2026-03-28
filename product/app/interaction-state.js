import { eventTitle, label, participantFromAlpha } from './helpers.js';

export function sameTarget(left, right) {
  if (!left || !right) return false;
  return left.type === right.type && String(left.id) === String(right.id);
}

export function activeTraceTarget(state) {
  return state?.trace?.enabled ? state.trace.target : null;
}

export function targetLabel(bundle, target) {
  if (!target) return 'None';

  const encoding = bundle?.structure;
  if (!encoding) return `${target.type}: ${target.id}`;

  if (target.type === 'moment') {
    const stepIndex = Number(target.id);
    const step = encoding.timeline?.[stepIndex];
    return step?.timestep_label || `Step ${stepIndex + 1}`;
  }

  if (target.type === 'entity') {
    return label(target.id);
  }

  if (target.type === 'event') {
    const eventRef = findEventRef(encoding, target.id);
    return eventRef ? eventTitle(eventRef.event) : `Event ${target.id}`;
  }

  return `${target.type}: ${target.id}`;
}

export function buildTraceIndex(bundle, target) {
  const encoding = bundle?.structure;
  const steps = Array.isArray(encoding?.timeline) ? encoding.timeline : [];
  const eventRefs = enumerateEventRefs(Array.isArray(encoding?.payload_events) ? encoding.payload_events : []);
  const result = {
    target,
    moments: new Set(),
    entities: new Set(),
    events: new Set(),
    anchorMoment: null,
  };

  if (!encoding || !target) {
    return finalizeTrace(result, steps);
  }

  if (target.type === 'moment') {
    const stepIndex = Number(target.id);
    const step = steps[stepIndex];
    if (step) {
      result.anchorMoment = stepIndex;
      result.moments.add(String(stepIndex));
      Object.keys(step.participants || {}).forEach((participantId) => addEntityProcess(result, participantId, steps, eventRefs));
      eventRefs
        .filter((eventRef) => eventRef.stepIndex === stepIndex)
        .forEach((eventRef) => addEventRefToTrace(result, eventRef));
    }
  }

  if (target.type === 'entity') {
    addEntityProcess(result, String(target.id), steps, eventRefs);
  }

  if (target.type === 'event') {
    const eventRef = eventRefs.find((entry) => entry.id === String(target.id));
    if (eventRef) {
      result.anchorMoment = eventRef.stepIndex;
      addEventRefToTrace(result, eventRef);
      eventParticipants(eventRef.event).forEach((participantId) => addEntityProcess(result, participantId, steps, eventRefs));
    }
  }

  return finalizeTrace(result, steps);
}

function finalizeTrace(result, steps) {
  const orderedMoments = Array.from(result.moments)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);

  return {
    ...result,
    orderedMoments,
    flow: orderedMoments.map((stepIndex) => ({
      stepIndex,
      label: steps?.[stepIndex]?.timestep_label || `Step ${stepIndex + 1}`,
      isAnchor: result.anchorMoment === stepIndex,
    })),
    counts: {
      moments: result.moments.size,
      entities: result.entities.size,
      events: result.events.size,
    },
  };
}

function addEntityProcess(result, participantId, steps, eventRefs) {
  const normalized = String(participantId);
  result.entities.add(normalized);

  steps.forEach((step, stepIndex) => {
    if (step?.participants?.[normalized]) {
      result.moments.add(String(stepIndex));
    }
  });

  eventRefs.forEach((eventRef) => {
    if (eventParticipants(eventRef.event).has(normalized)) {
      addEventRefToTrace(result, eventRef);
    }
  });

  if (result.anchorMoment === null) {
    result.anchorMoment = result.orderedMoments?.[0] ?? findFirstMomentForEntity(steps, normalized);
  }
}

function findFirstMomentForEntity(steps, participantId) {
  const foundIndex = steps.findIndex((step) => step?.participants?.[participantId]);
  return foundIndex >= 0 ? foundIndex : null;
}

function addEventRefToTrace(result, eventRef) {
  result.events.add(eventRef.id);
  result.moments.add(String(eventRef.stepIndex));
  eventParticipants(eventRef.event).forEach((participantId) => result.entities.add(String(participantId)));
}

function enumerateEventRefs(events) {
  const localCounters = new Map();

  return events.map((event) => {
    const stepIndex = Number(event?.timestep_idx ?? event?.timestep_index ?? event?.timestep ?? 0);
    const localIndex = localCounters.get(stepIndex) || 0;
    localCounters.set(stepIndex, localIndex + 1);

    return {
      event,
      stepIndex,
      localIndex,
      id: `${stepIndex}:${localIndex}`,
    };
  });
}

function findEventRef(encoding, id) {
  return enumerateEventRefs(Array.isArray(encoding?.payload_events) ? encoding.payload_events : []).find(
    (eventRef) => eventRef.id === String(id),
  );
}

function eventParticipants(event) {
  const participantIds = new Set();

  [
    event?.sourceParticipantId,
    participantFromAlpha(event?.alpha_source),
    event?.receivingParticipantId,
    participantFromAlpha(event?.alpha_receiving),
    event?.mediumParticipantId,
    participantFromAlpha(event?.alpha_medium),
  ]
    .filter(Boolean)
    .forEach((value) => participantIds.add(String(value)));

  return participantIds;
}
