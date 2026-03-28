// Workbench v3: Galaxy Map overlay (cases as stars).
// UX contract: one viewport, step-zoom navigation (Galaxy -> System).
// - Galaxy is a distinct mode (body.gfe-galaxy-mode) so it feels like a different page.
// - Click star = inspect (in-viewport focus card).
// - Double-click star = open case (delegates to existing left-panel [data-slug] button).
//
// UI-only: does not touch engine/solver.

(function () {
  const $ = (sel) => document.querySelector(sel);

  const MODE_CLASS = "gfe-galaxy-mode";

  const els = {
    tabs: $("#tabs"),
    tabContent: $("#tab-content"),
  };

  let catalogCases = null;
  let selectedSlug = null;

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function getActiveTab() {
    return $("#tabs .tab-btn.active")?.dataset?.tab ?? null;
  }

  function syncModeClass() {
    const isGalaxy = getActiveTab() === "galaxy";
    document.body.classList.toggle(MODE_CLASS, isGalaxy);
  }

  // Deterministic hash for stable star positions
  function fnv1a(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i += 1) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function unit(hash) {
    return (hash >>> 0) / 4294967296;
  }

  function starPos(slug) {
    const hx = fnv1a(`${slug}:x`);
    const hy = fnv1a(`${slug}:y`);
    const hs = fnv1a(`${slug}:s`);
    // keep away from edges
    const x = 0.08 + unit(hx) * 0.84;
    const y = 0.10 + unit(hy) * 0.80;
    const s = 0.85 + unit(hs) * 0.85;
    return { x, y, s };
  }

  async function loadCatalogOnce() {
    if (catalogCases) return catalogCases;
    const res = await fetch("./catalog/index.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`Catalog request failed (${res.status})`);
    const json = await res.json();
    catalogCases = Array.isArray(json?.cases) ? json.cases : [];
    return catalogCases;
  }

  function getCaseBySlug(slug) {
    return (catalogCases || []).find((c) => c?.slug === slug) ?? null;
  }

  function renderGalaxyShell(cases) {
    const focusEntry = selectedSlug ? getCaseBySlug(selectedSlug) : null;
    const focusTitle = focusEntry ? focusEntry.title || focusEntry.slug : "Galaxy";
    const focusMeta = focusEntry
      ? `${focusEntry.slug} · ${focusEntry.timesteps ?? 0} steps · ${focusEntry.participants ?? 0} participants`
      : "Click a star to inspect. Double‑click to open a case (zoom to System).";

    const stars = cases
      .map((entry) => {
        const slug = entry.slug;
        const title = entry.title || entry.slug;
        const { x, y, s } = starPos(slug);
        const selected = slug === selectedSlug ? " selected" : "";
        return `
          <button class="galaxy-star${selected}" type="button"
            data-galaxy-star="1"
            data-slug="${esc(slug)}"
            style="--x:${x};--y:${y};--s:${s}"
            title="${esc(title)}">
            <span class="dot" aria-hidden="true"></span>
            <span class="label">${esc(title)}</span>
          </button>
        `;
      })
      .join("");

    return `
      <section class="galaxy-map" data-galaxy-root="1">
        <div class="galaxy-hud">
          <div class="galaxy-crumbs">
            <span>Galaxy</span>
            ${selectedSlug ? `<span class="sep">›</span><span>${esc(selectedSlug)}</span>` : ""}
          </div>
          <div class="galaxy-focus">
            <div class="title" id="galaxy-focus-title">${esc(focusTitle)}</div>
            <div class="meta" id="galaxy-focus-meta">${esc(focusMeta)}</div>
          </div>
        </div>

        <div class="galaxy-viewport" role="application" aria-label="Galaxy map">
          <div class="starfield" id="galaxy-starfield">
            ${stars}
          </div>
          <div class="hint">Click to inspect · Double‑click to open · Use the left case list anytime</div>
        </div>
      </section>
    `;
  }

  function updateFocusUI() {
    const titleEl = $("#galaxy-focus-title");
    const metaEl = $("#galaxy-focus-meta");
    if (!titleEl || !metaEl) return;

    const entry = selectedSlug ? getCaseBySlug(selectedSlug) : null;
    if (!entry) {
      titleEl.textContent = "Galaxy";
      metaEl.textContent = "Click a star to inspect. Double‑click to open a case (zoom to System).";
      return;
    }

    titleEl.textContent = entry.title || entry.slug;
    const parts = [
      entry.slug,
      `${entry.timesteps ?? 0} steps`,
      `${entry.participants ?? 0} participants`,
      entry.synopsis ? entry.synopsis : null,
    ].filter(Boolean);
    metaEl.textContent = parts.join(" · ");
  }

  function markSelectedStar() {
    const root = document.querySelector("[data-galaxy-root]");
    if (!root) return;
    root.querySelectorAll(".galaxy-star.selected").forEach((el) => el.classList.remove("selected"));
    if (!selectedSlug) return;
    const star = root.querySelector(`[data-galaxy-star][data-slug="${CSS.escape(selectedSlug)}"]`);
    if (star) star.classList.add("selected");
  }

  function openCase(slug) {
    if (!slug) return false;
    const btn = document.querySelector(`[data-slug="${CSS.escape(slug)}"]`);
    if (!btn) return false;
    try {
      btn.scrollIntoView({ block: "nearest" });
    } catch {}
    btn.click();
    return true;
  }

  function handleStarClick(target) {
    const star = target.closest?.("[data-galaxy-star]");
    if (!star) return;
    selectedSlug = star.dataset.slug || null;
    markSelectedStar();
    updateFocusUI();
  }

  function handleStarDoubleClick(target) {
    const star = target.closest?.("[data-galaxy-star]");
    if (!star) return;
    const slug = star.dataset.slug || null;
    selectedSlug = slug;
    markSelectedStar();
    updateFocusUI();

    if (openCase(slug)) return;

    // If the left catalog list isn't ready yet, retry briefly.
    let tries = 0;
    const t = setInterval(() => {
      tries += 1;
      if (openCase(slug) || tries > 15) clearInterval(t);
    }, 120);
  }

  async function ensureGalaxyCurrent() {
    if (!els.tabContent) return;

    // Keep mode class in sync even if the tab changed.
    syncModeClass();

    if (getActiveTab() !== "galaxy") return;

    // If already rendered, just refresh focus UI and selection.
    const existing = els.tabContent.querySelector("[data-galaxy-root]");
    if (existing) {
      updateFocusUI();
      markSelectedStar();
      return;
    }

    let cases = [];
    try {
      cases = await loadCatalogOnce();
    } catch (err) {
      els.tabContent.innerHTML = `
        <section class="galaxy-map">
          <div class="empty"><b>Galaxy unavailable</b><br>${esc(err?.message || "Could not load catalog.")}</div>
        </section>
      `;
      return;
    }

    els.tabContent.innerHTML = renderGalaxyShell(cases);
  }

  function bind() {
    if (!els.tabContent) return;

    // Whenever tabs change, sync the mode class and (if Galaxy) ensure it is rendered.
    els.tabs?.addEventListener("click", () =>
      requestAnimationFrame(() => {
        syncModeClass();
        ensureGalaxyCurrent();
      })
    );

    // If app.js overwrites tab content while Galaxy is active, put Galaxy back.
    const contentMo = new MutationObserver(() => requestAnimationFrame(() => ensureGalaxyCurrent()));
    contentMo.observe(els.tabContent, { childList: true, subtree: false });

    // Event delegation for stars.
    els.tabContent.addEventListener("click", (event) => {
      if (getActiveTab() !== "galaxy") return;
      handleStarClick(event.target);
    });

    els.tabContent.addEventListener("dblclick", (event) => {
      if (getActiveTab() !== "galaxy") return;
      handleStarDoubleClick(event.target);
    });

    requestAnimationFrame(() => ensureGalaxyCurrent());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind, { once: true });
  } else {
    bind();
  }
})();
