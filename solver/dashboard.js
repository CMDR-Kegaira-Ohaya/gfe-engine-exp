import { AXES } from './constants.js';

function deriveParticipantList(caseData) {
  const declared = Array.isArray(caseData.participants) ? caseData.participants : [];
  const map = new Map(declared.map(participant => [participant.id, participant]));

  for (const step of caseData.timeline || []) {
    for (const participantId of Object.keys(step.participants || {})) {
      if (!map.has(participantId)) {
        map.set(participantId, { id: participantId, name: participantId });
      }
    }
  }

  return Array.from(map.values());
}

export function buildDashboardChunks(caseData) {
  const chunks = [];
  const participants = deriveParticipantList(caseData);
  const timeline = caseData.timeline || [];

  for (let pIndex = 0; pIndex < participants.length; pIndex += 1) {
    const participant = participants[pIndex];
    const timesteps = timeline.map(step => ({
      timestep_label: step.timestep_label,
      participant: step.participants?.[participant.id] || { axes: {} }
    }));

    for (let i = 0; i < timesteps.length; i += 4) {
      const slice = timesteps.slice(i, i + 4);
      const chunk = {
        system_name: caseData.system_name,
        participant: participant.name || participant.id,
        participant_id: participant.id,
        timesteps: slice.map(item => ({
          timestep_label: item.timestep_label,
          axes: AXES.reduce((acc, axis) => {
            acc[axis] = item.participant.axes?.[axis] || { A: 0, R: 0, I: 0, sigma: 'L' };
            return acc;
          }, {}),
          prevalence: item.participant.prevalence || { family: 'L', note: '' },
          theta: item.participant.theta || { active: false, blocked_family: null, note: '' },
          compensation: item.participant.compensation || { active: false, type: null, note: '' },
          failure: item.participant.failure || { active: false, primary: null, note: '' },
          cascade: item.participant.cascade || {
            active: false,
            blocked: false,
            degraded: false,
            rerouted: false,
            primary_failure: null,
            projection_mode: '',
            local_completions: [],
            note: '',
          },
        }))
      };

      const isLastChunk = pIndex === participants.length - 1 && i + 4 >= timesteps.length;
      if (isLastChunk && caseData.analysis) {
        chunk.analysis = caseData.analysis;
      }
      chunks.push(chunk);
    }
  }

  return chunks;
}
