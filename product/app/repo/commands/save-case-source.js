import { assertControlledCasePath } from '../guardrails.js';
import { encodeUtf8ToBase64 } from '../connector.js';
import { verifyWriteResult } from '../verify.js';

export async function saveCaseSource(connector, input) {
  const { slug, path, content, message, branch = 'main', sha } = input;
  const targetPath = path || `cases/${slug}/source/case.md`;
  const checked = assertControlledCasePath(targetPath);

  const result = await connector.saveFile({
    path: checked.path,
    message,
    content: encodeUtf8ToBase64(content),
    branch,
    ...(sha ? { sha } : {}),
  });

  return verifyWriteResult(result, {
    expectedPath: checked.path,
    previousSha: sha || null,
  });
}
