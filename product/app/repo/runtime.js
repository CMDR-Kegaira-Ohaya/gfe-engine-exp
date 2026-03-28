import { createRepoConnector } from './connector.js';

const LOCAL_NOTE_KEY = 'gfe.product.workbench-note';
const NOTE_TEMPLATE_PATH = './assets/notes/workbench-note.md';

export function resolveRuntimeRepoConnector() {
  const api = window.__GFE_REPO_CONNECTOR__;

  if (!api) {
    return {
      mode: 'local-only',
      connector: null,
      message: 'No repo connector attached.',
    };
  }

  try {
    return {
      mode: 'repo',
      connector: createRepoConnector(api),
      message: 'Repo connector attached.',
    };
  } catch (error) {
    return {
      mode: 'local-only',
      connector: null,
      message: `Repo connector unavailable: ${error.message}`,
    };
  }
}

export async function loadInitialProductNote() {
  const local = readLocalProductNote();
  if (local !== null) {
    return {
      text: local,
      source: 'local-draft',
    };
  }

  try {
    const response = await fetch(NOTE_TEMPLATE_PATH, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }

    return {
      text: await response.text(),
      source: 'template',
    };
  } catch {
    return {
      text: '# Product workbench note\n\nNo note template could be loaded.\n',
      source: 'fallback',
    };
  }
}

export function storeLocalProductNote(text) {
  try {
    window.localStorage.setItem(LOCAL_NOTE_KEY, String(text ?? ''));
  } catch {
    // local storage is optional; ignore failures
  }
}

function readLocalProductNote() {
  try {
    return window.localStorage.getItem(LOCAL_NOTE_KEY);
  } catch {
    return null;
  }
}
