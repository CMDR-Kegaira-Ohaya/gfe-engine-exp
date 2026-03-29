import { isNotFoundError } from './errors.js';

export async function deletePathWithLowLevelGit(connector, input) {
  assertLowLevelDeleteConnector(connector);

  const {
    path,
    message,
    branch = 'main',
  } = input;

  if (!path) {
    throw new Error('Delete blocked: empty repo path.');
  }

  if (!message) {
    throw new Error('Delete blocked: missing commit message.');
  }

  const headSha = await readHeadSha(connector, branch);
  const headCommit = await connector.getCommit({ commit_sha: headSha });
  const baseTreeSha = headCommit?.tree?.sha;

  if (!baseTreeSha) {
    throw new Error(`Low-level delete failed: could not resolve a base tree for ${branch}.`);
  }

  const tree = await connector.createTree({
    base_tree: baseTreeSha,
    tree: [
      {
        path,
        mode: '100644',
        type: 'blob',
        sha: null,
      },
    ],
  });

  if (!tree?.sha) {
    throw new Error(`Low-level delete failed: createTree did not return a tree SHA for ${path}.`);
  }

  const commit = await connector.createCommit({
    message,
    tree: tree.sha,
    parents: [headSha],
  });

  if (!commit?.sha) {
    throw new Error(`Low-level delete failed: createCommit did not return a commit SHA for ${path}.`);
  }

  const updated = await connector.updateRef({
    ref: headsRef(branch),
    sha: commit.sha,
    force: false,
  });

  const liveSha = extractRefSha(updated);
  if (liveSha !== commit.sha) {
    throw new Error(`Low-level delete failed: updateRef did not advance ${branch} to the expected commit for ${path}.`);
  }

  await verifyPathDeleted(connector, { path, branch });

  return {
    path,
    branch,
    headShaBefore: headSha,
    treeSha: tree.sha,
    commitSha: commit.sha,
    liveRefSha: liveSha,
    verified: true,
  };
}

export function assertLowLevelDeleteConnector(connector) {
  const missing = [];

  if (typeof connector?.getRef !== 'function' && typeof connector?.getBranchRef !== 'function') {
    missing.push('getRef, getBranchRef');
  }

  for (const method of ['getCommit', 'createTree', 'createCommit', 'updateRef']) {
    if (typeof connector?.[method] !== 'function') {
      missing.push(method);
    }
  }

  if (missing.length) {
    throw new Error(`Low-level delete requires ${missing.join(', ')} on the repo connector.`);
  }
}

async function readHeadSha(connector, branch) {
  const head = typeof connector.getRef === 'function'
    ? await connector.getRef({ ref: headsRef(branch) })
    : await connector.getBranchRef({ branch });

  const headSha = extractRefSha(head);
  if (!headSha) {
    throw new Error(`Low-level delete failed: could not resolve HEAD SHA for ${branch}.`);
  }
  return headSha;
}

function extractRefSha(payload) {
  if (payload?.object?.sha) return payload.object.sha;
  if (payload?.commit?.sha) return payload.commit.sha;
  if (payload?.sha) return payload.sha;
  return null;
}

async function verifyPathDeleted(connector, options) {
  try {
    const found = await connector.getPath({
      path: options.path,
      ref: options.branch,
    });

    const stillAt = found?.path || options.path;
    throw new Error(`Delete verification failed: ${stillAt} still resolves after the ref was updated.`);
  } catch (error) {
    if (isNotFoundError(error)) {
      return;
    }

    throw error;
  }
}

function headsRef(branch) {
  return `heads/${branch}`;
}
