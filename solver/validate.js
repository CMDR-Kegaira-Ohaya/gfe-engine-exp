import { AXES, MODES, REGISTERS, SIGMA, UNFOLDING } from './constants.js';

function pushIssue(list, level, path, message) {
  list.push({ level, path, message });
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
    if (event?.sigma && !SIGMA.includes(event.sigma)) {
      pushIssue(issues, 'error', `${eventPath}.sigma`, 'Sigma must be L, M, or Dst.');
    }
    if (event?.unfolding && !UNFOLDING.includes(event.unfolding)) {
      pushIssue(issues, 'error', `${eventPath}.unfolding`, 'Unfolding must be acute or accumulated.');
    }
    if (event?.register && !REGISTERS.includes(event.register)) {
      pushIssue(issues, 'error', `${eventPath}.register`, 'Register must be retained or emitted.');
    }
    const mode = event?.mode || event?.mu;
    if (mode && !MODES.includes(String(mode).replaceAll('_', '-'))) {
      pushIssue(issues, 'error', `${eventPath}.mode`, 'Mode must be one of the canonical payload modes.');
    }
  });

  return { ok: !issues.some(issue => issue.level === 'error'), issues };
}
