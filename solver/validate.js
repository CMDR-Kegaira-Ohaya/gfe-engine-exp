import { AXES, MODES, REGISTERS, SIGMA, UNFOLDING } from './constants.js';

function pushIssue(list, level, path, message) {
  list.push({ level, path, message });
}

function normalizeMode(mode) {
  return String(mode || '').replaceAll('_', '-');
}

function validatePayloadPrimitive(issues, primitive, path) {
  if (primitive?.sigma && !SIGMA.includes(primitive.sigma)) {
    pushIssue(issues, 'error', `${path}.sigma`, 'Sigma must be L, M, or Dst.');
  }
  if (primitive?.unfolding && !UNFOLDING.includes(primitive.unfolding)) {
    pushIssue(issues, 'error', `${path}.unfolding`, 'Unfolding must be acute or accumulated.');
  }
  if (primitive?.register && !REGISTERS.includes(primitive.register)) {
    pushIssue(issues, 'error', `${path}.register`, 'Register must be retained or emitted.');
  }
  const mode = primitive?.mode ?? primitive?.mu;
  if (mode && !MODES.includes(normalizeMode(mode))) {
    pushIssue(issues, 'error', `${path}.mode`, 'Mode must be one of the canonical payload modes.');
  }
  if (primitive?.axis && !AXES.includes(primitive.axis)) {
    pushIssue(issues, 'warning', `${path}.axis`, 'Axis should be one of the five maintained axes.');
  }
}

export function validateCase(caseData) {
  const issues = [];
  if (!caseData || typeof caseData !== 'object') {
    pushIssue(issues, 'error', '', 'Case must be an object.');
    return { ok: false, issues };
  }

  if (!Array.isArray(caseData.timeline) || caseData.timeline.length === 0) {
    pushIssue(issues, 'error', 'timeline', 'Case must include a non-empty timeline.');
  }

  const participants = Array.isArray(caseData.participants) ? caseData.participants : [];
  const participantIds = new Set(participants.map(p => p.id).filter(Boolean));

  (caseData.timeline || []).forEach((step, stepIndex) => {
    const stepPath = `timeline[${stepIndex}]`;
    if (!step || typeof step !== 'object') {
      pushIssue(issues, 'error', stepPath, 'Timeline step must be an object.');
      return;
    }
    const stepParticipants = step.participants || {};
    for (const [pid, pdata] of Object.entries(stepParticipants)) {
      if (participantIds.size && !participantIds.has(pid)) {
        pushIssue(issues, 'warning', `${stepPath}.participants.${pid}`, 'Participant is not declared in case.participants.');
      }
      const axes = pdata?.axes || {};
      for (const axis of AXES) {
        const axisData = axes[axis];
        if (!axisData) {
          pushIssue(issues, 'warning', `${stepPath}.participants.${pid}.axes.${axis}`, 'Axis missing.');
          continue;
        }
        for (const field of ['A', 'R', 'I']) {
          const value = axisData[field];
          if (!Number.isFinite(value)) {
            pushIssue(issues, 'error', `${stepPath}.participants.${pid}.axes.${axis}.${field}`, 'Value must be numeric.');
          } else if (value < 0 || value > 100) {
            pushIssue(issues, 'warning', `${stepPath}.participants.${pid}.axes.${axis}.${field}`, 'Value should be on 0–100 scale.');
          }
        }
        if (axisData.sigma && !SIGMA.includes(axisData.sigma)) {
          pushIssue(issues, 'error', `${stepPath}.participants.${pid}.axes.${axis}.sigma`, 'Sigma must be L, M, or Dst.');
        }
      }
    }
  });

  (caseData.payload_events || []).forEach((event, eventIndex) => {
    const eventPath = `payload_events[${eventIndex}]`;
    if (event?.timestep_idx !== undefined && !Number.isInteger(event.timestep_idx)) {
      pushIssue(issues, 'warning', `${eventPath}.timestep_idx`, 'timestep_idx should be an integer.');
    }
    if (!arrayIs=Array.isArray(event?.payload_bundle)) {
      validatePayloadPrimitive(issues, event, eventPath);
    } else {
      event.payload_bundle.forEach((primitive, primitiveIdx) => {
        validatePayloadPrimitive(issues, primitive, `${eventPath}.payload_bundle[${primitiveIdx}]`);
      });
    }
  });

  return { ok: !issues.some(issue => issue.level === 'error'), issues };
}
