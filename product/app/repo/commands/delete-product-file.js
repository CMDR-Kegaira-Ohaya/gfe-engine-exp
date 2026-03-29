import { assertProductPath } from '../guardrails.js';
import { deletePathWithLowLevelGit } from '../low-level-delete.js';

export async function deleteProductFile(connector, input) {
  const { path, message, branch = 'main' } = input;
  const checked = assertProductPath(path);

  return deletePathWithLowLevelGit(connector, {
    path: checked.path,
    message,
    branch,
  });
}
