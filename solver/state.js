
import { AXES } from './constants.js';
import { DEFAULT_WEIGHTS } from './config.js';
import { clip01, fromCanonicalAxisState, sigmoid, toCanonicalAxisState } from './utils.js';

export function cfgGate(cfgAxisState, weights = DEFAULT_WEIGHTS) {
  const cfg = toCanonicalAxisState(cfgAxisState);
  return sigmoid(weights.cfgGateSlope * (cfg.A - weights.cfgGateCenter));
}

export function deriveSigma(nextA, nextI, aggregate, weights = DEFAULT_WEIGHTS) {
  if (aggregate.contractDst > 0 || nextA <= weights.destructiveSigmaFloor) return 'Dst';
  if (aggregate.contestM > 0 || nextI - nextA >= weights.misalignmentGap) return 'M';
  return 'L';
}

export function updateAxisState(previousAxisState = {}, aggregate = {}, cfgGateValue = 1, weights = DEFAULT_WEIGHTS) {
  const prev = toCanonicalAxisState(previousAxisState);
  const deltaRIn = aggregate.deltaRIn || 0;
  const deltaROut = aggregate.deltaROut || 0;
  const deltaIEvent = aggregate.deltaIEvent || 0;
  const contestM = aggregate.contestM || 0;
  const contractDst = aggregate.contractDst || 0;

  const nextR = clip01(prev.R + deltaRIn - (weights.lambdaEmit * deltaROut));
  const nextI = clip01(prev.I + deltaIEvent + (weights.rhoRI * (nextR - prev.I)));
  const nextA = clip01(
    prev.A
    - contestM
    - contractDst
    + (cfgGateValue * weights.rhoIA * (nextI - prev.A))
  );

  return {
    A: nextA,
    R: nextR,
    I: nextI,
    sigma: deriveSigma(nextA, nextI, aggregate, weights),
    valence: prev.valence || ''
  };
}

export function updateParticipantAxes(previousAxes = {}, aggregatesByAxis = {}, weights = DEFAULT_WEIGHTS) {
  const nextCanonicalAxes = {};
  const cfgGateValue = cfgGate(previousAxes.Cfg || {}, weights);

  for (const axis of AXES) {
    nextCanonicalAxes[axis] = updateAxisState(
      previousAxes[axis] || {},
      aggregatesByAxis[axis] || {},
      cfgGateValue,
      weights
    );
  }

  return {
    canonical: nextCanonicalAxes,
    display: Object.fromEntries(
      AXES.map(axis => [axis, fromCanonicalAxisState(nextCanonicalAxes[axis])])
    ),
    cfg_gate: cfgGateValue
  };
}
