# JavaScript parser tools

Small repo-local JavaScript inspection tools for safer edits and structural debugging.

## Install

```bash
npm install
```

## Commands

```bash
npm run js:check -- ui-v2/app.js
npm run js:ast -- ui-v2/app.js
npm run js:symbols -- ui-v2/app.js
npm run js:deps -- ui-v2/app.js
node tools/js/parse.mjs find ui-v2/app.js render
```

## What each command does

- `check` runs `node --check` for syntax validation.
- `ast` parses the file with Acorn and prints full AST JSON.
- `symbols` prints imports, exports, top-level declarations, and top-level calls.
- `deps` prints import and re-export edges.
- `find` locates identifier matches in the parsed AST.

## Notes

- This tool assumes ECMAScript modules and parses with `sourceType: "module"`.
- Acorn covers finalized ECMAScript syntax. If the repo later needs JSX, TypeScript, or proposal syntax, this toolchain can be expanded.
- `check` and parse are intentionally separate: Node gives a runtime-facing syntax check, Acorn gives structured AST access.
