export const DEFAULT_WEIGHTS = Object.freeze({
  etaRByMode: {
    load: 0.12,
    route: 0.08,
    overflow: 0.10,
    substitute: 0.09,
    suppress: 0.07,
    amplify: 0.14,
    'threshold-transfer': 0.11
  },
  emissionCostByMode: {
    load: 0.00,
    route: 0.03,
    overflow: 0.05,
    substitute: 0.02,
    suppress: 0.01,
    amplify: 0.04,
    'threshold-transfer': 0.03
  },
  etaIByMode: {
    load: 0.10,
    route: 0.08,
    overflow: 0.12,
    substitute: 0.09,
    suppress: -0.06,
    amplify: 0.16,
    'threshold-transfer': 0.11
  },
  etaAByMode: {
    load: 0.03,
    route: 0.02,
    overflow: 0.04,
    substitute: 0.03,
    suppress: 0.03,
    amplify: 0.05,
    'threshold-transfer': 0.04
  },
  etaDstByMode: {
    load: 0.08,
    route: 0.07,
    overflow: 0.10,
    substitute: 0.08,
    suppress: 0.07,
    amplify: 0.11,
    'threshold-transfer': 0.09
  },
  acuteWeight: 1.0,
  accumulatedWeight: 0.7,
  lambdaEmit: 1.0,
  rhoRI: 0.35,
  rhoIA: 0.22,
  cfgGateCenter: 0.45,
  cfgGateSlope: 10,
  thetaGateCenter: 0.33,
  thetaGateSlope: 12,
  thetaStressGap: 0.12,
  destructiveSigmaFloor: 0.20,
  misalignmentGap: 0.10
});
