import { assertControlledCasePath } from '../guardrails.js';
import { writeTextFileWithPolicy } from '../write-text-file.js';

export async function saveCaseSource(connector, input) {
  const { slug, path, content, message, branch = 'main', sha } = input;
  const targetPath = path || `cases/${slug}/source/case.md`;
  const checked = assertControlledCasePath(targetPath);

  return writeTextFileWithPolicy(connector, {
    path: checked.path,
    content,
    message,
    branch,
    sha: sha || null,
  });
}
