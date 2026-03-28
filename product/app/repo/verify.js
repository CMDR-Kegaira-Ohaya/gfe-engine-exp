export function verifyWriteResult(result, options = {}) {
  if (!result || typeof result !== 'object') {
    throw new Error('Write verification failed: missing result payload.');
  }

  const content = result.content || result.file || null;
  if (!content?.path) {
    throw new Error('Write verification failed: result did not include a written path.');
  }

  if (options.expectedPath && content.path !== options.expectedPath) {
    throw new Error(`Write verification failed: expected ${options.expectedPath}, got ${content.path}.`);
  }

  if (!content.sha) {
    throw new Error('Write verification failed: result did not include a content SHA.');
  }

  if (options.previousSha && options.previousSha === content.sha) {
    throw new Error('Write verification failed: content SHA did not change after the write.');
  }

  return {
    path: content.path,
    sha: content.sha,
    commitSha: result.commit?.sha || null,
  };
}
