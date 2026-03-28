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
