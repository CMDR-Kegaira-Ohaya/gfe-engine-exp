import { state, esc, showMsg, getCurrentSession, setCurrentReport } from './state.js';
import { renderAll } from './render.js';

export function getBranchLabel() {
  return state.currentBranch === 'main'
    ? 'published'
    : state.currentBranch === 'drafts'
      ? 'draft'
      : state.currentBranch;
}

export function onRepoFilterChange() {}
export function resetRepoFilters() {}

export function loadRepoConfig() {
  try {
    const owner = localStorage.getItem('gfe_repo_owner');
    const repo = localStorage.getItem('gfe_repo_name');
    const branch = localStorage.getItem('gfe_repo_branch');
    const token = localStorage.getItem('gfe_repo_token');

    const ownerEl = document.getElementById('repo-owner');
    const repoEl = document.getElementById('repo-name');
    const tokenEl = document.getElementById('repo-token');

    if (owner && ownerEl) ownerEl.value = owner;
    if (repo && repoEl) repoEl.value = repo;
    if (token && tokenEl) tokenEl.value = token;
    if (branch) state.currentBranch = branch;
  } catch (e) {}
}

function persistRepoConfig() {
  try {
    localStorage.setItem('gfe_repo_owner', state.repoOwner || '');
    localStorage.setItem('gfe_repo_name', state.repoName || '');
    if (state.currentBranch) localStorage.setItem('gfe_repo_branch', state.currentBranch);
    if (state.githubToken) localStorage.setItem('gfe_repo_token', state.githubToken);
    else localStorage.removeItem('gfe_repo_token');
  } catch (e) {}
}

export function getRepoConfig() {
  state.repoOwner = document.getElementById('repo-owner')?.value.trim() || '';
  state.repoName = document.getElementById('repo-name')?.value.trim() || '';
  state.githubToken = document.getElementById('repo-token')?.value.trim() || '';
  persistRepoConfig();
  return !!(state.repoOwner && state.repoName);
}

function apiHeaders() {
  const headers = { Accept: 'application/vnd.github+json' };
  if (state.githubToken) headers.Authorization = `Bearer ${state.githubToken}`;
  return headers;
}

function setRepoStatus(text) {
  const el = document.getElementById('repo-status');
  if (!el) return;
  el.style.display = 'block';
  el.textContent = text;
}

function hideRepoFilters() {
  const filters = document.getElementById('repo-filters');
  if (filters) {
    filters.style.display = 'none';
    filters.innerHTML = '';
  }
}

function renderBranchControls() {
  const bar = document.getElementById('branch-bar');
  if (bar) {
    bar.style.display = 'none';
    bar.innerHTML = '';
  }

  const wrap = document.getElementById('branch-custom');
  const sel = document.getElementById('branch-select');
  if (!wrap || !sel) return;

  sel.innerHTML = state.repoBranches
    .map((branch) => `<option value="${branch}" ${branch === state.currentBranch ? 'selected' : ''}>${branch}</option>`)
    .join('');

  wrap.style.display = state.repoBranches.length ? 'flex' : 'none';
}

function renderRepoCaseList() {
  const listEl = document.getElementById('repo-list');
  if (!listEl) return;

  if (!state.repoCases.length) {
    listEl.innerHTML = '<div class="repo-empty">No case files on this branch.</div>';
    setRepoStatus(`${getBranchLabel()} · 0 cases`);
    return;
  }

  listEl.innerHTML = state.repoCases.map((c, i) => `
    <div class="repo-case" onclick="loadRepoCase(${i})">
      <div class="repo-case-name">${esc(c.system_name || c.filename)}</div>
      <div class="repo-case-meta">${esc(c.filename)}${c.size ? ' · ' + Math.round(c.size / 1024) + 'kb' : ''}</div>
      ${c.description ? `<div class="repo-case-desc">${esc(c.description)}</div>` : ''}
    </div>
  `).join('');

  setRepoStatus(`${getBranchLabel()} · ${state.repoCases.length} cases`);
}

async function fetchBranches() {
  const res = await fetch(
    `https://api.github.com/repos/${state.repoOwner}/${state.repoName}/branches`,
    { headers: apiHeaders() }
  );
  if (!res.ok) {
    throw new Error(res.status === 404 ? 'Repository not found' : `API error ${res.status}`);
  }
  const data = await res.json();
  state.repoBranches = data.map((b) => b.name);
  if (!state.repoBranches.includes(state.currentBranch)) {
    state.currentBranch = state.repoBranches.includes('main') ? 'main' : (state.repoBranches[0] || 'main');
  }
  persistRepoConfig();
}

async function fetchCasesFromContents() {
  const res = await fetch(
    `https://api.github.com/repos/${state.repoOwner}/${state.repoName}/contents/cases?ref=${encodeURIComponent(state.currentBranch)}`,
    { headers: apiHeaders() }
  );

  if (!res.ok) {
    if (res.status === 404) {
      state.repoCases = [];
      return;
    }
    throw new Error(`API error ${res.status}`);
  }

  const files = await res.json();
  state.repoCases = files
    .filter((f) => f.name.endsWith('.json') && f.name !== 'index.json')
    .map((f) => ({
      filename: f.name,
      size: f.size,
      system_name: f.name.replace(/\.json$/i, ''),
      download_url: f.download_url
    }));
}

export async function connectRepo() {
  if (!getRepoConfig()) {
    showMsg('Enter owner and repo name', 'error');
    return;
  }

  setRepoStatus('Connecting...');
  hideRepoFilters();

  try {
    await fetchBranches();
    renderBranchControls();
    await loadBranchCases();
  } catch (e) {
    setRepoStatus(e.message);
  }
}

export function switchBranch(branch) {
  state.currentBranch = branch;
  persistRepoConfig();
  loadBranchCases();
}

export async function loadBranchCases() {
  setRepoStatus(`Loading ${state.currentBranch}...`);
  const listEl = document.getElementById('repo-list');
  if (listEl) listEl.innerHTML = '';

  try {
    await fetchCasesFromContents();
    renderRepoCaseList();
  } catch (e) {
    setRepoStatus(e.message);
  }
}

async function fetchAnalysisMarkdown(filename) {
  const mdName = filename.replace(/\.json$/i, '_analysis.md');
  const url = `https://raw.githubusercontent.com/${state.repoOwner}/${state.repoName}/${state.currentBranch}/cases/${mdName}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return '';
    return await res.text();
  } catch (e) {
    return '';
  }
}

export async function loadRepoCase(idx, ingestCase) {
  const c = state.repoCases?.[idx];
  if (!c) return;

  setRepoStatus(`Loading ${c.filename}...`);

  try {
    const url = c.download_url || `https://raw.githubusercontent.com/${state.repoOwner}/${state.repoName}/${state.currentBranch}/cases/${c.filename}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Could not fetch file');

    const data = await res.json();
    ingestCase(data);

    const session = getCurrentSession();
    if (session) {
      const report = await fetchAnalysisMarkdown(c.filename);
      setCurrentReport(session, report);
    }

    renderAll();
    setRepoStatus(`Loaded ok · ${getBranchLabel()}`);
    setTimeout(() => setRepoStatus(`${getBranchLabel()} · ${state.repoCases.length} cases`), 1500);
  } catch (e) {
    setRepoStatus(`Error: ${e.message}`);
  }
}
