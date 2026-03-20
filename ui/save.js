import { state, showMsg, getCurrentSession } from './state.js';
import { getRepoConfig, loadBranchCases } from './repo.js';

export function snakeCase(input) {
  return String(input || 'untitled_case')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function getSaveStem(session) {
  const date = new Date().toISOString().slice(0, 10);
  const name = session?.system_name || session?.case_id || 'untitled_case';
  return `${snakeCase(name)}_${date}`;
}

async function getRepoFileSha(path, branch) {
  const headers = {
    'Accept': 'application/vnd.github+json'
  };
  if (state.githubToken) headers['Authorization'] = `Bearer ${state.githubToken}`;

  const res = await fetch(
    `https://api.github.com/repos/${state.repoOwner}/${state.repoName}/contents/${path}?ref=${encodeURIComponent(branch)}`,
    { headers }
  );

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`SHA lookup failed: ${res.status}`);

  const data = await res.json();
  return data.sha || null;
}

async function putFileToRepo(path, textContent, message) {
  if (!getRepoConfig()) throw new Error('Enter owner and repo name.');
  if (!state.githubToken) throw new Error('Enter GitHub token.');

  const statusEl = document.getElementById('repo-status');
  if (statusEl) {
    statusEl.style.display = 'block';
    statusEl.textContent = `Saving ${path}…`;
  }

  const sha = await getRepoFileSha(path, state.currentBranch);

  const body = {
    message,
    content: utf8ToBase64(textContent),
    branch: state.currentBranch
  };
  if (sha) body.sha = sha;

  const res = await fetch(
    `https://api.github.com/repos/${state.repoOwner}/${state.repoName}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${state.githubToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GitHub save failed: ${res.status} ${errText}`);
  }

  return await res.json();
}

export function buildAnalysisMdFromSession(session) {
  const date = new Date().toISOString().slice(0, 10);

  const participantsBlock = (session.participants || []).length
    ? (session.participants || []).map(p =>
        `- ${p.name || p.id}${p.address ? `: ${p.address}` : ''}${p.description ? ` — ${p.description}` : ''}`
      ).join('\n')
    : '- none recorded';

  const timelineBlock = (session.timeline || []).length
    ? (session.timeline || []).map((t, i) => {
        const note = t.narrative_note || '—';
        const pressure = t.pressure_notes ? `\nPressure: ${t.pressure_notes}` : '';
        return `### ${t.timestep_label || `T${i}`}\n${note}${pressure}`;
      }).join('\n\n')
    : 'No timeline notes recorded.';

  const eventsBlock = (session.payload_events || []).length
    ? (session.payload_events || []).map(pe => {
        const src = pe.alpha_source || pe.alpha_from || '?';
        const med = pe.alpha_medium ? ` -> ${pe.alpha_medium}` : '';
        const rcv = pe.alpha_receiving || pe.alpha_to || '?';
        const unf = pe.unfolding || '';
        const reg = pe.register || '';
        const mode = pe.mode || pe.mu || '';
        const eff = pe.effect ? ` | ${pe.effect}` : '';
        const mag = pe.magnitude ? ` | x${pe.magnitude}` : '';
        const ti = pe.timestep_idx != null ? `T${pe.timestep_idx}` : 'T?';
        return `- ${ti}: ${src}${med} -> ${rcv} | ${unf} | ${reg} | ${mode}${eff}${mag}`;
      }).join('\n')
    : '- none recorded';

  const a = session.analysis || {};

  return `# ${session.system_name || session.case_id || 'Untitled Case'}

Date: ${date}
Case ID: ${session.case_id || 'unspecified'}

## Case description
${session.description || 'No description recorded.'}

## Participants
${participantsBlock}

## Timeline interpretation
${timelineBlock}

## Payload event notes
${eventsBlock}

## Final analytical finding
- cascade type: ${a.cascade_type || 'unspecified'}
- starting axis: ${a.starting_axis || 'unspecified'}
- failure grammar: ${a.failure_grammar || 'unspecified'}
- recovery type: ${a.recovery_type || 'unspecified'}
- key finding: ${a.key_finding || 'unspecified'}
`;
}

export async function saveCurrentCaseJson() {
  try {
    const session = getCurrentSession();
    if (!session) {
      showMsg('No case loaded.', 'error');
      return;
    }

    const stem = getSaveStem(session);
    await putFileToRepo(
      `cases/${stem}.json`,
      JSON.stringify(session, null, 2),
      `Save case JSON: ${session.system_name || session.case_id || 'Untitled Case'}`
    );

    showMsg(`Saved ${stem}.json to ${state.currentBranch}`, 'info');
    await loadBranchCases();
  } catch (e) {
    showMsg(e.message, 'error');
  }
}

export async function saveCurrentAnalysisMd() {
  try {
    const session = getCurrentSession();
    if (!session) {
      showMsg('No case loaded.', 'error');
      return;
    }

    const stem = getSaveStem(session);
    const md = buildAnalysisMdFromSession(session);

    await putFileToRepo(
      `cases/${stem}_analysis.md`,
      md,
      `Save analysis markdown: ${session.system_name || session.case_id || 'Untitled Case'}`
    );

    showMsg(`Saved ${stem}_analysis.md to ${state.currentBranch}`, 'info');
    await loadBranchCases();
  } catch (e) {
    showMsg(e.message, 'error');
  }
}

export async function saveBothToRepo() {
  try {
    const session = getCurrentSession();
    if (!session) {
      showMsg('No case loaded.', 'error');
      return;
    }

    const stem = getSaveStem(session);
    const md = buildAnalysisMdFromSession(session);

    await putFileToRepo(
      `cases/${stem}.json`,
      JSON.stringify(session, null, 2),
      `Save case JSON: ${session.system_name || session.case_id || 'Untitled Case'}`
    );

    await putFileToRepo(
      `cases/${stem}_analysis.md`,
      md,
      `Save analysis markdown: ${session.system_name || session.case_id || 'Untitled Case'}`
    );

    showMsg(`Saved both files to ${state.currentBranch}`, 'info');
    await loadBranchCases();
  } catch (e) {
    showMsg(e.message, 'error');
  }
}
