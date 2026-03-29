import { assertControlledCasePath } from '../guardrails.js';
import { deletePathWithLowLevelGit } from '../low-level-delete.js';

export async function deleteCaseSource(connector, input) {
  const { slug, path, message, branch = 'main' } = input;
  const targetPath = path || `cases/${slug}/source/case.md`;
  const checked = assertControlledCasePath(targetPath);

  return deletePathWithLowLevelGit(connector, {
    path: checked.path,
    message,
    branch,
  });
}
