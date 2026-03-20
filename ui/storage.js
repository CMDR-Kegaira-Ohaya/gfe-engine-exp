import { state } from './state.js';

export function saveToStorage() {
  try {
    localStorage.setItem('gfe_sessions_v15', JSON.stringify(state.sessions));
  } catch (e) {}
}

export function loadFromStorage(renderAll) {
  try {
    const s = localStorage.getItem('gfe_sessions_v15');
    if (s) {
      state.sessions = JSON.parse(s);
      renderAll();
    }
  } catch (e) {}
}

export function clearAllStorage() {
  try {
    localStorage.removeItem('gfe_sessions_v15');
  } catch (e) {}
}
