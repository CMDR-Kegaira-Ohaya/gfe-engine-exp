import { clip01, stableNumber } from './utils.js';

export function resolveOrderProfile(event = {}, weights = {}) {
  const orderDepth = Math.max(0, stableNumber(event.order_depth ?? event.orderDepth, 0));
  const scanIndex = Math.max(0, stableNumber(event.scan_index ?? event.scanIndex, 0));

  const normalizedDepth = clip01(orderDepth * stableNumber(weights.orderDepthStep, 0.18));
  const normalizedScan = clip01(scanIndex * stableNumber(weights.orderScanStep, 0.12));
  const depthBias = clip01(normalizedDepth * stableNumber(weights.orderDepthBiasGain, 1.0));
  const scanPenalty = normalizedScan * stableNumber(weights.orderScanPenalty, 0.45);
  const recursionSignal = clip01(depthBias - scanPenalty);

  let note = 'scan-led-order';
  if (recursionSignal > 0.40) note = 'deep-recursive-order';
  else if (recursionSignal > 0) note = 'depth-led-order';

  return {
    order_depth: orderDepth,
    scan_index: scanIndex,
    normalized_depth: normalizedDepth,
    normalized_scan: normalizedScan,
    recursion_signal: recursionSignal,
    continuityBias: recursionSignal * stableNumber(weights.orderContinuityGain, 0.18),
    receivingMultiplier: 1 + (recursionSignal * stableNumber(weights.orderReceivingGain, 0.20)),
    emissionMultiplier: Math.max(
      0.60,
      1 - (recursionSignal * stableNumber(weights.orderEmissionSuppression, 0.16)) +
        (normalizedScan * stableNumber(weights.orderEmissionScanPenalty, 0.10))
    ),
    retentionMultiplier: 0.80 + (recursionSignal * stableNumber(weights.orderRetentionGain, 0.18)),
    note,
  };
}
