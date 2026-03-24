const FAMILY_SELECTOR = '.primitive-list[data-axis] .primitive-chip';

function normalizeFamily(rawValue) {
  const raw = String(rawValue ?? '').trim().toLowerCase();
  if (!raw) return 'l';
  if (raw === 'l' || raw === 'aligned') return 'l';
  if (raw === 'm' || raw === 'misaligned') return 'm';
  if (raw === 'd' || raw === 'dst' || raw === 'distal') return 'd';
  return 'l';
}

function familyLabel(rawValue) {
  const raw = String(rawValue ?? '').trim();
  if (!raw) return 'L';
  return raw === 'dst' || raw === 'Dst' ? 'D' : raw.toUpperCase();
}

function applyFamilyPass(root = document) {
  root.querySelectorAll(FAMILY_SELECTOR).forEach((chip) => {
    const spans = chip.querySelectorAll('span');
    if (!spans.length) return;

    const familySpan = spans[0];
    const normalized = normalizeFamily(familySpan.textContent);
    chip.dataset.family = normalized;
    familySpan.classList.add('primitive-family');
    familySpan.textContent = familyLabel(familySpan.textContent);
  });
}

const observer = new MutationObserver(() => {
  applyFamilyPass();
});

applyFamilyPass();
observer.observe(document.body, {
  childList: true,
  subtree: true,
});
