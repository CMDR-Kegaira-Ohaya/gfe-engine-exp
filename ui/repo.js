import { state, esc, escAttr, showMsg, getCurrentSession, setCurrentReport } from './state.js';
import { renderAll } from './render.js';

export function getBranchLabel() {
  return state.currentBranch === 'main' ? 'published' : state.currentBranch === 'drafts' ? 'draft' : state.currentBranch;
}

function uniqFacet(key) {
  const set = new Set();
  (state.repoCases || []).forEach(c => (c?.[key] || []).forEach(v => v && set.add(String(v))));
  return Array.from(set).sort();
}

export function onRepoFilterChange(key, val) {
  state.repoFilter[key] = val;
  renderRepoFilters();
  renderRepoCaseList();
}

export function resetRepoFilters() {
  state.repoFilter = { q: '', sigma: '', axis: '', mode: '', bundle: '', epsilon: '' };
  renderRepoFilters();
  renderRepoCaseList();
}

function caseMatchesRepoFilters(c) {
  if (!c) return false;

  const q = (state.repoFilter.q || '').trim().toLowerCase();
  if (q) {
    const hay = ((c.system_name || '') + ' ' + (c.filename || '') + ' ' + (c.description || '')).toLowerCase();
    if (!hay.includes(q)) return false;
  }

  if (state.repoFilter.sigma && !(c.payload_sigmas || []).includes(state.repoFilter.sigma)) return false;
  if (state.repoFilter.axis && !(c.payload_axes || []).includes(state.repoFilter.axis)) return false;

  if (state.repoFilter.mode) {
    const modes = (c.payload_modes || []).map(m => String(m).replaceAll('_', '-'));
    if (!modes.includes(state.repoFilter.mode)) return false;
  }

  if (state.repoFilter.bundle === 'yes' && !c.uses_payload_bundle) return false;
  if (state.repoFilter.bundle === 'no' && c.uses_payload_bundle) return false;
  if (state.repoFilter.epsilon === 'yes' && !c.has_epsilon) return false;
  if (state.repoFilter.epsilon === 'no' && c.has_epsilon) return false;

  return true;
}

export function renderRepoFilters() {
  const el = document.getElementById('repo-filters');
  if (!el) return;

  if (!state.repoCases || !state.repoCases.length) {
    el.style.display = 'none';
    return;
  }

  const sigmas = uniqFacet('payload_sigmas');
  const axes = uniqFacet('payload_axes');
  const modes = uniqFacet('payload_modes').map(m => String(m).replaceAll('_', '-')).sort();
  const opt = (val, label, cur) => `<option value="${escAttr(val)}" ${val === cur ? 'selected' : ''}>${esc(label)}</option>`;

  el.style.display = '';
  el.innerHTML = `
    <input class="repo-filter-input" placeholder="search…" value="${escAttr(state.repoFilter.q)}"
      oninput="onRepoFilterChange('q', this.value)">
    <div class="repo-filter-row">
      <select class="repo-filter-select" onchange="onRepoFilterChange('sigma', this.value)">
        ${opt('', 'σ any', state.repoFilter.sigma)}
        ${sigmas.map(s => opt(s, 'σ ' + s, state.repoFilter.sigma)).join('')}
      </select>
      <select class="repo-filter-select" onchange="onRepoFilterChange('axis', this.value)">
        ${opt('', 'axis any', state.repoFilter.axis)}
        ${axes.map(a => opt(a, a, state.repoFilter.axis)).join('')}
      </select>
      <select class="repo-filter-select" onchange="onRepoFilterChange('mode', this.value)">
        ${opt('', 'mode any', state.repoFilter.mode)}
        ${modes.map(m => opt(m, m, state.repoFilter.mode)).join('')}
      </select>
    </div>
    <div class="repo-filter-row">
      <select class="repo-filter-select" onchange="onRepoFilterChange('bundle', this.value)">
        ${opt('', 'bundle any', state.repoFilter.bundle)}
        ${opt('yes', 'bundle only', state.repoFilter.bundle)}
        ${opt('no', 'no bundle', state.repoFilter.bundle)}
      </select>
      <select class="repo-filter-select" onchange="onRepoFilterChange('epsilon', this.value)">
        ${opt('', 'ε any', state.repoFilter.epsilon)}
        ${opt('yes', 'ε present', state.repoFilter.epsilon)}
        ${opt('no', 'ε absent', state.repoFilter.epsilon)}
      </select>
      <button class="btn btn-ghost" onclick="resetRepoFilters()" style="padding:4px 10px;font-size:9px;">Reset</button>
    </div>
  `;
}

function renderRepoChipRow(c) {
  const chips = [];
  (c.payload_sigmas || []).forEach(s => chips.push(`<span class="repo-chip sigma-${escAttr(s)}">σ ${esc(s)}</span>`));
  (c.payload_axes || []).slice(0, 5).forEach(a => chips.push(`<span class="repo-chip axis">${esc(a)}</span>`));
  (c.payload_modes || []).slice(0, 3).forEach(m => chips.push(`<span class="repo-chip mode">${esc(String(m).replaceAll('_', '-'))}</span>`));
  if (c.uses_payload_bundle) chips.push(`<span class="repo-chip flag">bundle</span>`);
  if (c.has_epsilon) chips.push(`<span class="repo-chip flag">ε</span>`);
  if (typeof c.payload_primitives === 'number') chips.push(`<span class="repo-chip">prim ${c.payload_primitives}</span>`);
  if (typeof c.payload_events === 'number') chips.push(`<span class="repo-chip">ev ${c.payload_events}</span>`);
  return chips.length ? `<div class="repo-chip-row">${chips.join('')}</div>` : '';
}

export function renderRepoCaseList() {
  const statusEl = document.getElementById('repo-status');
  const listEl = document.getElementById('repo-list');
  if (!listEl) return;

  const filtered = (state.repoCases || []).map((c, i) => ({ c, i })).filter(({ c }) => caseMatchesRepoFilters(c));
  if (statusEl) statusEl.textContent = `${getBranchLabel()} · ${filtered.length}/$(state.repoCases || []).length} cases`;

  if (!filtered.length) {
    listEl.innerHTML = '<div class="repo-empty">No cases match filters.</div>';
    return;
  }

  listEl.innerHTML = filtered.map(({ c, i }) => `
    <div class="repo-case" onclick="loadRepoCase(${i})">
      <div class="repo-case-name">${esc(c.system_name || c.filename)}</div>
      <div class="repo-case-meta">
        ${esc(c.filename)}
        ${c.participants ? ' · ' + c.participants + 'p' : ''}
        ${c.timesteps ? ' · ' + c.timesteps + 't' : ''}
        ${c.size ? ' · ' + Math.round(c.size / 1024) + 'kb' : ''}
        ${c.modified ? ' · ' + esc(String(c.modified).slice(0, 10)) : ''}
      </div>
      ${c.description ? `<div class="repo-case-desc">${esc(c.description)}</div>` : ''}
      ${renderRepoChipRow(c)}
    </div>`).join('');
}

export function getRepoConfig() {
  state.repoOwner = document.getElementById('repo-owner')?.value.trim() || '';
  state.repoName = document.getElementById('repo-name')?.value.trim() || '';
  state.githubToken = document.getElementById('repo-token')?.value.trim() || '';

  try {
    localStorage.setItem('gfe_repo_owner', state.repoOwner);
    localStorage.setItem('gfe_repo_name', state.repoName);
    if (state.githubToken) localStorage.setItem('gfe_repo_token', state.githubToken);
    else localStorage.removeItem('gfe_repo_token');
  } catch (e) {}

  return state.repoOwner && state.repoName;
}

export function loadRepoConfig() {
  try {
    const o = localStorage.getItem('gfe_repo_owner');
    const n = localStorage.getItem('gfe_repo_name');
    const b = localStorage.getItem('gfe_repo_branch');
    const t = localStorage.getItem('gfe_repo_token');
    if (o) document.getElementById('repo-owner').value = o;
    if (n) document.getElementById('repo-name').value = n;
    if (b) state.currentBranch = b;
    if (t) {
      state.githubToken = t;
      const tokenEl = document.getElementById('repo-token');
      if (tokenEl) tokenEl.value = t;
    }
  } catch (e) {}
}

function branchHeaders() {
  return { Accept: 'application/vnd.github+json' };
}

export async function connectRepo() {
  if (!getRepoConfig()) {
    showMsg('Enter owner and repo name', 'error');
    return;
  }

  const statusEl = document.getElementById('repo-status');
  if (statusEl) {
    statusEl.style.display = 'block';
    statusEl.textContent = 'Connecting…";
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${state.repoOwner}/${state.repoName}/branches`, {
      headers: branchHeaders()
    });
    if (!res.ok) throw new Error(res.status === 404 ? 'Repository not found' : 'API error ' + res.status);
    state.repoBranches = (await res.json()).map(b => b.name);
  } catch (e) {
    if (statusEl) statusEl.textContent = e.message;
    return;
  }

  const mainBranches = state.repoBranches.filter(b => b === 'main');
  const draftBranches = state.repoBranches.filter(b => b === 'drafts');
  const projectBranches = state.repoBranches.filter(b => b.startsWith('cases/'));
  const otherBranches = state.repoBranches.filter(b => b !== 'main' && b !== 'drafts' && !b.startsWith('cases/'));

  const barEl = document.getElementById('branch-bar');
  const quickBranches = [...mainBranches, ...draftBranches, ...projectBranches.slice(0, 3)];
  if (barEl) {
    if (quickBranches.length > 1 || projectBranches.length > 0) {
      barEl.style.display = 'flex';
      barEl.innerHTML = quickBranches.map(b => {
        const cls = b === 'drafts' ? 'draft' : b.startsWith('cases/') ? 'project' : '';
        const label = b.startsWith('cases/') ? b.replace('cases/', '') : b;
        return `<div class="branch-tab ${cls} ${b === state.currentBranch ? 'active' : ''}" onclick="switchBranch('${bw}')" title="${b}">${esc(label)}</div>`;
      }).join('');
    } else {
      barEl.style.display = 'none';
    }
  }

  const customEl = document.getElementById('branch-custom');
  const allNonQuick = [...projectBranches.slice(3), ...otherBranches];
  if (customEl) {
    if (allNonQuick.length > 0) {
      customEl.style.display = 'flex';
      const sel = document.getElementById('branch-select');
      if (sel) {
        sel.innerHTML = `<option value="" disabled>More branches… </option>` +
          allNonQuick.map(b => `<option value="${b}" ${b === state.currentBranch ? 'selected' : ''}>${b}</option>`).join('');
      }
    } else {
      customEl.style.display = 'none';
    }
  }

  if (!state.repoBranches.includes(state.currentBranch)) state.currentBranch = 'main';
  await loadBranchCases();
}

export function switchBranch(branch) {
  state.currentBranch = branch;
  try { localStorage.setItem('gfe_repo_branch', branch); } catch (e) {}

  document.querySelectorAll('.branch-tab').forEach(el => {
    el.classList.toggle('active', el.getAttribute('onclick')?.includes(`'${branch}'`));
  });
  const sel = document.getElementById('branch-select');
  if (sel) sel.value = branch;

  loadBranchCases();
}

export async function loadBranchCases() {
  const statusEl = document.getElementById('repo-status');
  const listEl = document.getElementById('repo-list');
  if (statusEl) {
    statusEl.style.display = 'block';
    statusEl.textContent = `Loading ${state.currentBranch}…`;
  }
  if (listEl) listEl.innerHTML = '';

  state.repoCases = [];

  try {
    let indexUrl;
    if (state.currentBranch === 'main') {
      indexUrl = `https://${state.repoOwner}.github.io/${state.repoName}/cases/index.json`;
    } else {
      indexUrl = `https://raw.githubusercontent.com/${state.repoOwner}/${state.repoName}/${state.currentBranch}/cases/index.json`;
    }

    const res = await fetch(indexUrl);
    if (res.ok) {
      const data = await res.json();
      state.repoCases = data.cases || [];
    } else {
      throw new Error('No index');
    }
  } catch (e) {
    try {
      const res = await fetch(`https://api.github.com/repos/${state.repoOwner}/${state.repoName}/contents/cases?ref=${state.currentBranch}`, {
        headers: branchHeaders()
      });

      if (!res.ok) {
        if (res.status === 404) {
          if (statusEl) statusEl.textContent = `No cases/ on ${state.currentBranch}`;
          if (listEl) listEl.innerHTML = '<div class="repo-empty">No cases directory on this branch yet.</div>';
          return;
        }
        throw new Error('API error ' + res.status);
      }

      const files = await res.json();
      state.repoCases = files
        .filter(f => f.name.endsWith('.json') && f.name !== 'index.json')
        .map(f => ({
          filename: f.name,
          size: f.size,
          system_name: f.name.replace('.json', ''),
          download_url: f.download_url
        }));
    } catch (e2) {
      if (statusEl) statusEl.textContent = e2.message;
      return;
    }
  }

  if (!state.repoCases.length) {
    if (statusEl) statusEl.textContent = `${getBranchLabel()} · 0 cases`;
    const fEl = document.getElementById('repo-filters');
    if (fEl) fEl.style.display = 'none';
    if (listEl) listEl.innerHTML = '<div class="repo-empty">No case files on this branch.</div>';
    return;
  }

  state.repoFilter = { q: '', sigma: '', axis: '', mode: '', bundle: '', epsilon: '' };
  renderRepoFilters();
  renderRepoCaseList();
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

  const statusEl = document.getElementById('repo-status');
  const branchLabel = getBranchLabel();
  if (statusEl) statusEl.textContent = 'Loading ' + c.filename + '…';

  try {
    let url = c.download_url;
    if (!url) url = `https://raw.githubusercontent.com/${state.repoOwner}/${state.repoName}/${state.currentBranch}/cases/${c.filename}`;

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

    if (statusEl) {
      statusEl.textContent = `Loaded ✓ · ${branchLabel}`;
      setTimeout(() => {
        statusEl.textContent = `${branchLabel} · ${state.repoCases.length} cases`;
      }, 1500);
    }
  } catch (e) {
    if (statusEl) statusEl.textContent = 'Error: ' + e.message;
  }
}
