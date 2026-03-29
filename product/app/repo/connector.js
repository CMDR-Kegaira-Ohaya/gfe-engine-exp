export function createRepoConnector(api) {
  if (!api || typeof api.getPath !== 'function' || typeof api.saveFile !== 'function') {
    throw new Error('Repo connector requires getPath() and saveFile() functions.');
  }

  return {
    getPath: api.getPath,
    saveFile: api.saveFile,
  };
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
