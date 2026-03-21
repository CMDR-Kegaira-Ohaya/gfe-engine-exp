export const AXES = ['Cfg', 'Emb', 'Org', 'Dir', 'Leg'];

export const GLOSSES = {
  Cfg: 'admissibility · prevalence',
  Emb: 'bearable support',
  Org: 'coherence',
  Dir: 'directional expression',
  Leg: 'readability'
};

export const ZONES = {
  foundation: { dims: ['Cfg', 'Emb'], color: 'var(--gold)', pip: '#c9a84c', label: 'Foundation' },
  bridge: { dims: ['Org'], color: 'var(--teal)', pip: '#3a7a7a', label: 'Bridge' },
  articulation: { dims: ['Dir', 'Leg'], color: 'var(--violet)', pip: '#6a4a9a', label: 'Articulation' }
};

export const SIGMA_COLORS = {
  L: { bg: 'var(--al-pale)', fg: 'var(--al)', bar: 'rgba(74,138,90,0.5)', barBright: '#4a8a5a' },
  M: { bg: 'var(--mis-pale)', fg: 'var(--mis)', bar: 'rgba(192,112,64,0.5)', barBright: '#c07040' },
  Dst: { bg: 'var(--dst-pale)', fg: 'var(--dst)', bar: 'rgba(160,48,48,0.5)', barBright: '#a03030' }
};

export const state = {
  sessions: [],
  sessionReports: {},
  currentIdx: 0,
  currentT: 0,
  focusedPid: null,
  zoomStack: [],
  rightTab: 'axes',
  systemTab: 'overview',
  cNodes: [],
  repoOwner: '',
  repoName: '',
  repoBranches: [],
  currentBranch: 'main',
  repoCases: [],
  githubToken: '',
  repoFilter: { q: '', sigma: '', axis: '', mode: '', bundle: '', epsilon: '' }
};

export function show(id, visible) {
  const el = document.getElementById(id);
  if (el) el.style.display = visible ? '' : 'none';
}

export function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function escAttr(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function showMsg(msg, type = 'info') {
  const el = document.getElementById('msg-bar');
  if (!el) return;
  el.className = 'msg-bar msg-' + type;
  el.textContent = msg;
  el.style.display = 'block';
  if (type === 'info') {
    setTimeout(() => {
      el.style.display = 'none';
    }, 2500);
  }
}

export function getCurrentSession() {
  return state.sessions[state.currentIdx] || null;
}

export function getCurrentReport(session = getCurrentSession()) {
  if (!session?._id) return '';
  return state.sessionReports[session._id] || '';
}

export function setCurrentReport(session, markdown) {
  if (!session?._id) return;
  state.sessionReports[session._id] = markdown || '';
}

export function clearCurrentReport(session = getCurrentSession()) {
  if (!session?._id) return ;
  delete state.sessionReports[session._id];
}

export function findParticipant(session, id) {
  for (const p of session?.participants || []) {
    if (p.id === id) return p;
    if (p.sub_participants) {
      const found = p.sub_participants.find(x => x.id === id);
      if (found) return found;
    }
  }
  return null;
}
