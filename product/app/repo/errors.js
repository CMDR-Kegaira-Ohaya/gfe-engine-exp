export function attachRepoWriteErrorMeta(error) {
  const source = error instanceof Error
    ? error
    : new Error(String(error || 'Unknown repo write error.'));

  if (source.repoWrite) {
    return source;
  }

  const repoWrite = classifyRepoWriteError(source);
  source.repoWrite = repoWrite;
  source.userMessage = repoWrite.userMessage;
  return source;
}

export function classifyRepoWriteError(error) {
  const message = String(error?.message || '').trim();
  const status = Number(error?.status || extractStatus(message) || 0);

  if (
    status === 401 ||
    status === 403 ||
    /forbidden|permission|access denied|bad credentials|resource not accessible/i.test(message)
  ) {
    return buildRepoWriteClassification(
      'permission-blocked',
      'Permission or token scope blocked the repo write.',
      message,
      status,
    );
  }

  if (isNotFoundError(error)) {
    return buildRepoWriteClassification(
      'path-not-found',
      'The target path could not be read or written at the requested location.',
      message,
      status || 404,
    );
  }

  if (isRetryableStaleWrite(error)) {
    return buildRepoWriteClassification(
      'stale-write-state',
      'The repo changed since the draft SHA was read. Refresh the current SHA and retry once.',
      message,
      status || 409,
    );
  }

  if (
    status === 422 ||
    /base64|malformed payload|invalid .*payload|invalid .*content|sha wasn't supplied|sha was not supplied|missing sha/i.test(message)
  ) {
    return buildRepoWriteClassification(
      'payload-rejected',
      'The write payload was rejected. Check Base64 transport, SHA/update shape, and path.',
      message,
      status || 422,
    );
  }

  return buildRepoWriteClassification(
    'unclassified-write-failure',
    'Repo write failed for an unclassified reason.',
    message,
    status || null,
  );
}

export function formatRepoWriteError(error) {
  const source = attachRepoWriteErrorMeta(error);
  const repoWrite = source.repoWrite || {};

  if (repoWrite.detail) {
    return `${repoWrite.userMessage} ${repoWrite.detail}`.trim();
  }

  return repoWrite.userMessage || source.message || 'Repo write failed.';
}

export function isNotFoundError(error) {
  const message = String(error?.message || '');
  return error?.status === 404 || /\b404\b/.test(message) || /not found/i.test(message);
}

export function isRetryableStaleWrite(error) {
  const message = String(error?.message || '').toLowerCase();
  const status = Number(error?.status || extractStatus(message) || 0);

  if (status === 409) {
    return true;
  }

  return (
    /non-fast-forward|branch moved|stale|conflict/.test(message) ||
    (message.includes('sha') && /does not match|is not the latest|isn'?t at|wasn'?t supplied|required for updates|update/i.test(message))
  );
}

function buildRepoWriteClassification(code, userMessage, detail, status) {
  return {
    code,
    userMessage,
    detail: detail ? `Connector detail: ${detail}` : '',
    status,
  };
}

function extractStatus(message) {
  const match = String(message || '').match(/\b(401|403|404|409|422)\b/);
  return match ? Number(match[1]) : null;
}
