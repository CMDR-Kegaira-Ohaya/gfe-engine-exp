import { label, participantFromAlpha } from './helpers.js';
import { resolveFilterState } from './filters.js';
import { activeTraceTarget, buildTraceIndex, sameTarget } from './interaction-state.js';

export const CANON_AXES = ['cfg', 'emb', 'org', 'dir', 'leg'];

export function canonAxisId(axisId) {
  const normalized = String(axisId ?? '').trim().toLowerCase();
  return CANON_AXES.includes(normalized) ? normalized : '';
}

export function canonAxisLabel(axisId) {
  const normalized = canonAxisId(axisId);
  return normalized ? normalized.slice(0, 1).toUpperCase() + normalized.slice(1) : 'Axis';
}

export function enumerateEventRefs(events) {
  const localCounters = new Map();

  return (Array.isArray(events) ? events : []).map((event) => {
    const stepIndex = Number(event?.timestep_idx ?? event?.timestep_index ?? event?.timestep ?? 0);
    const localIndex = localCounters.get(stepIndex) || 0;
    localCounters.set(stepIndex, localIndex + 1);

    return {
      id: `${stepIndex}:${localIndex}`,
      stepIndex,
      localIndex,
      event,
    };
  });
}

export function eventRefsForMoment(bundle, momentIndex) {
  return enumerateEventRefs(Array.isArray(bundle?.structure?.payload_events) ? bundle.structure.payload_events : [])
    .filter((eventRef) => eventRef.stepIndex === Number(momentIndex));
}

export function eventParticipantIds(event) {
  const ids = new Set();

  [
    event?.sourceParticipantId,
    participantFromAlpha(event?.alpha_source),
    event?.receivingParticipantId,
    participantFromAlpha(event?.alpha_receiving),
    event?.mediumParticipantId,
    participantFromAlpha(event?.alpha_medium),
  ]
    .filter(Boolean)
    .forEach((value) => ids.add(String(value)));

  return ids;
}

export function eventRoleSummary(event) {
  return {
    source: label(event?.sourceParticipantId ?? participantFromAlpha(event?.alpha_source)),
    receiving: label(event?.receivingParticipantId ?? participantFromAlpha(event?.alpha_receiving)),
    medium: label(event?.mediumParticipantId ?? participantFromAlpha(event?.alpha_medium)),
  };
}

export function listEntities(bundle) {
  const encoding = bundle?.structure;
  const ordered = [];
  const seen = new Set();

  const addEntity = (value) => {
    const normalized = String(value ?? '').trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    ordered.push(normalized);
  };

  (Array.isArray(encoding?.participants) ? encoding.participants : []).forEach(addEntity);

  (Array.isArray(encoding?.timeline) ? encoding.timeline : []).forEach((step) => {
    Object.keys(step?.participants || {}).forEach(addEntity);
  });

  enumerateEventRefs(Array.isArray(encoding?.payload_events) ? encoding.payload_events : []).forEach((eventRef) => {
    eventParticipantIds(eventRef.event).forEach(addEntity);
  });

  return ordered;
}

export function resolveActiveMoment(bundle, state, trace = null) {
  const steps = Array.isArray(bundle?.structure?.timeline) ? bundle.structure.timeline : [];
  if (!steps.length) return 0;

  const selectionMoment = state?.selection?.type === 'moment' ? Number(state.selection.id) : null;
  if (Number.isInteger(selectionMoment) && selectionMoment >= 0 && selectionMoment < steps.length) {
    return selectionMoment;
  }

  const pinnedMoment = state?.pinned?.type === 'moment' ? Number(state.pinned.id) : null;
  if (Number.isInteger(pinnedMoment) && pinnedMoment >= 0 && pinnedMoment < steps.length) {
    return pinnedMoment;
  }

  const anchorMoment = Number(trace?.anchorMoment);
  if (Number.isInteger(anchorMoment) && anchorMoment >= 0 && anchorMoment < steps.length) {
    return anchorMoment;
  }

  const firstPayloadMoment = eventRefsForMoment(bundle, 0).length ? 0 : enumerateEventRefs(Array.isArray(bundle?.structure?.payload_events) ? bundle.structure.payload_events : [])[0]?.stepIndex;
  if (Number.isInteger(firstPayloadMoment) && firstPayloadMoment >= 0 && firstPayloadMoment < steps.length) {
    return firstPayloadMoment;
  }

  return 0;
}

export function findEventRef(bundle, eventId) {
  const refs = enumerateEventRefs(Array.isArray(bundle?.structure?.payload_events) ? bundle.structure.payload_events : []);
  return refs.find((eventRef) => eventRef.id === String(eventId)) || null;
}

export function entityMomentExposure(bundle, entityId, momentIndex) {
  const encoding = bundle?.structure;
  const steps = Array.isArray(encoding?.timeline) ? encoding.timeline : [];
  const step = steps[momentIndex] || null;
  const eventRefs = eventRefsForMoment(bundle, momentIndex);

  const normalizedEntity = String(entityId ?? '');
  const currentEvents = eventRefs.filter((eventRef) => eventParticipantIds(eventRef.event).has(normalizedEntity));
  const present = Boolean(step?.participants?.[normalizedEntity]) || currentEvents.length > 0;
  const rack = rackFromEventRefs(currentEvents, normalizedEntity);
  const peers = summarizePeers(currentEvents, normalizedEntity);

  return {
    entityId: normalizedEntity,
    momentIndex,
    label: step?.timestep_label || `Step ${momentIndex + 1}`,
    present,
    currentEvents,
    rack,
    peers,
  };
}

export function entityHistory(bundle, entityId) {
  const steps = Array.isArray(bundle?.structure?.timeline) ? bundle.structure.timeline : [];
  return steps
    .map((step, momentIndex) => {
      const exposure = entityMomentExposure(bundle, entityId, momentIndex);
      if (!exposure.present && !exposure.currentEvents.length) return null;
      return {
        momentIndex,
        label: step?.timestep_label || `Step ${momentIndex + 1}`,
        eventCount: exposure.currentEvents.length,
        totalMagnitude: exposure.rack.totalMagnitude,
      };
    })
    .filter(Boolean);
}

export function buildCaseGraph(bundle, state) {
  const encoding = bundle?.structure;
  const steps = Array.isArray(encoding?.timeline) ? encoding.timeline : [];
  const payloadEvents = Array.isArray(encoding?.payload_events) ? encoding.payload_events : [];
  const eventRefs = enumerateEventRefs(payloadEvents);
  const entities = listEntities(bundle);
  const traceTarget = activeTraceTarget(state);
  const trace = buildTraceIndex(bundle, traceTarget);
  const filterState = resolveFilterState(state?.filters, { traceActive: Boolean(traceTarget) });
  const activeMoment = resolveActiveMoment(bundle, state, trace);
  const activeStep = steps[activeMoment] || null;
  const activeEventRefs = eventRefs.filter((eventRef) => eventRef.stepIndex === activeMoment);
  const activeEntities = new Set([
    ...Object.keys(activeStep?.participants || {}),
    ...activeEventRefs.flatMap((eventRef) => Array.from(eventParticipantIds(eventRef.event))),
  ]);

  const selection = state?.selection || null;
  const pinned = state?.pinned || null;
  const focusTarget = selection?.type === 'moment' && pinned?.type === 'entity'
    ? pinned
    : selection || pinned || traceTarget || null;
  const focusedEntityId = focusTarget?.type === 'entity' ? String(focusTarget.id) : '';

  const board = buildBoard(entities);
  const tracedOnly = Boolean(filterState.effective.tracedFlowOnly && traceTarget);
  const payloadOnly = Boolean(filterState.effective.payloadOnly);
  const focusDetailsOnly = Boolean(filterState.effective.focusDetailsOnly);

  const nodes = board.items.map((item) => {
    const momentExposure = entityMomentExposure(bundle, item.entityId, activeMoment);
    const isSelected = sameTarget(selection, { type: 'entity', id: item.entityId });
    const isPinned = sameTarget(pinned, { type: 'entity', id: item.entityId });
    const isTraced = trace.entities.has(String(item.entityId));
    const hasCurrentPayload = momentExposure.currentEvents.length > 0;
    const isPresent = activeEntities.has(String(item.entityId));
    const isDimmedByTrace = tracedOnly && !isTraced;
    const isDimmedByFocus = focusDetailsOnly && focusedEntityId && !momentExposure.currentEvents.some((eventRef) => eventTouchesEntityPair(eventRef.event, focusedEntityId, item.entityId)) && focusedEntityId !== item.entityId;
    const tone = resolveNodeTone({
      isSelected,
      isPinned,
      isTraced,
      hasCurrentPayload,
      isPresent,
    });

    return {
      ...item,
      label: label(item.entityId),
      tone,
      isSelected,
      isPinned,
      isTraced,
      isPresent,
      hasCurrentPayload,
      isDimmed: isDimmedByTrace || isDimmedByFocus,
      exposure: momentExposure,
    };
  });

  const edges = buildEdges({
    eventRefs: activeEventRefs,
    trace,
    focusedEntityId,
    tracedOnly,
    focusDetailsOnly,
  });

  const moments = steps.map((step, momentIndex) => {
    const stepEventRefs = eventRefs.filter((eventRef) => eventRef.stepIndex === momentIndex);
    const isTraced = trace.moments.has(String(momentIndex));
    const isAnchor = trace.anchorMoment === momentIndex;
    const hasPayload = stepEventRefs.length > 0;
    const isDimmedByTrace = tracedOnly && !isTraced && !isAnchor;
    const isDimmedByPayload = payloadOnly && !hasPayload;
    return {
      momentIndex,
      label: step?.timestep_label || `Step ${momentIndex + 1}`,
      shortLabel: `M${momentIndex + 1}`,
      isActive: activeMoment === momentIndex,
      isTraced,
      isAnchor,
      hasPayload,
      eventCount: stepEventRefs.length,
      participantCount: Object.keys(step?.participants || {}).length,
      isDimmed: isDimmedByTrace || isDimmedByPayload,
    };
  });

  return {
    bundle,
    traceTarget,
    trace,
    filterState,
    activeMoment,
    activeStep,
    entities,
    nodes,
    edges,
    moments,
    axisStats: summarizeAxisStats(payloadEvents),
    activeEventRefs,
    activeEntities,
    boardMeta: board.meta,
  };
}

function buildBoard(entities) {
  const count = entities.length || 1;
  const cols = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(count))));
  const rows = Math.max(1, Math.ceil(count / cols));
  const cellWidth = 208;
  const cellHeight = 92;
  const items = entities.map((entityId, index) => {
    const col = (index % cols) + 1;
    const row = Math.floor(index / cols) + 1;
    return {
      entityId,
      col,
      row,
      centerX: ((col - 1) * cellWidth) + (cellWidth / 2),
      centerY: ((row - 1) * cellHeight) + (cellHeight / 2),
    };
  });

  return {
    items,
    meta: {
      cols,
      rows,
      viewWidth: cols * cellWidth,
      viewHeight: rows * cellHeight,
    },
  };
}

function buildEdges({ eventRefs, trace, focusedEntityId, tracedOnly, focusDetailsOnly }) {
  const groups = new Map();

  eventRefs.forEach((eventRef) => {
    const roles = eventRoleSummary(eventRef.event);
    const pairs = [];

    if (roles.source && roles.receiving && roles.source !== roles.receiving) {
      pairs.push([
        normalizeEntityId(eventRef?.event?.sourceParticipantId ?? participantFromAlpha(eventRef?.event?.alpha_source)),
        normalizeEntityId(eventRef?.event?.receivingParticipantId ?? participantFromAlpha(eventRef?.event?.alpha_receiving)),
      ]);
    } else if (roles.source && roles.medium && roles.source !== roles.medium) {
      pairs.push([
        normalizeEntityId(eventRef?.event?.sourceParticipantId ?? participantFromAlpha(eventRef?.event?.alpha_source)),
        normalizeEntityId(eventRef?.event?.mediumParticipantId ?? participantFromAlpha(eventRef?.event?.alpha_medium)),
      ]);
    } else if (roles.medium && roles.receiving && roles.medium !== roles.receiving) {
      pairs.push([
        normalizeEntityId(eventRef?.event?.mediumParticipantId ?? participantFromAlpha(eventRef?.event?.alpha_medium)),
        normalizeEntityId(eventRef?.event?.receivingParticipantId ?? participantFromAlpha(eventRef?.event?.alpha_receiving)),
      ]);
    }

    pairs
      .filter(([fromId, toId]) => fromId && toId)
      .forEach(([fromId, toId]) => {
        if (tracedOnly && !trace.events.has(eventRef.id)) return;
        if (focusDetailsOnly && focusedEntityId && fromId !== focusedEntityId && toId !== focusedEntityId) return;

        const key = `${fromId}->${toId}`;
        const existing = groups.get(key) || {
          fromId,
          toId,
          eventRefs: [],
          magnitude: 0,
        };

        existing.eventRefs.push(eventRef);
        existing.magnitude += payloadMagnitude(eventRef.event);
        groups.set(key, existing);
      });
  });

  return Array.from(groups.values()).map((entry) => {
    const touchesFocus = focusedEntityId && (entry.fromId === focusedEntityId || entry.toId === focusedEntityId);
    const isTraced = entry.eventRefs.some((eventRef) => trace.events.has(eventRef.id));
    return {
      ...entry,
      tone: touchesFocus ? 'focus' : isTraced ? 'trace' : 'payload',
    };
  });
}

function normalizeEntityId(value) {
  const normalized = String(value ?? '').trim();
  return normalized || '';
}

function payloadMagnitude(event) {
  return (Array.isArray(event?.payload_bundle) ? event.payload_bundle : [])
    .reduce((total, item) => total + Number(item?.magnitude ?? 0), 0);
}

function summarizePeers(eventRefs, entityId) {
  const peers = new Map();
  const normalized = String(entityId);

  eventRefs.forEach((eventRef) => {
    eventParticipantIds(eventRef.event).forEach((peerId) => {
      if (peerId === normalized) return;
      peers.set(peerId, (peers.get(peerId) || 0) + 1);
    });
  });

  return Array.from(peers.entries())
    .map([(peerId, count)] => ({ peerId, count, label: label(peerId) }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function rackFromEventRefs(eventRefs, entityId) {
  const byAxis = Object.fromEntries(CANON_AXES.map((axisId) => [axisId, 0]));
  const byRole = { source: 0, receiving: 0, medium: 0 };
  const normalized = String(entityId);

  eventRefs.forEach((eventRef) => {
    const axisId = canonAxisId(eventRef.event?.axis);
    const magnitude = payloadMagnitude(eventRef.event);
    if (axisId) {
      byAxis[axisId] += magnitude;
    }

    const roles = {
      source: normalizeEntityId(eventRef?.event?.sourceParticipantId ?? participantFromAlpha(eventRef?.event?.alpha_source)),
      receiving: normalizeEntityId(eventRef?.event?.receivingParticipantId ?? participantFromAlpha(eventRef?.event?.alpha_receiving)),
      medium: normalizeEntityId(eventRef?.event?.mediumParticipantId ?? participantFromAlpha(eventRef?.event?.alpha_medium)),
    };

    Object.entries(roles).forEach(([roleName, roleId]) => {
      if (roleId && roleId === normalized) {
        byRole[roleName] += magnitude;
      }
    });
  });

  const maxMagnitude = Math.max(0, ...Object.values(byAxis));
  const axisEntries = CANON_AXES.map((axisId) => ({
    axisId,
    label: canonAxisLabel(axisId),
    magnitude: Number(byAxis[axisId].toFixed(2)),
    width: maxMagnitude > 0 ? Math.min(100, (byAxis[axisId] / maxMagnitude) * 100) : 0,
  }));

  return {
    byAxis,
    byRole,
    axisEntries,
    maxMagnitude: Number(maxMagnitude.toFixed(2)),
    totalMagnitude: Number(Object.values(byAxis).reduce((total, value) => total + value, 0).toFixed(2)),
  };
}

function resolveNodeTone({ isSelected, isPinned, isTraced, hasCurrentPayload, isPresent }) {
  if (isSelected || isPinned) return 'focus';
  if (isTraced) return 'trace';
  if (hasCurrentPayload) return 'payload';
  if (isPresent) return 'anchor';
  return 'quiet';
}

function summarizeAxisStats(events) {
  const counts = Object.fromEntries(CANON_AXES.map((axisId) => [axisId, 0]));
  (Array.isArray(events) ? events : []).forEach((event) => {
    const axisId = canonAxisId(event?.axis);
    if (axisId) {
      counts[axisId] += 1;
    }
  });
  return counts;
}

function eventTouchesEntityPair(event, leftEntityId, rightEntityId) {
  const participants = eventParticipantIds(event);
  return participants.has(String(leftEntityId)) && participants.has(String(rightEntityId));
}
