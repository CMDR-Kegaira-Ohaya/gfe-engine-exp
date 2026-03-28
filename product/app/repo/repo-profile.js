const PROTECTED_ROOTS = [
  'engine/',
  'solver/',
  '.github/workflows/',
];

const PROTECTED_FILES = [
  'privacy.html',
  'TOC.md',
];

const CONTROLLED_ROOTS = [
  'cases/',
];

const PRODUCT_ROOTS = [
  'product/',
];

export const REPO_PROFILE = {
  defaultBranch: 'main',
  defaultWriteMethod: 'saveFile',
  connectorBoundary: {
    transportEncoding: 'base64',
    reasoningFormat: 'plain-utf8',
    rule: 'Base64 is transport-only at the connector boundary.',
  },
  zones: {
    protectedRoots: PROTECTED_ROOTS,
    protectedFiles: PROTECTED_FILES,
    controlledRoots: CONTROLLED_ROOTS,
    productRoots: PRODUCT_ROOTS,
  },
  workflowManagedFiles: ['TOC.md'],
  writeVerification: {
    requireReadback: true,
    requireChangedShaWhenUpdating: true,
  },
};

export function normalizeRepoPath(path) {
  return String(path || '').replace(/^\.\//, '').replace(/^\/+/, '');
}

export function classifyRepoPath(path) {
  const normalized = normalizeRepoPath(path);

  if (!normalized) return 'unknown';
  if (PROTECTED_FILES.includes(normalized)) return 'protected';
  if (PROTECTED_ROOTS.some((root) => normalized === root.slice(0, -1) || normalized.startsWith(root))) return 'protected';
  if (CONTROLLED_ROOTS.some((root) => normalized === root.slice(0, -1) || normalized.startsWith(root))) return 'controlled';
  if (PRODUCT_ROOTS.some((root) => normalized === root.slice(0, -1) || normalized.startsWith(root))) return 'product';
  return 'other';
}
