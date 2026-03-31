import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const auditPath = path.join(root, 'solver', 'phase0-audit-core.js');

const result = spawnSync(process.execPath, [auditPath], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 1024 * 1024 * 20,
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (result.error) {
  throw result.error;
}

if (result.signal != null) {
  process.exitCode = 1;
} else if (typeof result.status === 'number' && result.status !== 0) {
  process.exitCode = result.status;
}
