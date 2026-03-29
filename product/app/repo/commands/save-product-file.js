import { assertProductPath } from '../guardrails.js';
import { encodeUtf8ToBase64 } from '../connector.js';
import { verifyWriteResult } from '../verify.js';

export async function saveProductFile(connector, input) {
  const { path, content, message, branch = 'main', sha } = input;
  const checked = assertProductPath(path);

  const result = await connector.saveFile({
    path: checked.path,
    message,
    content: encodeUtf8ToBase64(content),
    branch,
    ...(sha ? { sha } : {}),
  });

  return verifyWriteResult(connector, result, {
    expectedPath: checked.path,
    previousSha: sha || null,
    expectedText: content,
    branch,
  });
}
