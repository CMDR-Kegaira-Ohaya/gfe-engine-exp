export const AXES = Object.freeze(['Cfg', 'Emb', 'Org', 'Dir', 'Leg']);
export const GROUNDING_AXES = Object.freeze(['Cfg', 'Emb', 'Org']);

export const SIGMA = Object.freeze(['L', 'M', 'Dst']);
export const UNFOLDING = Object.freeze(['acute', 'accumulated']);
export const REGISTERS = Object.freeze(['retained', 'emitted']);
export const FACES = Object.freeze(['inner', 'outer']);

export const MODES = Object.freeze([
  'load',
  'route',
  'overflow',
  'substitute',
  'suppress',
  'amplify',
  'threshold-transfer'
]);

export const COMPENSATION_MODES = Object.freeze([
  'overflow',
  'substitute',
  'suppress',
  'threshold-transfer',
  'route'
]);

export const ADAPTIVE_COMPENSATION_MODES = Object.freeze([
  'route',
  'substitute',
  'threshold-transfer'
]);

export const MALADAPTIVE_COMPENSATION_MODES = Object.freeze([
  'overflow',
  'suppress'
]);

export const DASHBOARD_SCALE = 100;
