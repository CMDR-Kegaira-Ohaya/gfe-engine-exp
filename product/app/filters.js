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
