#!/usr/bin/env node
import process from 'node:process';
import {
  listFilesRecursive,
  readText,
  extractJsUserVisibleStrings,
  extractHtmlVisibleText,
  normalizeRepoPath,
} from './gui-common.mjs';

function usage() {
  console.error([
    'Usage:',
    '  node tools/js/gui-copy-scan.mjs <target...>',
    '',
    'Examples:',
    '  node tools/js/gui-copy-scan.mjs workbench-v3.html ui-v3',
  ].join('\n'));
}

async function collectFileStrings(file) {
  const info = await readText(file);
  const strings = file.endsWith('.html') ? extractHtmlVisibleText(info.text) : extractJsUserVisibleStrings(info.text);
  return strings.map((entry) => ({ file, text: entry.text, start: entry.start ?? null, end: entry.end ?? null }));
}

async function main() {
  const targets = process.argv.slice(2);
  if (!targets.length) {
    usage();
    process.exit(1);
  }

  const files = await listFilesRecursive(targets.map(normalizeRepoPath), ['.js', '.mjs', '.html']);
  const rows = [];
  for (const file of files) rows.push(...await collectFileStrings(file));

  const clusters = new Map();
  rows.forEach((row) => {
    const key = row.text;
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key).push({ file: row.file, start: row.start, end: row.end });
  });

  const duplicates = [...clusters.entries()]
    .map(([text, locations]) => ({ text, count: locations.length, locations }))
    .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text));

  console.log(JSON.stringify({
    scanned_files: files,
    unique_strings: clusters.size,
    duplicate_clusters: duplicates.filter((entry) => entry.count > 1),
    all_clusters: duplicates,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: { message: error.message, stack: error.stack } }, null, 2));
  process.exit(1);
});
