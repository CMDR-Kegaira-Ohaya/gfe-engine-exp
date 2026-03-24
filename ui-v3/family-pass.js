const FAMILY_SELECTOR = '.primitive-list[data-axis] .primitive-chip';
const SUMMARY_SELECTOR = '.primitive-family-summary';

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

function summaryMarkup(counts) {
  const entries = [
    ['l', 'L', counts.l],
    ['m', 'M', counts.m],
    ['d', 'D', counts.d],
  ].filter(([, , count]) => count > 0);

  if (!entries.length) return '';

  return `<div class="primitive-family-summary">${entries.map(([key, labelText, count]) => `<span class="primitive-family-pill primitive-family-pill--${key}" data-family="${key}">${labelText} ${count}</span>`).join('')}</div>`;
}

function applyFamilyPass(root = document) {
  root.querySelectorAll('.primitive-list[data-axis]').forEach((list) => {
    const counts = { l: 0, m: 0, d: 0 };

    list.querySelectorAll(FAMILY_SELECTOR).forEach((chip) => {
      const spans = chip.querySelectorAll('span');
      if (!spans.length) return;

      const familySpan = spans[0];
      const normalized = normalizeFamily(familySpan.textContent);
      chip.dataset.family = normalized;
      familySpan.classList.add('primitive-family');
      familySpan.textContent = familyLabel(familySpan.textContent);
      if (normalized in counts) counts[normalized] += 1;
    });

    list.querySelectorAll(`:scope > ${SUMMARY_SELECTOR}`).forEach((node) => node.remove());
    const markup = summaryMarkup(counts);
    if (!markup) return;
    list.insertAdjacentHTML('afterbegin', markup);
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
