#!/usr/bin/env node
import fs from 'node:fs/promises';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import {
  readText,
  parseHtmlAssets,
  normalizeRepoPath,
  repoToAbs,
} from './gui-common.mjs';

function usage() {
  console.error([
    'Usage:',
    '  node tools/js/gui-live-smoke.mjs <html-file>',
    '',
    'Example:',
    '  node tools/js/gui-live-smoke.mjs workbench-v3.html',
  ].join('\n'));
}

class LocalResponse {
  constructor(body, status = 200, url = '') {
    this._body = body;
    this.status = status;
    this.ok = status >= 200 && status < 300;
    this.url = url;
  }

  async text() {
    return this._body;
  }

  async json() {
    return JSON.parse(this._body);
  }
}

function collectAppDomTargets(source) {
  return [...new Set([...source.matchAll(/\$\('([^']+)'\)/g)].map((match) => match[1]).filter(Boolean))].sort();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function installDomGlobals(window, fetchImpl) {
  const previous = new Map();
  const bindings = {
    window,
    document: window.document,
    navigator: window.navigator,
    location: window.location,
    history: window.history,
    HTMLElement: window.HTMLElement,
    Node: window.Node,
    Event: window.Event,
    MouseEvent: window.MouseEvent,
    CustomEvent: window.CustomEvent,
    MutationObserver: window.MutationObserver,
    getComputedStyle: window.getComputedStyle.bind(window),
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
    fetch: fetchImpl,
    confirm: () => true,
    alert: () => {},
    self: window,
  };

  Object.entries(bindings).forEach(([key, value]) => {
    previous.set(key, globalThis[key]);
    globalThis[key] = value;
  });

  return () => {
    for (const [key, value] of previous.entries()) {
      if (typeof value === 'undefined') delete globalThis[key];
      else globalThis[key] = value;
    }
  };
}

function createLocalFetch(baseHtmlFile, events) {
  const nativeFetch = globalThis.fetch;

  return async function localFetch(resource) {
    const href = typeof resource === 'string' ? resource : resource?.url ?? String(resource);
    const resolvedUrl = new URL(href, pathToFileURL(repoToAbs(baseHtmlFile)).href);

    if (resolvedUrl.protocol !== 'file:') {
      if (!nativeFetch) throw new Error(`No native fetch available for ${resolvedUrl.href}`);
      return nativeFetch(resource);
    }

    try {
      const body = await fs.readFile(fileURLToPath(resolvedUrl), 'utf8');
      events.fetches.push({ url: resolvedUrl.href, status: 200 });
      return new LocalResponse(body, 200, resolvedUrl.href);
    } catch (error) {
      events.fetches.push({ url: resolvedUrl.href, status: 404, error: error.message });
      return new LocalResponse('', 404, resolvedUrl.href);
    }
  };
}

async function waitForUi(window, timeoutMs = 1500) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const notice = window.document.getElementById('notice')?.textContent?.trim() ?? '';
    const side = window.document.getElementById('side-panel-body')?.textContent?.trim() ?? '';
    if (!notice.includes('Loading canonical catalog') && !side.includes('Loading catalog')) break;
    await sleep(25);
  }
  await sleep(50);
}

function detectRenderedState(window) {
  const atlasText = window.document.getElementById('atlas')?.textContent?.trim() ?? '';
  const timelineText = window.document.getElementById('timeline')?.textContent?.trim() ?? '';
  const currentSlug = window.document.getElementById('current-slug')?.textContent?.trim() ?? '';
  return {
    atlas_rendered: !!atlasText && atlasText !== 'No atlas data yet.' && atlasText !== 'No relation atlas data yet.',
    timeline_rendered: !!timelineText && timelineText !== 'No timeline loaded.',
    current_case_loaded: !!currentSlug && currentSlug !== 'No case open',
    atlas_text: atlasText,
    timeline_text: timelineText,
    current_slug: currentSlug,
    notice: window.document.getElementById('notice')?.textContent?.trim() ?? '',
  };
}

async function main() {
  const [, , htmlArg] = process.argv;
  if (!htmlArg) {
    usage();
    process.exit(1);
  }

  const htmlFile = normalizeRepoPath(htmlArg);
  const htmlInfo = await readText(htmlFile);
  const assets = parseHtmlAssets(htmlFile, htmlInfo.text);
  const localScripts = assets.moduleScripts.filter((asset) => asset.local && asset.resolved);
  const events = { fetches: [], errors: [], console_errors: [] };

  const dom = new JSDOM(htmlInfo.text, {
    url: pathToFileURL(repoToAbs(htmlFile)).href,
    pretendToBeVisual: true,
  });

  dom.window.addEventListener('error', (event) => {
    events.errors.push({ kind: 'window-error', message: event.message });
  });

  dom.window.addEventListener('unhandledrejection', (event) => {
    events.errors.push({ kind: 'unhandledrejection', message: String(event.reason?.message ?? event.reason) });
  });

  const originalConsoleError = console.error;
  console.error = (...args) => {
    events.console_errors.push(args.map((value) => String(value)).join(' '));
    originalConsoleError(...args);
  };

  const restoreGlobals = installDomGlobals(dom.window, createLocalFetch(htmlFile, events));

  try {
    for (const [index, script] of localScripts.entries()) {
      await import(`${pathToFileURL(repoToAbs(script.resolved)).href}?gui-live-smoke=${Date.now()}-${index}`);
    }
    await waitForUi(dom.window);
  } catch (error) {
    events.errors.push({ kind: 'module-load', message: error.message, stack: error.stack });
  } finally {
    restoreGlobals();
    console.error = originalConsoleError;
  }

  const appSource = await readText('ui-v3/app.js');
  const domTargets = collectAppDomTargets(appSource.text);
  const missingTargets = domTargets.filter((id) => !dom.window.document.getElementById(id));
  const rendered = detectRenderedState(dom.window);

  console.log(JSON.stringify({
    html: htmlFile,
    module_scripts: assets.moduleScripts,
    stylesheets: assets.stylesheets,
    dom_targets: domTargets,
    missing_dom_targets: missingTargets,
    fetches: events.fetches,
    errors: events.errors,
    console_errors: events.console_errors,
    ...rendered,
    ok: !events.errors.length && !missingTargets.length && rendered.atlas_rendered && rendered.timeline_rendered,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: { message: error.message, stack: error.stack } }, null, 2));
  process.exit(1);
});
