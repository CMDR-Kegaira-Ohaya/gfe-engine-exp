import { saveCaseSource } from './save-case-source.js';

export async function upsertCaseSource(connector, input) {
  const path = input.path || `cases/${input.slug}/source/case.md`;
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

  return saveCaseSource(connector, {
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
