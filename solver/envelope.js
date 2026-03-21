import { GROUNDING_AXES } from './constants.js';
import { toCanonicalAxisState } from './utils.js';

export function deriveEnvelope(participantAxes = {}) {
  const canonical = Object.fromEntries(
    GROUNDING_AXES.map(axis => [axis, toCanonicalAxisState(participantAxes[axis] || {})])
  );

  const adm = canonical.Cfg.A;
  const bear = canonical.Emb.A;
  const coh = canonical.Org.A;
  const floor = Math.min(adm, bear, coh);
  const contracted = GROUNDING_AXES.some(axis => canonical[axis].sigma === 'Dst');

  return {
    adm,
    bear,
    coh,
    floor,
    contracted,
    note: contracted ? 'dst-contraction-on-grounding-axis' : ''
  };
}

export function buildEnvelopeSummary(caseData) {
  const rows = [];

  for (const step of caseData.timeline || []) {
    const row = {
      timestep_label: step.timestep_label,
      participants: {}
    };

    for (const [participantId, participantData] of Object.entries(step.participants || {})) {
      const envelope = participantData.envelope || deriveEnvelope(participantData._canonical_axes || participantData.axes || {});
      row.participants[participantId] = {
        Adm: Math.round(envelope.adm * 100),
        Bear: Math.round(envelope.bear * 100),
        Coh: Math.round(envelope.coh * 100),
        Envelope: Math.round(envelope.floor * 100),
        contracted: !!envelope.contracted
      };
    }

    rows.push(row);
  }

  return rows;
}
