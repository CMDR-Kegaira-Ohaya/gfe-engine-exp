import { eventsForStep, label, participantFromAlpha } from './helpers.js';
import { activeTraceTarget, targetLabel } from './interaction-state.js';

export function buildCorrespondenceHints(bundle, state) {
  const selection = state.selection;
  const pinned = state.pinned;
  const traceTarget = activeTraceTarget(state);
  const focusTarget = selection || pinned || traceTarget || null;
  const basisTerms = collectBasisTerms(bundle, [selection, pinned, traceTarget]).slice(0, 10);
  const sourceText = bundle?.source?.text || '';
  const narrativeText = bundle?.narrative?.text || '';
  const sourceMatches = findMatchedTerms(sourceText, basisTerms);
  const narrativeMatches = findMatchedTerms(narrativeText, basisTerms);

  return {
    basisLabel: focusTarget ? targetLabel(bundle, focusTarget) : 'Whole case',
    provisional: true,
    terms: basisTerms,
    source: {
      present: Boolean(sourceText),
      matchedTerms: sourceMatches,
      status: sourceText ? (sourceMatches.length ? 'term-hints' : 'present-unmatched') : 'missing',
    },
    narrative: {
      present: Boolean(narrativeText),
      matchedTerms: narrativeMatches,
      status: narrativeText ? (narrativeMatches.length ? 'term-hints' : 'present-unmatched') : 'missing',
    },
    structure: {
      present: Boolean(bundle?.structure),
      status: bundle?.structure ? 'anchored' : 'missing',
      note: focusTarget
        ? `Current focus anchors into structure as ${targetLabel(bundle, focusTarget)}.`
        : 'Whole-case structure is available as the primary map.',
    },
    note: 'These are provisional correspondence hints based on available terms and current focus. They are not solved source-structure-narrative links.',
  };
}

export function highlightTermsForState(bundle, state) {
  return buildCorrespondenceHints(bundle, state).terms;
}

function collectBasisTerms(bundle, targets) {
  const encoding = bundle?.structure;
  const collected = [];

  targets.filter(Boolean).forEach((target) => {
    if (target.type === 'entity') {
      collected.push(target.id, label(target.id));
      return;
    }

    if (target.type === 'moment') {
      const step = encoding?.timeline?.[Number(target.id)];
      if (step?.timestep_label) {
        collected.push(step.timestep_label);
      }

      Object.keys(step?.participants || {}).forEach((participantId) => {
        collected.push(participantId, label(participantId));
      });
      return;
    }

    if (target.type === 'event') {
      const event = findEventById(encoding, target.id);
      if (!event) return;

      [
        event?.sourceParticipantId,
        participantFromAlpha(event?.alpha_source),
        event?.receivingParticipantId,
        participantFromAlpha(event?.alpha_receiving),
        event?.mediumParticipantId,
        participantFromAlpha(event?.alpha_medium),
        event?.axis,
        event?.face,
        event?.interference,
      ].forEach((value) => {
        if (value) {
          collected.push(value, label(value));
        }
      });
    }
  });

  const deduped = [];
  const seen = new Set();

  collected
    .map((value) => String(value || '').trim())
    .filter((value) => value.length >= 3)
    .sort((left, right) => right.length - left.length)
    .forEach((value) => {
      const key = value.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(value);
      }
    });

  return deduped;
}

function findMatchedTerms(text, terms) {
  const haystack = String(text || '').toLowerCase();
  if (!haystack || !terms?.length) return [];

  return terms.filter((term) => haystack.includes(String(term).toLowerCase())).slice(0, 5);
}

function findEventById(encoding, id) {
  if (!encoding) return null;

  const [stepRaw, eventRaw] = String(id).split(':');
  const stepIndex = Number(stepRaw);
  const eventIndex = Number(eventRaw);
  const stepEvents = eventsForStep(Array.isArray(encoding.payload_events) ? encoding.payload_events : [], stepIndex);
  return stepEvents[eventIndex] || null;
}
