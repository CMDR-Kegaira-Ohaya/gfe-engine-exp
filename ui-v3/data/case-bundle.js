function toFetchPath(path) {
  if (!path) return '';
  return path.startsWith('/') ? `.${path}` : path;
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

export async function loadCatalog() {
  const json = await fetchJson('./catalog/index.json');
  return Array.isArray(json?.cases) ? json.cases : [];
}

export function resolveInitialSlug(catalog, requestedSlug) {
  if (requestedSlug && catalog.some((entry) => entry.slug === requestedSlug)) {
    return requestedSlug;
  }

  const firstStructured = catalog.find((entry) => entry.has_encoding);
  return firstStructured?.slug || catalog[0]?.slug || null;
}

export async function loadCaseBundle(slug, catalog) {
  const entry = catalog.find((item) => item.slug === slug);
  if (!entry) throw new Error(`Case not found in catalog: ${slug}`);

  const sourceText = entry.paths?.case ? await fetchText(toFetchPath(entry.paths.case)) : '';
  const encoding = entry.paths?.encoding ? await fetchJson(toFetchPath(entry.paths.encoding)) : null;
  const narrativeText = entry.paths?.reading ? await fetchText(toFetchPath(entry.paths.reading)) : '';

  const structural = encoding ? 'provisional' : 'absent';

  return {
    identity: {
      caseId: entry.case_id || entry.slug,
      title: entry.title || entry.slug,
      slug: entry.slug,
      synopsis: entry.synopsis || '',
    },
    status: {
      structural,
      artifacts: {
        source: Boolean(entry.has_case),
        encoding: Boolean(entry.has_encoding),
        solve: false,
        narrative: Boolean(entry.has_reading),
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
