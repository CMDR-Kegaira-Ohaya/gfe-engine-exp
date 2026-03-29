export const FILTERS = [
  {
    id: 'tracedFlowOnly',
    label: 'Traced flow only',
    description: 'Reduce the view to the currently traced process flow when a trace is active.',
  },
  {
    id: 'payloadOnly',
    label: 'Payload moments only',
    description: 'Show only moments with payload-bearing events.',
  },
  {
    id: 'focusDetailsOnly',
    label: 'Details on focus',
    description: 'Hide secondary detail unless a target is inspected or pinned.',
  },
];

export function normalizeFilters(filters) {
  const source = filters || {};
  return {
    tracedFlowOnly: Boolean(source.tracedFlowOnly),
    payloadOnly: Boolean(source.payloadOnly),
    focusDetailsOnly: Boolean(source.focusDetailsOnly),
  };
}

export function toggleFilter(filters, id) {
  const normalized = normalizeFilters(filters);
  if (!(id in normalized)) {
    return normalized;
  }

  return {
    ...normalized,
    [id]: !normalized[id],
  };
}

export function activeFilterCount(filters) {
  return Object.values(normalizeFilters(filters)).filter(Boolean).length;
}

export function resolveFilterState(filters, options = {}) {
  const normalized = normalizeFilters(filters);
  const traceActive = Boolean(options.traceActive);

  const items = FILTERS.map((filter) => {
    const requested = normalized[filter.id];
    const availability = availabilityForFilter(filter.id, { traceActive });
    const effective = requested && availability.available;

    return {
      ...filter,
      requested,
      effective,
      available: availability.available,
      reason: availability.reason,
    };
  });

  return {
    normalized,
    items,
    effective: items.reduce((acc, item) => {
      acc[item.id] = item.effective;
      return acc;
    }, {}),
    counts: {
      requested: items.filter((item) => item.requested).length,
      effective: items.filter((item) => item.effective).length,
      waiting: items.filter((item) => item.requested && !item.available).length,
    },
  };
}

function availabilityForFilter(id, options) {
  if (id === 'tracedFlowOnly' && !options.traceActive) {
    return {
      available: false,
      reason: 'Needs an active trace.',
    };
  }

  return {
    available: true,
    reason: '',
  };
}
