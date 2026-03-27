// Workbench v3 UX enhancers: stable documents panel + focus inspector.
// This is UI-only glue. It does not touch the engine/solver and does not mutate repo cases.

const $ = (id) => document.getElementById(id);

const els = {
  currentSlug: $("current-slug"),
  tabs: $("tabs"),
  tabContent: $("tab-content"),
  timestepBadge: $("timestep-badge"),
  atlas: $("atlas"),
  timeline: $("timeline"),

  docsTabs: $("docs-tabs"),
  docsBadge: $("documents-badge"),
  docCase: $("doc-case"),
  docResult: $("doc-result"),

  focusInspector: $("focus-inspector"),
  focusTitle: $("focus-inspector-title"),
  focusBody: $("focus-inspector-body"),
  focusClose: $("focus-inspector-close"),
};

const cache = new Map(); // slug -> { caseHTML?, resultHTML? }
let activeDoc = "case";
let lastSlugText = els.currentSlug?.textContent ?? "";

function getSlug() {
  const text = (els.currentSlug?.textContent ?? "").trim();
  return text && text !== "No case open" ? text : null;
}

function ensureSlot(slug) {
  if (!cache.has(slug)) cache.set(slug, {});
  return cache.get(slug);
}

function setDocsBadge(text) {
  if (els.docsBadge) els.docsBadge.textContent = text;
}

function show(el) {
  el?.classList.remove("hidden");
}
function hide(el) {
  el?.classList.add("hidden");
}

function renderDocsPanel() {
  const slug = getSlug();
  if (!slug || !els.docCase || !els.docResult) return;

  const slot = ensureSlot(slug);

  els.docCase.innerHTML =
    slot.caseHTML ??
    `<div class="empty">Open <strong>Case</strong> once to cache the full case document here.</div>`;

  els.docResult.innerHTML =
    slot.resultHTML ??
    `<div class="empty">Open <strong>Case reading</strong> once to cache the full result/reading here.</div>`;

  if (activeDoc === "case") {
    show(els.docCase);
    hide(els.docResult);
    setDocsBadge("Full case");
  } else {
    hide(els.docCase);
    show(els.docResult);
    setDocsBadge("Full result");
  }
}

function captureTabContent() {
  const slug = getSlug();
  if (!slug || !els.tabContent) return;

  const slot = ensureSlot(slug);
  const activeTabBtn = document.querySelector("#tabs .tab-btn.active");
  const tab = activeTabBtn?.dataset?.tab ?? "";

  // Cache as-seen HTML (UI snapshot, not engine-derived source)
  if (tab === "case") slot.caseHTML = els.tabContent.innerHTML;
  if (tab === "reading") slot.resultHTML = els.tabContent.innerHTML;

  renderDocsPanel();
}

function bindDocsTabs() {
  if (!els.docsTabs) return;
  els.docsTabs.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-doc]");
    if (!btn) return;
    activeDoc = btn.dataset.doc === "result" ? "result" : "case";
    document.querySelectorAll("#docs-tabs .tab-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.doc === activeDoc);
    });
    renderDocsPanel();
  });
}

function openFocusInspector(title, html) {
  if (!els.focusInspector || !els.focusTitle || !els.focusBody) return;
  els.focusTitle.textContent = title || "Focus";
  els.focusBody.innerHTML = html || `<div class="empty">No details.</div>`;
  els.focusInspector.classList.remove("hidden");
}

function closeFocusInspector() {
  els.focusInspector?.classList.add("hidden");
}

function focusHtml(payload) {
  const selectedStep = els.timestepBadge?.textContent ?? "";
  const parts = [];

  if (selectedStep) {
    parts.push(
      `<p class="placeholder-note">Selected step: <b>${selectedStep}</b></p>`
    );
  }

  if (payload.kind === "participant") {
    parts.push(`<p><b>Participant</b>: ${payload.participantId ?? "—"}</p>`);
    parts.push(
      `<p>This focus comes from a Timeline actor click or an Atlas actor card.</p>`
    );
  }

  if (payload.kind === "encounter") {
    parts.push(`<p><b>Encounter</b>: ${payload.label ?? "Encounter selected"}</p>`);
    if (Number.isFinite(payload.stepIndex)) {
      parts.push(
        `<p class="placeholder-note">Step index: ${payload.stepIndex} · Encounter index: ${
          payload.encounterIndex ?? "—"
        }</p>`
      );
    }
    parts.push(
      `<p>This focus comes from a Timeline encounter click or an Atlas route card.</p>`
    );
  }

  parts.push(`
    <div class="placeholder-actions">
      <button class="ghost" data-open-doc="case">Show in full case</button>
      <button class="ghost" data-open-doc="result">Show in full result</button>
    </div>
  `);

  return parts.join("");
}

function bindFocusClicks() {
  const onTrigger = (event) => {
    const docBtn = event.target.closest("[data-open-doc]");
    if (docBtn) {
      activeDoc = docBtn.dataset.openDoc === "result" ? "result" : "case";
      document.querySelectorAll("#docs-tabs .tab-btn").forEach((b) => {
        b.classList.toggle("active", b.dataset.doc === activeDoc);
      });
      renderDocsPanel();
      return;
    }

    const participant = event.target.closest("[data-participant-focus]");
    if (participant) {
      const participantId = participant.dataset.participantFocus;
      openFocusInspector(
        `Actor: ${participantId}`,
        focusHtml({ kind: "participant", participantId })
      );
      return;
    }

    const encounter = event.target.closest("[data-encounter-focus]");
    if (encounter) {
      const stepIndex = Number(encounter.dataset.stepIndex ?? 0);
      const encounterIndex = Number(encounter.dataset.encounterFocus ?? 0);
      const label = (encounter.textContent ?? "").trim() || "Encounter selected";
      openFocusInspector(
        "Encounter",
        focusHtml({ kind: "encounter", stepIndex, encounterIndex, label })
      );
    }
  };

  els.timeline?.addEventListener("click", onTrigger);
  els.atlas?.addEventListener("click", onTrigger);
}

function bindMainSurfaceSense() {
  if (!els.tabs || !els.tabContent) return;

  // When tabs are clicked, let app.js render, then snapshot.
  els.tabs.addEventListener("click", () => {
    requestAnimationFrame(() => captureTabContent());
  });

  // When tab content changes due to focus or case load, snapshot.
  const mo = new MutationObserver(() => {
    requestAnimationFrame(() => captureTabContent());
  });
  mo.observe(els.tabContent, { childList: true, subtree: true });

  // When slug changes, reset view + close focus.
  if (els.currentSlug) {
    const slugMo = new MutationObserver(() => {
      const current = els.currentSlug.textContent ?? "";
      if (current === lastSlugText) return;
      lastSlugText = current;
      activeDoc = "case";
      document.querySelectorAll("#docs-tabs .tab-btn").forEach((b) => {
        b.classList.toggle("active", b.dataset.doc === activeDoc);
      });
      renderDocsPanel();
      closeFocusInspector();
    });
    slugMo.observe(els.currentSlug, { childList: true, subtree: true });
  }
}

function init() {
  if (!els.docCase || !els.docResult) return;

  bindDocsTabs();
  bindFocusClicks();
  bindMainSurfaceSense();

  els.focusClose?.addEventListener("click", closeFocusInspector);

  renderDocsPanel();
}

init();
