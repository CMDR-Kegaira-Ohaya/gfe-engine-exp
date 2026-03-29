import { decodeBase64ToUtf8 } from './connector.js';

export async function verifyWriteResult(connector, result, options = {}) {
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

  const readBack = await connector.getPath({
    path: content.path,
    ref: options.branch || 'main',
  });
  const verified = extractReadBack(readBack);

  if (verified.path !== content.path) {
    throw new Error(`Write verification failed: read-back path mismatch for ${content.path}.`);
  }

  if (verified.sha !== content.sha) {
    throw new Error(`Write verification failed: read-back SHA mismatch for ${content.path}.`);
  }

  if (Object.prototype.hasOwnProperty.call(options, 'expectedText') && verified.text !== String(options.expectedText ?? '')) {
    throw new Error(`Write verification failed: read-back content did not match the saved draft for ${content.path}.`);
  }

  return {
    path: content.path,
    sha: content.sha,
    commitSha: result.commit?.sha || null,
    verified: {
      branch: options.branch || 'main',
      readBackPath: verified.path,
      readBackSha: verified.sha,
      contentMatched: Object.prototype.hasOwnProperty.call(options, 'expectedText'),
    },
  };
}

function extractReadBack(payload) {
  const file = payload?.content?.path ? payload.content : payload;
  if (!file?.path || !file?.sha) {
    throw new Error('Write verification failed: read-back payload was incomplete.');
  }

  let text = '';
  if (typeof file.content === 'string') {
    text = String(file.encoding || '').toLowerCase() === 'base64'
      ? decodeBase64ToUtf8(file.content)
      : file.content;
  }

  return {
    path: file.path,
    sha: file.sha,
    text,
  };
}
