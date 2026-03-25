import {
  renderAtlas as renderAtlasCore,
  renderTimeline as renderTimelineCore,
} from './atlas-renderer-core.js';
import { polishAtlasCopy, polishTimelineCopy } from './atlas-renderer-copy.js';

export function renderTimeline(ctx) {
  const result = renderTimelineCore(ctx);
  polishTimelineCopy(ctx?.els?.timeline);
  return result;
}

export function renderAtlas(ctx) {
  const result = renderAtlasCore(ctx);
  polishAtlasCopy(ctx?.els?.atlas);
  return result;
}
