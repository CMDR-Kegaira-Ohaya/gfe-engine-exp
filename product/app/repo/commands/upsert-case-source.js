import { readFileShaOrNull } from '../file-state.js';
import { saveCaseSource } from './save-case-source.js';

export async function upsertCaseSource(connector, input) {
  const path = input.path || `cases/${input.slug}/source/case.md`;
  const sha = input.sha ?? await readFileShaOrNull(connector, {
    path,
    branch: input.branch || 'main',
  });

  return saveCaseSource(connector, {
    ...input,
    path,
    ...(sha ? { sha } : {}),
  });
}
