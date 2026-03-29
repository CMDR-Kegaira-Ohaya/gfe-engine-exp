import { assertProductPath } from '../guardrails.js';
import { writeTextFileWithPolicy } from '../write-text-file.js';

export async function saveProductFile(connector, input) {
  const { path, content, message, branch = 'main', sha } = input;
  const checked = assertProductPath(path);

  return writeTextFileWithPolicy(connector, {
    path: checked.path,
    content,
    message,
    branch,
    sha: sha || null,
  });
}
