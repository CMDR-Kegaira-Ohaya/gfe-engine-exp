import { AXES, DASHBOARD_SCALE } from './constants.js';

export function deepClone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function clip01(value) {
  const n = Number.isFinite(value) ? value : 0;
  return Math.min(1, Math.max(0, n));
}

export function stableNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function toCanonicalScale(value) {
  const n = stableNumber(value, 0);
  if (n > 1) return clip01(n / DASHBOARD_SCALE);
  return clip01(n);
}

export function toDisplayScale(value) {
  return Math.round(clip01(value) * DASHBOARD_SCALE);
}

export function toMagnitudeScale(value) {
  const n = stableNumber(value, 0);
  if (n <= 1) return clip01(n);
  if (n <= 10) return clip01(n / 10);
  return clip01(n / DASHBOARD_SCALE);
}

export function sigmoid(value) {
  const x = stableNumber(value, 0);
  return 1 / (1 + Math.exp(-x));
}

export function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function ensureAxesContainer(axes = {}) {
  const out = {};
  for (const axis of AXES) {
    const src = axes?.[axis] || {};
    out[axis] = {
      A: Number.isFinite(src.A) ? src.A : 0,
      R: Number.isFinite(src.R) ? src.R : 0,
      I: Number.isFinite(src.I) ? src.I : 0,
      sigma: src.sigma || 'L',
      valence: src.valence || ''
    };
  }
  return out;
}

export function defaultParticipantState(participantId = null) {
  return {
    id: participantId,
    axes: ensureAxesContainer({}),
    prevalence: { family: 'L', note: 'derived' },
    theta: { active: false, blocked_family: null, note: '' },
    compensation: { active: false, type: null, note: '' },
    envelope: { adm: 0, bear: 0, coh: 0, floor: 0 }
  };
}

export function parseAlphaRef(ref) {
  if (typeof ref !== 'string' || !ref.trim()) {
    return { raw: ref || '', participantId: null, axis: null, face: null };
  }
  const trimmed = ref.trim();
  const parts = trimmed.split('.');
  return {
    raw: trimmed,
    participantId: parts[0] || null,
    axis: parts.length >= 2 ? parts[parts.length - 1] : null,
    face: null
  };
}

export function toCanonicalAxisState(axisState = {}) {
  return {
    A: toCanonicalScale(axisState.A),
    R: toCanonicalScale(axisState.R),
    I: toCanonicalScale(axisState.I),
    sigma: axisState.sigma || 'L',
    valence: axisState.valence || ''
  };
}

export function fromCanonicalAxisState(axisState = {}) {
  return {
    A: toDisplayScale(axisState.A),
    R: toDisplayScale(axisState.R),
    I: toDisplayScale(axisState.I),
    sigma: axisState.sigma || 'L',
    valence: axisState.valence || ''
  };
}
