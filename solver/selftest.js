import { solveCase } from './engine.js';
import { validateCase } from './validate.js';
import { buildDashboardChunks } from './dashboard.js';

const smokeCase = {
  system_name: 'Solver Smoke',
  participants: [
    { id: 'p1', name: 'P1' },
    { id: 'p2', name: 'P2' }
  ],
  timeline: [
    {
      timestep_label: 'T0',
      participants: {
        p1: {
          axes: {
            Cfg: { A: 80, R: 80, I: 80, sigma: 'L' },
            Emb: { A: 78, R: 78, I: 78, sigma: 'L' },
            Org: { A: 79, R: 79, I: 79, sigma: 'L' },
            Dir: { A: 76, R: 76, I: 76, sigma: 'L' },
            Leg: { A: 77, R: 77, I: 77, sigma: 'L' }
          }
        },
        p2: {
          axes: {
            Cfg: { A: 81, R: 81, I: 81, sigma: 'L' },
            Emb: { A: 79, R: 79, I: 79, sigma: 'L' },
            Org: { A: 80, R: 80, I: 80, sigma: 'L' },
            Dir: { A: 77, R: 77, I: 77, sigma: 'L' },
            Leg: { A: 78, R: 78, I: 78, sigma: 'L' }
          }
        }
      }
    }
  ],
  payload_events: [
    {
      timestep_idx: 0,
      alpha_source: 'p1.Dir',
      alpha_medium: 'p1.Org',
      alpha_receiving: 'p2.Leg',
      sigma: 'M',
      axis: 'Leg',
      unfolding: 'acute',
      register: 'retained',
      mode: 'amplify',
      magnitude: 0.5
    }
  ],
  analysis: { key_finding: 'Smoke only.' }
};

const validation = validateCase(smokeCase);
const solved = solveCase(smokeCase);
const chunks = buildDashboardChunks(solved);

console.log(JSON.stringify({
  ok: validation.ok,
  issues: validation.issues.length,
  envelopeRows: solved.envelope_summary.length,
  chunkCount: chunks.length,
  p2Leg: solved.timeline[0].participants.p2.axes.Leg
}, null, 2));
