import { classifyRepoPath, normalizeRepoPath } from './repo-profile.js';

export function assertWriteAllowed(path, options = {}) {
  const normalized = normalizeRepoPath(path);
  const zone = classifyRepoPath(normalized);
  const allowedZones = options.allowedZones || [];

  if (!normalized) {
    throw new Error('Write blocked: empty repo path.');
  }

  if (zone === 'protected') {
    throw new Error(`Write blocked: ${normalized} is in a protected repo zone.`);
  }

  if (allowedZones.length && !allowedZones.includes(zone)) {
    throw new Error(`Write blocked: ${normalized} is in zone "${zone}", allowed zones are ${allowedZones.join(', ')}.`);
  }

  return {
    path: normalized,
    zone,
  };
}

export function assertProductPath(path) {
  return assertWriteAllowed(path, { allowedZones: ['product'] });
}

export function assertControlledCasePath(path) {
  return assertWriteAllowed(path, { allowedZones: ['controlled'] });
}
