export function createRepoConnector(api) {
  if (!api || typeof api.getPath !== 'function' || typeof api.saveFile !== 'function') {
    throw new Error('Repo connector requires getPath() and saveFile() functions.');
  }

  const connector = {
    getPath: api.getPath,
    saveFile: api.saveFile,
  };

  const optionalMethods = [
    'getBranchRef',
    'getRef',
    'getCommit',
    'createTree',
    'createCommit',
    'updateRef',
  ];

  for (const method of optionalMethods) {
    if (typeof api[method] === 'function') {
      connector[method] = api[method];
    }
  }

  connector.supportsLowLevelDelete = supportsLowLevelDelete(connector);
  return connector;
}

export function supportsLowLevelDelete(connector) {
  const required = [
    'getCommit',
    'createTree',
    'createCommit',
    'updateRef',
  ];

  const hasHeadReader =
    typeof connector?.getRef === 'function' || typeof connector?.getBranchRef === 'function';

  return hasHeadReader && required.every((method) => typeof connector?.[method] === 'function');
}

export function encodeUtf8ToBase64(text) {
  return btoa(unescape(encodeURIComponent(String(text ?? ''))));
}

export function decodeBase64ToUtf8(value) {
  const cleaned = String(value ?? '').replace(/\s+/g, '');
  if (!cleaned) return '';

  try {
    return decodeURIComponent(escape(atob(cleaned)));
  } catch {
    return atob(cleaned);
  }
}
