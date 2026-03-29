import { attachRepoWriteErrorMeta, isNotFoundError } from './errors.js';

export async function readFileShaOrNull(connector, options) {
  const { path, branch = 'main' } = options;

  try {
    const current = await connector.getPath({
      path,
      ref: branch,
    });
    return extractSha(current);
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }

    throw attachRepoWriteErrorMeta(error);
  }
}

export function extractSha(payload) {
  if (payload?.sha) return payload.sha;
  if (payload?.content?.sha) return payload.content.sha;
  throw new Error('Could not extract SHA from getPath() result.');
}
