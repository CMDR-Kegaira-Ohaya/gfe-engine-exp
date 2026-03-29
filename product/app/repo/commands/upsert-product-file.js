import { readFileShaOrNull } from '../file-state.js';
import { normalizeRepoPath } from '../repo-profile.js';
import { saveProductFile } from './save-product-file.js';

export async function upsertProductFile(connector, input) {
  const path = normalizeRepoPath(input.path);
  const sha = input.sha ?? await readFileShaOrNull(connector, {
    path,
    branch: input.branch || 'main',
  });

  return saveProductFile(connector, {
    ...input,
    path,
    ...(sha ? { sha } : {}),
  });
}
