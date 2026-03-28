export async function loadCasesIndex() {
  const catalog = await fetchJson('./app/cases-index.json');

  return Promise.all(
    catalog.map(async (entry) => {
      const manifest = await fetchJson(entry.manifestPath);
      const caseBaseUrl = new URL('./', new URL(entry.manifestPath, window.location.href));
      const manifestRepoPath = repoPathFromCatalogPath(entry.manifestPath);

      return {
        slug: manifest.slug || manifest.case_id,
        title: manifest.title || manifest.slug || 'Untitled case',
        summary: manifest.summary || 'Case bundle',
        manifest,
        manifestPath: entry.manifestPath,
        repoPaths: {
          manifest: manifestRepoPath,
          source: manifest.current_case_source
            ? resolveRepoRelativePath(manifestRepoPath, manifest.current_case_source)
            : null,
          encoding: manifest.current_encoding
            ? resolveRepoRelativePath(manifestRepoPath, manifest.current_encoding)
            : null,
          narrative: manifest.current_narrative
            ? resolveRepoRelativePath(manifestRepoPath, manifest.current_narrative)
            : null,
        },
        paths: {
          source: manifest.current_case_source
            ? new URL(manifest.current_case_source, caseBaseUrl).href
            : null,
          encoding: manifest.current_encoding
            ? new URL(manifest.current_encoding, caseBaseUrl).href
            : null,
          narrative: manifest.current_narrative
            ? new URL(manifest.current_narrative, caseBaseUrl).href
            : null,
        },
      };
    }),
  );
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
    manifest: entry.manifest,
    repoPaths: entry.repoPaths,
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

function repoPathFromCatalogPath(path) {
  return String(path || '').replace(/^\.\//, '').replace(/^\.\.\//, '');
}

function resolveRepoRelativePath(baseRepoPath, relativePath) {
  const baseUrl = new URL(baseRepoPath, 'https://repo.local/');
  const resolved = new URL(relativePath, baseUrl);
  return resolved.pathname.replace(/^\//, '');
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
