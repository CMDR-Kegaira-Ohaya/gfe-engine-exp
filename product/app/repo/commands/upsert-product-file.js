import { normalizeRepoPath } from '../repo-profile.js';
import { saveProductFile } from './save-product-file.js';

export async function upsertProductFile(connector, input) {
  const path = normalizeRepoPath(input.path);
  let sha = input.sha || null;

  if (!sha) {
    try {
      const current = await connector.getPath({
        path,
        ref: input.branch || 'main',
      });
      sha = extractSha(current);
    } catch (error) {
      if (!isNotFound(error)) {
        throw error;
      }
    }
  }

  return saveProductFile(connector, {
    ...input,
    path,
    ...(sha ? { sha } : {}),
  });
}

function extractSha(payload) {
  if (payload?.sha) return payload.sha;
  if (payload?.content?.sha) return payload.content.sha;
  throw new Error('Could not extract SHA from getPath() result.');
}

function isNotFound(error) {
  const message = String(error?.message || '');
  return error?.status === 404 || /\b404\b/.test(message) || /not found/i.test(message);
}
