import { loadCasesIndex, loadCaseBundle } from '../app/case-bundle.js';
import { escapeHtml, eventsForStep, label, participantFromAlpha } from '../app/helpers.js';

const root = document.getElementById('app');
const CANON_AXES = Object.freeze(['Cfg', 'Emb', 'Org', 'Dir', 'Leg']);
const CANON_AXIS_ORDER = new Map(CANON_AXES.map((axis, index) => [axis.toLowerCase(), index]));
const FAMILY_ORDER = new Map([['l', 0], ['m', 1], ['dst', 2]]);
const FACE_ORDER = new Map([['inner', 0], ['outer', 1], ['unspecified', 2]]);
const BAND_ORDER = new Map([['latent', 0], ['low', 1], ['engaged', 2], ['saturated', 3]]);

let casesIndexPromise = null;
const bundleCache = new Map();
let scheduled = false;

if (root) {
  const observer = new MutationObserver(() => scheduleEnhancement());
  observer.observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  scheduleEnhancement();
}

function scheduleEnhancement() {
  if (scheduled) return;
  scheduled = true;

  requestAnimationFrame(async () => {
    scheduled = false;
    try {
      await enhancePayloadView();
    } catch (error) {
      console.warn('Payload visualizer skipped:', error);
    }
  });
}

async function enhancePayloadView() {
  const container = document.getElementById('map-view');
  if (!container) return;

  const cards = Array.from(container.querySelectorAll('.moment-card'));
  if (!cards.length) return;

  const slug = currentSlug();
  if (!slug) return;

  const bundle = await ensureBundle(slug);
  const encoding = bundle?.structure;
  const events = Array.isArray(encoding?.payload_events) ? encoding.payload_events : [];
  if (!events.length) return;

  renderStructuralRegistry(container, events);
  renderMapPrecisionNote(container);

  cards.forEach((card) => {
    card.querySelector('.moment-structural-readout')?.remove();
    card.querySelector('.payload-visual-strip')?.remove();

    const momentButton = card.querySelector('[data-select-type="moment"]');
    const stepIndex = Number(momentButton?.dataset.selectId);
    if (Number.isNaN(stepIndex)) return;

    const stepEvents = eventsForStep(events, stepIndex);
    if (!stepEvents.length) {
      clearParticipantAxisRacks(card);
      return;
    }

    renderParticipantAxisRacks(card, stepEvents);

    const head = card.querySelector('.moment-head');
    const firstBlock = card.querySelector('.moment-block');
    const structuralReadout = renderMomentStructuralReadout(stepEvents);
    const payloadStrip = renderPayloadVisualStrip(stepEvents);

    if (head) {
      head.insertAdjacentHTML('afterend', structuralReadout + payloadStrip);
      return;
    }

    if (firstBlock) {
      firstBlock.insertAdjacentHTML('beforebegin', structuralReadout + payloadStrip);
      return;
    }

    card.insertAdjacentHTML('afterbegin', structuralReadout + payloadStrip);
  });
}

function clearParticipantAxisRacks(card) {
  card.querySelectorAll('.participant-axis-rack').forEach((node) => node.remove());
}

function renderParticipantAxisRacks(card, stepEvents) {
  const rows = Array.from(card.querySelectorAll('.selectable-row'));
  rows.forEach((row) => {
    row.querySelector('.participant-axis-rack')?.remove();

    const entityButton = row.querySelector('[data-select-type="entity"]');
    if (!entityButton) return;

    const participantId = entityButton.dataset.selectId;
    if (!participantId) return;

    const summary = summarizeParticipantAxes(stepEvents, participantId);
    row.insertAdjacentHTML('beforeend', renderParticipantAxisRack(summary));
  });
}

function summarizeParticipantAxes(stepEvents, participantId) {
  const stats = Object.fromEntries(
    CANON_AXES.map((axis) => [axis, { L: 0, M: 0, Dst: 0, total: 0 }]),
  );

  stepEvents.forEach((event) => {
    if (!participantInEvent(event, participantId)) return;

    const axis = canonicalAxis(event?.axis);
    if (!axis) return;

    const bundle = Array.isArray(event?.payload_bundle) ? event.payload_bundle : [];
    if (!bundle.length) {
      stats[axis].total += 1;
      return;
    }

    bundle.forEach((item) => {
      const sigma = canonicalSigma(item?.sigma);
      const magnitude = normalizedMagnitude(item?.magnitude);
      if (!['L', 'M', 'Dst'].includes(sigma)) return;
      stats[axis][sigma] += magnitude;
      stats[axis].total += magnitude;
    });
  });

  const maxTotal = Math.max(...CANON_AXES.map((axis) => stats[axis].total), 0);
  const dominantAxis = CANON_AXES.reduce((best, axis) => (
    stats[axis].total > (stats[best]?.total ?? 0) ? axis : best
  ), CANON_AXES[0]);

  return { stats, maxTotal, dominantAxis };
}

function participantInEvent(event, participantId) {
  const target = String(participantId ?? '').trim();
  if (!target) return false;

  const candidates = [
    event?.sourceParticipantId,
    event?.receivingParticipantId,
    event?.mediumParticipantId,
    participantFromAlpha(event?.alpha_source),
    participantFromAlpha(event?.alpha_receiving),
    participantFromAlpha(event?.alpha_medium),
  ].map((value) => String(value ?? '').trim()).filter(Boolean);

  return candidates.includes(target);
}

function renderParticipantAxisRack(summary) {
  const { stats, maxTotal, dominantAxis } = summary;
  const overview = maxTotal > 0
    ? `${label(dominantAxis)} dominant · ${displayBand(stats[dominantAxis].total)} state`
    : 'No canon-axis payload state in this moment';

  return `
    <div class="participant-axis-rack">
      <div class="participant-axis-rack-head">
        <span class="participant-axis-rack-title">5-axis rack</span>
        <span class="participant-axis-rack-note">${escapeHtml(overview)}</span>
      </div>
      <div class="participant-axis-list">
        ${CANON_AXES.map((axis) => renderAxisRail(axis, stats[axis], maxTotal, axis === dominantAxis)).join('')}
      </div>
    </div>
  `;
}

function renderAxisRail(axis, state, maxTotal, isDominant) {
  const scale = maxTotal > 0 ? maxTotal : 1;
  const leftWidth = railWidth(state.L, scale);
  const rightWidth = railWidth(state.M, scale);
  const clipWidth = clipWidthPercent(state.Dst, scale);
  const band = displayBand(state.total);

  return `
    <div class="axis-rail ${isDominant ? 'dominant' : ''} band-${token(band)} axis-${token(axis)}">
      <div class="axis-rail-head">
        <span class="axis-rail-label">${escapeHtml(label(axis))}</span>
        <span class="axis-rail-values">L ${escapeHtml(formatMagnitude(state.L))} · M ${escapeHtml(formatMagnitude(state.M))} · Dst ${escapeHtml(formatMagnitude(state.Dst))}</span>
      </div>
      <div class="axis-rail-track">
        <span class="axis-clip left" style="width:${clipWidth}%"></span>
        <span class="axis-clip right" style="width:${clipWidth}%"></span>
        <span class="axis-half left">
          <span class="axis-fill sigma-l" style="width:${leftWidth}%"></span>
        </span>
        <span class="axis-theta">θ</span>
        <span class="axis-half right">
          <span class="axis-fill sigma-m" style="width:${rightWidth}%"></span>
        </span>
      </div>
      <div class="axis-rail-band">
        <span class="axis-band-pill band-${token(band)}">${escapeHtml(band)}</span>
      </div>
    </div>
  `;
}

function renderMapPrecisionNote(container) {
  const summaryNode = container.querySelector('.map-summary');
  if (!summaryNode) return;

  summaryNode.querySelector('.payload-map-note')?.remove();
  summaryNode.insertAdjacentHTML(
    'beforeend',
    `
      <div class="payload-map-note">
        <div class="eyebrow">Structural readout</div>
        <p>Participant focus uses the canon 5-axis rack: Cfg, Emb, Org, Dir, Leg. Each rail is split by θ into L and M, with Dst shown as end-clipping on both sides.</p>
      </div>
    `,
  );
}

function renderStructuralRegistry(container, events) {
  const existing = container.querySelector('.structural-registry');
  existing?.remove();

  const axes = aggregateCounts(events.map((event) => canonicalAxis(event?.axis) || 'unspecified'), CANON_AXES);
  const faces = aggregateCounts(events.map((event) => label(event?.face || '') || 'unspecified'));
  const interferences = aggregateCounts(events.map((event) => label(event?.interference || '') || 'unspecified'));
  const families = aggregateCounts(
    events.flatMap((event) =>
      Array.isArray(event?.payload_bundle)
        ? event.payload_bundle.map((item) => canonicalSigma(item?.sigma))
        : [],
    ),
    ['L', 'M', 'Dst'],
  );

  const payloadMoments = new Set(
    events
      .map((event) => Number(event?.timestep_idx ?? event?.timestep_index ?? event?.timestep ?? -1))
      .filter((value) => value >= 0),
  ).size;

  const registryMarkup = `
    <section class="structural-registry panel">
      <div class="structural-registry-head">
        <div>
          <div class="eyebrow">Case precision</div>
          <h3>Encoded structural registry</h3>
        </div>
        <div class="structural-registry-stats">
          <span class="registry-stat"><strong>${escapeHtml(events.length)}</strong><span>payload events</span></span>
          <span class="registry-stat"><strong>${escapeHtml(payloadMoments)}</strong><span>payload moments</span></span>
          <span class="registry-stat"><strong>${escapeHtml(Object.keys(families).length || 0)}</strong><span>families present</span></span>
        </div>
      </div>
      <div class="structural-registry-grid">
        ${renderRegistryGroup('Axes', axes, 'axis')}
        ${renderRegistryGroup('Faces', faces, 'face')}
        ${renderRegistryGroup('Interference classes', interferences, 'interference')}
        ${renderRegistryGroup('Family signatures', families, 'family')}
      </div>
    </section>
  `;

  const lensStrip = container.querySelector('.flow-strip');
  if (lensStrip) {
    lensStrip.insertAdjacentHTML('afterend', registryMarkup);
    return;
  }

  const summary = container.querySelector('.map-summary');
  if (summary) {
    summary.insertAdjacentHTML('afterend', registryMarkup);
    return;
  }

  container.insertAdjacentHTML('afterbegin', registryMarkup);
}

function renderRegistryGroup(title, counts, variant) {
  const entries = sortCountEntries(counts, variant);
  return `
    <section class="registry-group">
      <div class="registry-group-title">${escapeHtml(title)}</div>
      <div class="registry-chip-row">
        ${
          entries.length
            ? entries.map(([name, count]) => renderRegistryChip(name, count, variant)).join('')
            : '<span class="registry-chip empty">None recorded</span>'
        }
      </div>
    </section>
  `;
}

function renderRegistryChip(name, count, variant) {
  return `
    <span class="registry-chip ${variant}-${token(name)}">
      <span class="registry-chip-name">${escapeHtml(name)}</span>
      <span class="registry-chip-count">${escapeHtml(count)}</span>
    </span>
  `;
}

function renderMomentStructuralReadout(stepEvents) {
  const axes = aggregateCounts(stepEvents.map((event) => canonicalAxis(event?.axis) || 'unspecified'), CANON_AXES);
  const faces = aggregateCounts(stepEvents.map((event) => label(event?.face || '') || 'unspecified'));
  const interferences = aggregateCounts(stepEvents.map((event) => label(event?.interference || '') || 'unspecified'));
  const families = aggregateCounts(
    stepEvents.flatMap((event) =>
      Array.isArray(event?.payload_bundle)
        ? event.payload_bundle.map((item) => canonicalSigma(item?.sigma))
        : [],
    ),
    ['L', 'M', 'Dst'],
  );
  const bands = aggregateCounts(stepEvents.map((event) => displayBand(maxMagnitude(event))), ['latent', 'low', 'engaged', 'saturated']);

  return `
    <section class="moment-structural-readout">
      <div class="moment-structural-head">
        <div class="moment-subhead">Structural lens</div>
        <span class="moment-structural-count">${escapeHtml(stepEvents.length)} event${stepEvents.length === 1 ? '' : 's'}</span>
      </div>
      <div class="moment-structural-grid">
        ${renderMiniGroup('Axes', axes, 'axis')}
        ${renderMiniGroup('Faces', faces, 'face')}
        ${renderMiniGroup('Interference', interferences, 'interference')}
        ${renderMiniGroup('Families', families, 'family')}
        ${renderMiniGroup('Signal bands', bands, 'band')}
      </div>
    </section>
  `;
}

function renderMiniGroup(title, counts, variant) {
  const entries = sortCountEntries(counts, variant);
  return `
    <div class="moment-mini-group">
      <div class="moment-mini-title">${escapeHtml(title)}</div>
      <div class="moment-mini-row">
        ${
          entries.length
            ? entries.map(([name, count]) => renderMiniChip(name, count, variant)).join('')
            : '<span class="moment-mini-chip empty">None</span>'
        }
      </div>
    </div>
  `;
}

function renderMiniChip(name, count, variant) {
  return `
    <span class="moment-mini-chip ${variant}-${token(name)}">
      <span>${escapeHtml(name)}</span>
      <strong>${escapeHtml(count)}</strong>
    </span>
  `;
}

function currentSlug() {
  const fromUi = document.getElementById('current-slug')?.textContent?.trim();
  if (fromUi && fromUi !== 'No case open') return fromUi;

  return new URLSearchParams(window.location.search).get('case') || '';
}

async function ensureBundle(slug) {
  if (bundleCache.has(slug)) return bundleCache.get(slug);

  casesIndexPromise ||= loadCasesIndex();
  const entries = await casesIndexPromise;
  const bundle = await loadCaseBundle(slug, entries);
  bundleCache.set(slug, bundle);
  return bundle;
}

function renderPayloadVisualStrip(stepEvents) {
  return `
    <section class="payload-visual-strip">
      <div class="payload-strip-head">
        <div class="moment-subhead">Encoded payload lanes</div>
        <span class="payload-strip-count">${escapeHtml(stepEvents.length)} lane${stepEvents.length === 1 ? '' : 's'}</span>
      </div>
      <div class="payload-lanes">
        ${stepEvents.map((event) => renderPayloadLane(event)).join('')}
      </div>
    </section>
  `;
}

function renderPayloadLane(event) {
  const source = label(event?.sourceParticipantId ?? participantFromAlpha(event?.alpha_source)) || 'field';
  const receiving = label(event?.receivingParticipantId ?? participantFromAlpha(event?.alpha_receiving)) || 'receiver';
  const medium = label(event?.mediumParticipantId ?? participantFromAlpha(event?.alpha_medium));
  const interference = label(event?.interference || '');
  const axis = canonicalAxis(event?.axis) || '';
  const face = label(event?.face || '');
  const bundle = Array.isArray(event?.payload_bundle) ? event.payload_bundle : [];
  const band = displayBand(maxMagnitude(event));

  return `
    <article class="payload-lane axis-${token(axis)} face-${token(face)} band-${token(band)}">
      <div class="payload-lane-head">
        <div class="payload-route">
          <span class="payload-node source">${escapeHtml(source)}</span>
          <span class="payload-arrow" aria-hidden="true">→</span>
          <span class="payload-node receiving">${escapeHtml(receiving)}</span>
        </div>
        <span class="payload-band band-${token(band)}">${escapeHtml(band)}</span>
      </div>
      <div class="payload-route-meta">
        ${medium ? `<span class="payload-meta-pill">via ${escapeHtml(medium)}</span>` : ''}
        ${axis ? `<span class="payload-meta-pill axis-pill axis-${token(axis)}">${escapeHtml(axis)}</span>` : ''}
        ${face ? `<span class="payload-meta-pill face-pill face-${token(face)}">${escapeHtml(face)}</span>` : ''}
        ${interference ? `<span class="payload-meta-pill interference">${escapeHtml(interference)}</span>` : ''}
      </div>
      ${
        bundle.length
          ? `<div class="payload-family-row">${bundle.map((item) => renderFamilyChip(item)).join('')}</div>`
          : `<div class="payload-family-row"><span class="payload-meta-pill empty">No payload bundle recorded</span></div>`
      }
    </article>
  `;
}

function renderFamilyChip(item) {
  const sigma = canonicalSigma(item?.sigma);
  const mode = label(item?.mode || 'mode');
  const register = label(item?.register || 'register');
  const magnitude = normalizedMagnitude(item?.magnitude);
  const width = Number.isFinite(magnitude)
    ? Math.max(10, Math.min(100, Math.round(magnitude * 100)))
    : 24;

  return `
    <div class="family-chip sigma-${token(sigma)}">
      <div class="family-chip-head">
        <span class="family-chip-sigma">${escapeHtml(sigma)}</span>
        <span class="family-chip-register">${escapeHtml(register)}</span>
      </div>
      <div class="family-chip-mode">${escapeHtml(mode)}</div>
      <div class="family-chip-meter" aria-hidden="true">
        <span class="family-chip-meter-fill" style="width:${width}%"></span>
      </div>
      <div class="family-chip-value">${escapeHtml(formatMagnitude(magnitude))}</div>
    </div>
  `;
}

function aggregateCounts(values, seed = []) {
  const accumulator = Object.fromEntries(seed.map((value) => [String(value), 0]));
  values.forEach((value) => {
    const key = String(value || 'unspecified');
    accumulator[key] = (accumulator[key] || 0) + 1;
  });
  return accumulator;
}

function sortCountEntries(counts, variant) {
  const entries = Object.entries(counts);
  return entries.sort((left, right) => {
    if (right[1] !== left[1]) return right[1] - left[1];
    return rankForVariant(variant, left[0]) - rankForVariant(variant, right[0]) || left[0].localeCompare(right[0]);
  });
}

function rankForVariant(variant, value) {
  const key = String(value || '').toLowerCase();
  if (variant === 'axis') return CANON_AXIS_ORDER.get(key) ?? 99;
  if (variant === 'family') return FAMILY_ORDER.get(key) ?? 99;
  if (variant === 'face') return FACE_ORDER.get(key) ?? 99;
  if (variant === 'band') return BAND_ORDER.get(key) ?? 99;
  return 99;
}

function canonicalAxis(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  return CANON_AXES.find((axis) => axis.toLowerCase() === raw) || '';
}

function canonicalSigma(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'l') return 'L';
  if (raw === 'm') return 'M';
  if (raw === 'dst') return 'Dst';
  return 'Σ?';
}

function normalizedMagnitude(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function maxMagnitude(event) {
  const bundle = Array.isArray(event?.payload_bundle) ? event.payload_bundle : [];
  const magnitudes = bundle
    .map((item) => normalizedMagnitude(item?.magnitude))
    .filter((value) => Number.isFinite(value));

  return magnitudes.length ? Math.max(...magnitudes) : 0;
}

function displayBand(value) {
  if (!Number.isFinite(value) || value <= 0) return 'latent';
  if (value < 0.33) return 'low';
  if (value < 0.66) return 'engaged';
  return 'saturated';
}

function railWidth(value, scale) {
  if (!Number.isFinite(value) || !Number.isFinite(scale) || scale <= 0) return 0;
  return Math.max(0, Math.min(44, (value / scale) * 44));
}

function clipWidthPercent(value, scale) {
  if (!Number.isFinite(value) || !Number.isFinite(scale) || scale <= 0) return 0;
  return Math.max(0, Math.min(18, (value / scale) * 18));
}

function formatMagnitude(value) {
  if (!Number.isFinite(value)) return '—';
  return value.toFixed(2).replace(/\.00$/, '');
}

function token(value) {
  return String(value ?? 'unknown')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown';
}
