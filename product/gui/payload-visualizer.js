import { loadCasesIndex, loadCaseBundle } from '../app/case-bundle.js';
import { escapeHtml, eventsForStep, label, participantFromAlpha } from '../app/helpers.js';

const root = document.getElementById('app');
const mapView = document.getElementById('map-view');

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

  const summaryNode = container.querySelector('.map-summary');
  if (summaryNode && !summaryNode.querySelector('.payload-map-note')) {
    summaryNode.insertAdjacentHTML(
      'beforeend',
      `
        <div class="payload-map-note">
          <div class="eyebrow">Visible interaction</div>
          <p>Payload lanes expose who emits, who receives, and which family signatures ride each event.</p>
        </div>
      `,
    );
  }

  cards.forEach((card) => {
    const existing = card.querySelector('.payload-visual-strip');
    if (existing) existing.remove();

    const momentButton = card.querySelector('[data-select-type="moment"]');
    const stepIndex = Number(momentButton?.dataset.selectId);
    if (Number.isNaN(stepIndex)) return;

    const stepEvents = eventsForStep(events, stepIndex);
    if (!stepEvents.length) return;

    const anchor = card.querySelector('.moment-head');
    const markup = renderPayloadVisualStrip(stepEvents);
    if (anchor) {
      anchor.insertAdjacentHTML('afterend', markup);
      return;
    }

    card.insertAdjacentHTML('afterbegin', markup);
  });
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
        <div class="moment-subhead">Payload interactions</div>
        <span class="payload-strip-count">${escapeHtml(stepEvents.length)} event${stepEvents.length === 1 ? '' : 's'}</span>
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
  const axis = label(event?.axis || '');
  const face = label(event?.face || '');
  const bundle = Array.isArray(event?.payload_bundle) ? event.payload_bundle : [];

  return `
    <article class="payload-lane axis-${token(event?.axis)} face-${token(event?.face)}">
      <div class="payload-route">
        <span class="payload-node source">${escapeHtml(source)}</span>
        <span class="payload-arrow" aria-hidden="true">→</span>
        <span class="payload-node receiving">${escapeHtml(receiving)}</span>
      </div>
      <div class="payload-route-meta">
        ${medium ? `<span class="payload-meta-pill">via ${escapeHtml(medium)}</span>` : ''}
        ${axis ? `<span class="payload-meta-pill">${escapeHtml(axis)}</span>` : ''}
        ${face ? `<span class="payload-meta-pill">${escapeHtml(face)}</span>` : ''}
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
  const sigma = String(item?.sigma ?? 'Σ');
  const mode = label(item?.mode || 'mode');
  const register = label(item?.register || 'register');
  const magnitude = Number(item?.magnitude ?? 0);
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
