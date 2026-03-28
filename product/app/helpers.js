export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function label(value) {
  return String(value ?? '').trim().replaceAll('_', ' ');
}

export function participantFromAlpha(alpha) {
  const raw = String(alpha ?? '').trim();
  if (!raw) return '';
  return raw.split('.')[0];
}

export function eventsForStep(events, stepIndex) {
  return events.filter((event) => Number(event?.timestep_idx ?? event?.timestep_index ?? event?.timestep ?? 0) === stepIndex);
}

export function eventTitle(event) {
  const source = label(event?.sourceParticipantId ?? participantFromAlpha(event?.alpha_source));
  const receiving = label(event?.receivingParticipantId ?? participantFromAlpha(event?.alpha_receiving));

  if (source && receiving) return `${source} → ${receiving}`;
  if (source) return `${source} emits`;
  if (receiving) return `${receiving} receives`;
  return 'Payload event';
}
