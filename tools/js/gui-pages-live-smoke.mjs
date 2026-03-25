#!/usr/bin/env node
import process from 'node:process';

function usage() {
  console.error([
    'Usage:',
    '  node tools/js/gui-pages-live-smoke.mjs [--repo <owner/repo>] [--url <pages-base-url>] [--page-path <path>] [--retries <n>] [--delay-ms <ms>]',
    '',
    'Examples:',
    '  node tools/js/gui-pages-live-smoke.mjs',
    '  node tools/js/gui-pages-live-smoke.mjs --url https://cmdr-kegaira-ohaya.github.io/gfe-engine-exp/ --page-path workbench-v3.html',
  ].join('\n'));
}

function parseArgs(argv) {
  const args = {
    repo: process.env.GITHUB_REPOSITORY || 'CMDR-Kegaira-Ohaya/gfe-engine-exp',
    url: null,
    pagePath: 'workbench-v3.html',
    retries: 20,
    delayMs: 15000,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--repo') {
      args.repo = argv[index + 1];
      index += 1;
      continue;
    }
    if (token === '--url') {
      args.url = argv[index + 1];
      index += 1;
      continue;
    }
    if (token === '--page-path') {
      args.pagePath = argv[index + 1];
      index += 1;
      continue;
    }
    if (token === '--retries') {
      args.retries = Number(argv[index + 1]);
      index += 1;
      continue;
    }
    if (token === '--delay-ms') {
      args.delayMs = Number(argv[index + 1]);
      index += 1;
      continue;
    }
    if (['-h', '--help', 'help'].includes(token)) {
      usage();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  return args;
}

function githubHeaders() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN or GH_TOKEN is required when --url is not provided.');
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'gfe-gui-pages-live-smoke',
  };
}

async function getPagesBaseUrl(repo) {
  if (process.env.GITHUB_PAGES_URL) return process.env.GITHUB_PAGES_URL;
  const response = await fetch(`https://api.github.com/repos/${repo}/pages`, { headers: githubHeaders() });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pages lookup failed (${response.status}) for ${repo}: ${text}`);
  }
  const payload = await response.json();
  return payload.html_url;
}

function ensureTrailingSlash(url) {
  return url.endsWith('/') ? url : `${url}/`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractAssets(html, pageUrl) {
  const assets = [];
  const stylesheetPattern = /<link\b[^>]*rel=["'][^"']*stylesheet[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  const scriptPattern = /<script\b[^>]*type=["']module["'][^>]*src=["']([^"']+)["'][^>]*><\/script>/gi;

  for (const match of html.matchAll(stylesheetPattern)) {
    const href = match[1];
    assets.push({ kind: 'stylesheet', href, url: new URL(href, pageUrl).href });
  }
  for (const match of html.matchAll(scriptPattern)) {
    const src = match[1];
    assets.push({ kind: 'module-script', href: src, url: new URL(src, pageUrl).href });
  }
  return assets;
}

async function fetchText(url) {
  const response = await fetch(url, { cache: 'no-store' });
  const text = await response.text();
  return { status: response.status, ok: response.ok, url, text };
}

async function checkAsset(asset) {
  const response = await fetch(asset.url, { cache: 'no-store' });
  return {
    kind: asset.kind,
    href: asset.href,
    url: asset.url,
    status: response.status,
    ok: response.ok,
  };
}

async function attemptSmoke(targetUrl) {
  const page = await fetchText(targetUrl);
  const markerChecks = {
    workbench_title: /Workbench v3/i.test(page.text),
    atlas_id: /id=["']atlas["']/.test(page.text),
    timeline_id: /id=["']timeline["']/.test(page.text),
    tab_content_id: /id=["']tab-content["']/.test(page.text),
    module_entry: /ui-v3\/app\.js/.test(page.text),
  };

  const assets = page.ok ? await Promise.all(extractAssets(page.text, targetUrl).map(checkAsset)) : [];
  const missingAssets = assets.filter((asset) => !asset.ok);
  const ok = page.ok && Object.values(markerChecks).every(Boolean) && missingAssets.length === 0;

  return {
    target_url: targetUrl,
    page_status: page.status,
    page_ok: page.ok,
    marker_checks: markerChecks,
    asset_checks: assets,
    missing_assets: missingAssets,
    ok,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = ensureTrailingSlash(args.url || await getPagesBaseUrl(args.repo));
  const targetUrl = new URL(args.pagePath, baseUrl).href;
  const attempts = [];

  for (let index = 0; index < args.retries; index += 1) {
    const result = await attemptSmoke(targetUrl);
    attempts.push({
      attempt: index + 1,
      at: new Date().toISOString(),
      ...result,
    });
    if (result.ok) {
      console.log(JSON.stringify({
        repo: args.repo,
        base_url: baseUrl,
        target_url: targetUrl,
        retries: args.retries,
        delay_ms: args.delayMs,
        attempts,
        ok: true,
      }, null, 2));
      return;
    }
    if (index + 1 < args.retries) await sleep(args.delayMs);
  }

  console.log(JSON.stringify({
    repo: args.repo,
    base_url: baseUrl,
    target_url: targetUrl,
    retries: args.retries,
    delay_ms: args.delayMs,
    attempts,
    ok: false,
  }, null, 2));
  process.exit(1);
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: { message: error.message, stack: error.stack } }, null, 2));
  process.exit(1);
});
