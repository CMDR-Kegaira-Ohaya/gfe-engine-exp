import { GROUNDING_AXES } from './constants.js';
import { stableNumber, toCanonicalAxisState } from './utils.js';

function normalizeFailure(failure = {}) {
  return {
    active: !!failure?.active,
    primary: failure?.primary || null,
  };
}

function normalizeCompensation(compensation = {}) {
  return {
    active: !!compensation?.active,
    type: compensation?.type || null,
  };
}

function projectionStatus(failure = {}, compensation = {}) {
  if (failure.primary === 'collapse') return 'collapsed-envelope';
  if (failure.primary === 'suppression') return 'suppressed-envelope';
  if (failure.primary === 'plastic-deformation') return 'deformed-envelope';
  if (failure.primary === 'overflow') return 'overflow-conditioned-envelope';
  if (failure.primary === 'substitution') return 'substituted-envelope';
  if (compensation.active) return `compensated-${compensation.type || 'adaptive'}-envelope`;
  return 'nominal-envelope';
}

function projectionNote(failure = {}, prevalence = {}, compensation = {}) {
  if (failure.primary === 'collapse') {
    return prevalence?.destructive
      ? 'collapse projects destructive contraction across grounding envelope'
      : 'collapse projects blocked grounding continuity';
  }
  if (failure.primary === 'suppression') {
    return 'suppression projects damped grounding expression rather than full collapse';
  }
  if (failure.primary === 'plastic-deformation') {
    return 'plastic deformation projects altered maintained grounding form';
  }
  if (failure.primary === 'overflow') {
    return 'overflow projects excess load against available grounding margin';
  }
  if (failure.primary === 'substitution') {
    return 'substitution projects rerouted grounding pattern rather than blocked chain';
  }
  if (compensation.active) {
    return compensation.type === 'maladaptive'
      ? 'compensation projects maladaptive stabilization pressure'
      : 'compensation projects adaptive rerouting pressure';
  }
  return '';
}

function applyProjectionFloor(baseFloor, failure = {}) {
  if (failure.primary === 'collapse') return Math.min(baseFloor, 0.12);
  if (failure.primary === 'suppression') return Math.min(baseFloor, 0.28);
  if (failure.primary === 'plastic-deformation') return Math.min(baseFloor, 0.38);
  if (failure.primary === 'overflow') return Math.min(baseFloor, 0.48);
  if (failure.primary === 'substitution') return Math.min(baseFloor, 0.54);
  return baseFloor;
}

export function deriveEnvelope(participantAxes = {}, context = {}) {
  const canonical = Object.fromEntries(
    GROUNDING_AXES.map(axis => [axis, toCanonicalAxisState(participantAxes[axis] || {})])
  );

  const failure = normalizeFailure(context.failure || {});
  const prevalence = context.prevalence || { family: 'L', destructive: false };
  const compensation = normalizeCompensation(context.compensation || {});

  const adm = canonical.Cfg.A;
  const bear = canonical.Emb.A;
  const coh = canonical.Org.A;
  const floor = Math.min(adm, bear, coh);
  const contracted = GROUNDING_AXES.some(axis => canonical[axis].sigma === 'Dst');
  const projected_floor = applyProjectionFloor(floor, failure);
  const stress_signal = stableNumber((canonical.Cfg.I - canonical.Cfg.A), 0) + stableNumber((canonical.Org.I - canonical.Org.A), 0);
  const status = projectionStatus(failure, compensation);
  const note = projectionNote(failure, prevalence, compensation) || (contracted ? 'dst-contraction-on-grounding-axis' : '');

  return {
    adm,
    bear,
    coh,
    floor,
    projected_floor,
    contracted,
    status,
    primary_failure: failure.primary,
    stress_signal,
    note,
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
      const envelope = participantData.envelope || deriveEnvelope(
        participantData._canonical_axes || participantData.axes || {},
        {
          failure: participantData.failure,
          prevalence: participantData.prevalence,
          compensation: participantData.compensation,
        }
      );
      row.participants[participantId] = {
        Adm: Math.round(envelope.adm * 100),
        Bear: Math.round(envelope.bear * 100),
        Coh: Math.round(envelope.coh * 100),
        Envelope: Math.round(envelope.floor * 100),
        ProjectedEnvelope: Math.round(envelope.projected_floor * 100),
        contracted: !!envelope.contracted,
        status: envelope.status || 'nominal-envelope',
        primary_failure: envelope.primary_failure || null,
        note: envelope.note || '',
      };
    }

    rows.push(row);
  }

  return rows;
}
