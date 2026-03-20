import { state, showMsg } from './state.js';
import { normalizeSchema, detectType, mergeSession } from './normalize.js';
import { saveToStorage, loadFromStorage, clearAllStorage } from './storage.js';
import { renderAll, jumpTo, focusP, switchSession, removeSession } from './render.js';
import { connectRepo, switchBranch, loadRepoCase, onRepoFilterChange, resetRepoFilters, loadRepoConfig } from './repo.js';
import { saveCurrentCaseJson, saveCurrentAnalysisMd, saveBothToRepo } from './save.js';
import { onConstellationClick, zoomTo, zoomToSub } from './constellation.js';

export function loadFromPaste() {
  const raw = document.getElementById('paste-area')?.value.trim() || '';
  if (!raw) {
    showMsg('Nothing to load.', 'error');
    return;
  }

  let json = raw;
  try {
    const urlMatch = raw.match(/[?&]case=([^&\s]+)/);
    if (urlMatch) {
      json = decodeURIComponent(atob(urlMatch[1]));
    } else {
      const cleaned = raw.replace(/^```[a-z]*\n?/,'').replace(/\n?```$/,'').trim();
      try { json = decodeURIComponent(atob(cleaned)); } catch (e) { json = cleaned; }
    }
  } catch (e) {
    json = raw;
  }

  try {
    const data = JSON.parse(json);
    ingestCase(data);
    const pasteEl = document.getElementById('paste-area');
    if (pasteEl) pasteEl.value = '';
  } catch (e) {
    showMsg('Could not parse: ' + e.message, 'error');
  }
}

function readFile(f) {
  const r = new FileReader();
  r.onload = ev => {
    try {
      ingestCase(JSON.parse(ev.target.result));
    } catch (e) {
      showMsg('Could not parse ' + f.name, 'error');
    }
  };
  r.readAsText(f);
}

export function ingestCase(data) {
  data = normalizeSchema(data);
  const type = detectType(data);
  if (type === 'continuation' || type === 'expansion') {
    mergeSession(data, type);
  } else {
    data._type = type;
    data._id = Date.now();
    state.sessions.push(data);
    state.currentIdx = state.sessions.length - 1;
    state.currentT = 0;
    state.focusedPid = null;
    state.zoomStack = [];
  }
  saveToStorage();
  renderAll();
  showMsg('Case loaded: ' + (data.system_name || data.case_id || 'unnamed'), 'info');
}

export function clearAll() {
  state.sessions = [];
  state.currentIdx = 0;
  state.currentT = 0;
  state.focusedPid = null;
  state.zoomStack = [];
  clearAllStorage();
  renderAll();
}

export function setTab(t) {
  state.rightTab = t;
  const s = state.sessions[state.currentIdx];
  if (s) {
    const evt = new Event('gfe-tab-change');
    window.dispatchEvent(evt);
    renderAll();
  }
}

export function toggleC(id) {
  const b = document.getElementById(id);
  const a = document.getElementById('arr-' + id);
  if (!b) return;
  b.classList.toggle('closed');
  if (a) a.classList.toggle('open', !b.classList.contains('closed'));
}

function initDomBindings() {
  const fileInput = document.getElementById('file-input');
  if (fileInput) {
    fileInput.addEventListener('change', function(e) {
      Array.from(e.target.files).forEach(readFile);
      this.value = '';
    });
  }

  const dz = document.getElementById('drop-zone');
  if (dz) {
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
    dz.addEventListener('drop', e => {
      e.preventDefault();
      dz.classList.remove('drag-over');
      Array.from(e.dataTransfer.files).forEach(readFile);
    });
  }

  const canvas = document.getElementById('constellation-canvas');
  if (canvas) {
    canvas.addEventListener('click', e => onConstellationClick(e, renderAll));
  }

  window.addEventListener('resize', () => {
    const s = state.sessions[state.currentIdx];
    if (s) renderAll();
  });
}

export function initApp() {
  try {
    const params = new URLSearchParams(window.location.search);
    const qCase = params.get('case');
    if (qCase && qCase.length > 10) {
      const json = decodeURIComponent(atob(qCase));
      ingestCase(JSON.parse(json));
      return;
    }
    const hash = window.location.hash;
    if (hash && hash.length > 2) {
      const json = decodeURIComponent(atob(hash.slice(1)));
      ingestCase(JSON.parse(json));
      return;
    }
  } catch (e) {
    console.error('URL load error:', e);
  }
  loadFromStorage(renderAll);
}

window.loadFromPaste = loadFromPaste;
window.clearAll = clearAll;
window.switchSession = switchSession;
window.removeSession = removeSession;
window.connectRepo = connectRepo;
window.switchBranch = switchBranch;
window.onRepoFilterChange = onRepoFilterChange;
window.resetRepoFilters = resetRepoFilters;
window.loadRepoCase = (idx) => loadRepoCase(idx, ingestCase);
window.jumpTo = jumpTo;
window.focusP = focusP;
window.zoomTo = (i) => zoomTo(i, renderAll);
window.zoomToSub = (pid) => zoomToSub(pid, renderAll);
window.setTab = setTab;
window.toggleC = toggleC;
window.saveCurrentCaseJson = saveCurrentCaseJson;
window.saveCurrentAnalysisMd = saveCurrentAnalysisMd;
window.saveBothToRepo = saveBothToRepo;

renderAll();
window.addEventListener('load', () => {
  loadRepoConfig();
  initDomBindings();
  initApp();
});
