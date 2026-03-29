import { encodeUtf8ToBase64 } from './connector.js';
import { attachRepoWriteErrorMeta, isRetryableStaleWrite } from './errors.js';
import { readFileShaOrNull } from './file-state.js';
import { verifyWriteResult } from './verify.js';

export async function writeTextFileWithPolicy(connector, input) {
  const {
    path,
    content,
    message,
    branch = 'main',
    sha = null,
  } = input;

  try {
    return await attemptVerifiedWrite(connector, {
      path,
      content,
      message,
      branch,
      sha,
    });
  } catch (error) {
    if (!isRetryableStaleWrite(error)) {
      throw attachRepoWriteErrorMeta(error);
    }

    const refreshedSha = await readFileShaOrNull(connector, {
      path,
      branch,
    });

    if (refreshedSha === sha) {
      throw attachRepoWriteErrorMeta(
        new Error(`Stale write recovery could not refresh the SHA for ${path}.`),
      );
    }

    try {
      const retried = await attemptVerifiedWrite(connector, {
        path,
        content,
        message,
        branch,
        sha: refreshedSha,
      });

      return {
        ...retried,
        retried: true,
        retryReason: 'stale-write-state',
        retrySha: refreshedSha,
      };
    } catch (retryError) {
      throw attachRepoWriteErrorMeta(retryError);
    }
  }
}

async function attemptVerifiedWrite(connector, options) {
  const { path, content, message, branch, sha } = options;

  const result = await connector.saveFile({
    path,
    message,
    content: encodeUtf8ToBase64(content),
    branch,
    ...(sha ? { sha } : {}),
  });

  const verified = await verifyWriteResult(connector, result, {
    expectedPath: path,
    previousSha: sha || null,
    expectedText: content,
    branch,
  });

  return {
    ...verified,
    retried: false,
  };
}
