import { AXES } from './constants.js';

export function buildDashboardChunks(caseData) {
  const chunks = [];
  const participants = caseData.participants || [];
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
          }, {})
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
