export async function loadCasesIndex() {
  return fetchJson('./app/cases-index.json');
}

export function resolveInitialSlug(entries, requested) {
  if (requested && entries.some((entry) => entry.slug === requested)) {
    return requested;
  }

  return entries[0]?.slug || null;
}

export async function loadCaseBundle(slug, entries) {
  const entry = entries.find((item) => item.slug === slug);
  if (!entry) throw new Error(`Unknown case slug: ${slug}`);

  const [sourceText, encoding, narrativeText] = await Promise.all([
    entry.paths.source ? fetchText(entry.paths.source) : Promise.resolve(''),
    entry.paths.encoding ? fetchJson(entry.paths.encoding) : Promise.resolve(null),
    entry.paths.narrative ? fetchText(entry.paths.narrative) : Promise.resolve(''),
  ]);

  return {
    identity: {
      slug: entry.slug,
      title: entry.title,
      synopsis: entry.summary,
    },
    status: {
      structural: encoding ? 'provisional' : 'absent',
      artifacts: {
        source: Boolean(entry.paths.source),
        encoding: Boolean(entry.paths.encoding),
        solve: false,
        narrative: Boolean(entry.paths.narrative),
      },
    },
    source: {
      text: sourceText,
    },
    structure: encoding,
    solve: null,
    narrative: {
      text: narrativeText,
    },
    projection: {
      mode: 'structure',
      depth: 'whole',
      lens: 'structure',
    },
    links: {
      sourceToStructure: [],
      structureToNarrative: [],
      sourceToNarrative: [],
    },
  };
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Request failed for ${path} (${response.status})`);
  return response.json();
}

async function fetchText(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Request failed for ${path} (${response.status})`);
  return response.text();
}
