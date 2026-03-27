// Workbench v3: Case Map overlay renderer (Case Space).
// This is UI-only glue. It does not touch engine/solver or mutate repo cases.
//
// Strategy:
// - When the "Case map" tab is active, we replace #tab-content with a navigable map.
// - Map clicks proxy into existing Timeline/Atlas click targets (data-participant-focus / data-encounter-focus),
//   so the underlying app.js state updates normally (atlas + timeline follow).
//
// Limitations:
// - For canonical repo cases, we fetch encoding via catalog paths.
// - For imported packages, we fall back to "open Case encoding once" (we try to parse the raw JSON if present).

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const els = {
  tabs: $("#tabs"),
  tabContent: $("#tab-content"),
  currentSlug: $("#current-slug"),
  timestepBadge: $("#timestep-badge"),
  mapTabBtn: $("#tabs [data-tab='map']"),
};

const cache = new Map(); // slug -> { encoding?:, loadedAt?:}
let lastSlug = null;
let lastStep = null;

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', '&quot;')
    .replaceAll("'", "&#39;");
}

function label(id) {
  const raw = String(id ?? "").trim();
  return raw ? raw.replaceAll("_", " ") : "Unknown";
}

function getActiveTab() {
  return $("#tabs .tab-btn.active")?.dataset?.tab ?? null;
}

function getSlug() {
  const text = (els.currentSlug?.textContent ?? "").trim();
  return text && text !== "No case open" ? text : null;
}

function getActiveStepIndex() {
  const badge = (els.timestepBadge?.textContent ?? "").trim();
  const num = Number(badge);
  return Number.isFinite(num) ? num : 0;
}

async function fetchJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Request failed for ${path} (${res.status})`);
  return res.json();
}

async function loadEncodingForSlug(slug) {
  if (!slug) return null;
  const cached = cache.get(slug);
  if (cached?.encoding) return cached.encoding;

  // Canonical path lookup via catalog
  try {
    const catalog = await fetchJson("./catalog/index.json");
    const entry = (catalog?.cases ?? []).find((c) => c.slug === slug);
    if (entry?.paths?.encoding) {
      const encoding = await fetchJson(`.${entry.paths.encoding}`);
      cache.set(slug, { encoding, loadedAt: Date.now() });
      return encoding;
    }
  } catch (err) {
    // fall through
  }

  // Fallback: parse raw JSON from Case encoding tab if user opened it once.
  try {
    const pre = $("#tab-content pre.pre-json");
    const text = (pre?.textContent ?? "").trim();
    if (text.startsWith("{") && text.endsWith("}")) {
      const encoding = JSON.parse(text);
      cache.set(slug, { encoding, loadedAt: Date.now() });
      return encoding;
    }
  } catch (err) {
    // ignore
  }

  cache.set(slug, { encoding: null, loadedAt: Date.now() });
  return null;
}

function participantFromAlpha(alpha) {
  const raw = String(alpha ?? "").trim();
  if (!raw) return null;
  const head = raw.split(".")[0];
  return head || null;
}

function endpointsForEvent(ev) {
  const source = ev?.sourceParticipantId ?? participantFromAlpha(ev?.alpha_source ?? ev?.alpha_from);
  const receiving = ev?.receivingParticipantId ?? participantFromAlpha(ev?.alpha_receiving ?? ev?.alpha_to);
  const medium = ev?.mediumParticipantId ?? participantFromAlpha(ev?.alpha_medium ?? ev?.medium);
  return { source, receiving, medium };
}

function eventsForStep(encoding, stepIndex) {
  const all = Array.isArray(encoding?.payload_events) ? encoding.payload_events : [];
  return all.filter((ev) => {
    const idx = Number(ev?.timestep_idx ?? ev?.timestep_index ?? ev?.timestep ?? 0);
    return idx === stepIndex;
  });
}

function mapHtml({ encoding, slug, stepIndex }) {
  if (!encoding) {
    return `
      <section class="case-map">
        <div class="empty">
          <b>Case map unavailable</b><br>
          This case does not expose a fetchable encoding (or you're on an imported package).<br>
          If this is an imported package: open <b>Case encoding</b> once, then return to <b>Case map</b>.
        </div>
      </section>`;
  }

  const step = Array.isArray(encoding.timeline) ? encoding.timeline[stepIndex] : null;
  const nodeIds = Object.keys(step?.participants ?? {}).length
    ? Object.keys(step.participants)
    : Array.isArray(encoding.participants) ? encoding.participants : [];
  const stepLabel = step?.timestep_label ? label(step.timestep_label) : `Step ${stepIndex}`;

  const events = eventsForStep(encoding, stepIndex);

  const nodeChips = nodeIds.length
    ? nodeIds.map((id) => `
      <button class="map-node" type="button" data-map-participant="${esc(id)}">${esc(label(id))}</button>
    `).join("")
    : `<div class="empty">No participants found for this step.</div>`;

  const links = events.length
    ? events.map((ev, idx) => {
        const { source, receiving, medium } = endpointsForEvent(ev);
        const axis = ev?.axis ?? "axis";
        const face = ev?.face ? `face: ${label(ev.face)}` : null;
        const interference = ev?.interference ? `interference: ${label(ev.interference)}` : null;
        const bundle = Array.isArray(ev?.payload_bundle) ? ev.payload_bundle : [];
        const primitives = bundle.length;
        const endpoints = source && receiving ? `${label(source)} → ${label(receiving)}`
          : source ? `${label(source)} emits`
          : receiving ? `${label(receiving)} receives`
          : "Encounter";
        const metaParts = [
          `axis: ${label(axis)}`,
          primitives ? `${primitives} primitives` : null,
          face,
          interference,
          medium ? `medium: ${label(medium)}` : null,
        ].filter(Boolean);

        return `
          <button class="map-link" type="button"
            data-map-encounter="1"
            data-step-index="${stepIndex}"
            data-encounter-focus="${idx}"
            data-link-source="${esc(source ?? "")}" data-link-receiving="${esc(receiving ?? "")}" data-link-medium="${esc(medium ?? "")}">
            <div class="kicker">Link</div>
            <div class="title">${esc(endpoints)}</div>
            <div class="meta">${esc(metaParts.join(" · "))}</div>
          </button>
        `;
      }).join("")
    : `<div class="empty">No payload links recorded for this step.</div>`;

  return `
    <section class="case-map" data-map-root="1" data-map-slug="${esc(slug)}" data-map-step="${stepIndex}">
      <p class="map-intro">
        You are navigating a <b>map</b> of the case. Click a node or link to focus; Atlas and Timeline will follow.
      </p>

      <div class="map-grid">
        <div class="map-card">
          <h3>Current moment</h3>
          <div><b>${esc(stepLabel)}</b></div>
          <div class="kicker">Step index: ${stepIndex}</div>
        </div>
        <div class="map-card">
          <h3>Nodes</h3>
          <div class="node-grid">${nodeChips}</div>
        </div>
      </div>
      <div class="map-card">
        <h3>Links</h3>
        <div class="map-links">${links}</div>
      </div>
    </section>`;
}

function renderCaseMapIntoTab({ encoding, slug, stepIndex }) {
  if (!els.tabContent) return;
  els.tabContent.innerHTML = mapHtml({ encoding, slug, stepIndex });
}

function clearMapHighlights() {
  const root = document.querySelector("[data-map-root]");
  if (!root) return;
  root.querySelectorAll(".selected, .neighbor").forEach((el) => {
    el.classList.remove("selected");
    el.classList.remove("neighbor");
  });
}

function selectMapParticipant(id) {
  const root = document.querySelector("[data-map-root]");
  if (!root || !id) return;
  clearMapHighlights();

  const node = root.querySelector(`[data-map-participant="${CSS.escape(id)}"]`);
  if (node) node.classList.add("selected");

  const links = Array.from(root.querySelectorAll("[data-map-encounter]"));
  for (const link of links) {
    const src = link.dataset.linkSource || "";
    const recv = link.dataset.linkReceiving || "";
    const med = link.dataset.linkMedium || "";
    if ([src, recv, med].includes(id)) {
      link.classList.add("neighbor");
      for (const other of [src, recv, med]) {
        if (!other || other === id) continue;
        const otherNode = root.querySelector(`[data-map-participant="${CSS.escape(other)}"]`);
        if (otherNode) otherNode.classList.add("neighbor");
      }
    }
  }
}

function selectMapLink(linkEl) {
  const root = document.querySelector("[data-map-root]");
  if (!root || !linkEl) return;
  clearMapHighlights();

  linkEl.classList.add("selected");
  const src = linkEl.dataset.linkSource || "";
  const recv = linkEl.dataset.linkReceiving || "";
  const med = linkEl.dataset.linkMedium || "";
  const endpoints = [src, recv, med].filter(Boolean);

  for (const id of endpoints) {
    const node = root.querySelector(`[data-map-participant="${CSS.escape(id)}"]`);
    if (node) node.classList.add("neighbor");
  }

  // Lightly show neighborhood: other links sharing any endpoint.
  const links = Array.from(root.querySelectorAll("[data-map-encounter]"));
  for (const otherLink of links) {
    if (otherLink === linkEl) continue;
    const oSrc = otherLink.dataset.linkSource || "";
    const oRecv = otherLink.dataset.linkReceiving || "";
    const oMed = otherLink.dataset.linkMedium || "";
    const otherEndpoints = [oSrc, oRecv, oMed].filter(Boolean);
    if (otherEndpoints.some((x) => endpoints.includes(x))) otherLink.classList.add("neighbor");
  }
}

function handleMapLocalSelection(target) {
  const root = document.querySelector("[data-map-root]");
  if (!root) return;

  const node = target.closest("[data-map-participant]");
  if (node?.dataset?.mapParticipant) {
    selectMapParticipant(node.dataset.mapParticipant);
    return;
  }

  const link = target.closest("[data-map-encounter]");
  if (link) {
    selectMapLink(link);
  }
}

function proxyFocusToWorkbench(target) {
  // Participant
  const p = target.closest("[data-map-participant]");
  if (p) {
    const id = p.dataset.mapParticipant;
    const real = document.querySelector(`[data-participant-focus="${CSS.escape(id)}"]`);
    if (real) real.click();
    return true;
  }

  // Encounter
  const e = target.closest("[data-map-encounter]");
  if (e) {
    const stepIndex = Number(e.dataset.stepIndex ?? 0);
    const encounterIndex = Number(e.dataset.encounterFocus ?? 0);
    const real = document.querySelector(`[data-encounter-focus="${encounterIndex}"][data-step-index="${stepIndex}"]`);
    if (real) real.click();
    return true;
  }

  return false;
}

async function ensureMapCurrent() {
  if (getActiveTab() !== "map") return;

  const slug = getSlug();
  if (!slug) {
    if (els.tabContent) {
      els.tabContent.innerHTML = `
        <section class="case-map">
          <div class="empty"><b>No case open.</b> Open a case to view its case map.</div>
        </section>`;
    }
    return;
  }

  const stepIndex = getActiveStepIndex();
  const needsReload =
    slug !== lastSlug || stepIndex !== lastStep || !(els.tabContent?.querySelector("[data-map-root]"));

  if (!needsReload) return;

  lastSlug = slug;
  lastStep = stepIndex;

  const encoding = await loadEncodingForSlug(slug);
  renderCaseMapIntoTab({ encoding, slug, stepIndex });
}

function bind() {
  // Keep map primary: after a case loads, jump to Map once (unless user already moved to Encoding/Reading).
  if (els.currentSlug && els.mapTabBtn) {
    const slugMo = new MutationObserver(() => {
      const slug = getSlug();
      if (!slug) return;

      const active = getActiveTab();
      const allowAuto = !active || active === "case" || active === "map" || active === "galaxy";
      if (!allowAuto) return;

      requestAnimationFrame(() => els.mapTabBtn?.click());
    });
    slugMo.observe(els.currentSlug, { childList: true, subtree: true });
  }

  // Re-render map when tabs change (app.js renders first; we replace after).
  els.tabs?.addEventListener("click", () => requestAnimationFrame(() => ensureMapCurrent()));

  // Re-render map when step changes.
  if (els.timestepBadge) {
    const stepMo = new MutationObserver(() => requestAnimationFrame(() => ensureMapCurrent()));
    stepMo.observe(els.timestepBadge, { childList: true, subtree: true });
  }

  // If app.js overwrites tab-content while Map is active, put map back.
  if (els.tabContent) {
    const contentMo = new MutationObserver(() => requestAnimationFrame(() => ensureMapCurrent()));
    contentMo.observe(els.tabContent, { childList: true, subtree: false });

    els.tabContent.addEventListener("click", (event) => {
      if (getActiveTab() !== "map") return;
      handleMapLocalSelection(event.target);
      if (proxyFocusToWorkbench(event.target)) event.preventDefault();
    });
  }

  // Initial render if map is active by default.
  requestAnimationFrame(() => ensureMapCurrent());
}

bind();
