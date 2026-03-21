import { AXES, DASHBOARD_SCALE } from './constants.js';

export function deepClone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function clip01(value) {
  const n = Number.isFinite(value) ? value : 0;
  return Math.min(1, Math.max(0, n));
}

export function toCanonicalScale(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return n > 1 ? clip01(n / DASHBOARD_SCALE) : clip01(n);
}

export function toDisplayScale(value) {
  return Math.round(clip01(value) * DASHBOARD_SCALE);
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

export function parseAlphaRef(ref) {
  if (typeof ref !== 'string' || !ref.trim()) {
    return { raw: ref || '', participantId: null, axis: null };
  }
  const trimmed = ref.trim();
  const parts = trimmed.split('.');
  if (parts.length >= 2) {
    return { raw: trimmed, participantId: parts[0], axis: parts[parts.length - 1] };
  }
  return { raw: trimmed, participantId: trimmed, axis: null };
}
