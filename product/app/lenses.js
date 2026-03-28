export const LENSES = [
  {
    id: 'structure',
    label: 'Structure',
    description: 'Read the case as a whole solved arrangement before following any one path.',
    note: 'Whole structure first. Source and narrative remain stable companions.',
  },
  {
    id: 'process',
    label: 'Process',
    description: 'Read the case as temporal flow through moments, especially useful even for single-participant cases.',
    note: 'Process lens follows continuity through moments. Trace reveals the active flow gently.',
  },
  {
    id: 'evidence',
    label: 'Evidence',
    description: 'Read the case through available artifacts and payload-bearing moments without claiming links we do not yet have.',
    note: 'Evidence lens is provisional. It emphasizes available artifacts and payload-bearing moments only.',
  },
];

export function normalizeLens(lensId) {
  return LENSES.some((lens) => lens.id === lensId) ? lensId : 'structure';
}

export function lensLabel(lensId) {
  return LENSES.find((lens) => lens.id === normalizeLens(lensId))?.label || 'Structure';
}

export function lensDescription(lensId) {
  return LENSES.find((lens) => lens.id === normalizeLens(lensId))?.description || LENSES[0].description;
}

export function lensNote(lensId) {
  return LENSES.find((lens) => lens.id === normalizeLens(lensId))?.note || LENSES[0].note;
}
