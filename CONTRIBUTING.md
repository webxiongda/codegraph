# Contributing to CodeGraph

Thanks for your interest in improving CodeGraph. This project is a zero-backend, browser-only dependency visualizer, and contributions of every size are welcome — from a one-line parser fix to a new analysis view.

## Code of Conduct

Be respectful and constructive. Assume good intent, give specific feedback, and keep discussions focused on making the project better for everyone.

## Running locally

You need Node.js 18+ and npm.

```bash
git clone https://github.com/webxiongda/codegraph.git
cd codegraph
npm install
npm run dev
```

Open `http://localhost:5173`. The built-in sample project loads automatically, so you can explore a real graph immediately. Production checks:

```bash
npm run build   # tsc --noEmit && vite build
npm run preview
```

## Project layout

- `src/parser.ts` — AST parsing, specifier resolution, and multi-file text splitting
- `src/graph.ts` — cycle detection, statistics, coloring, and connected components
- `src/sampleProject.ts` — the built-in example source files and presets
- `src/components/GraphCanvas.tsx` — the SVG force-directed canvas and its interactions
- `src/pages/` — the ten hash-routed views
- `src/index.css` — the dark neon theme

## Code style

- TypeScript is configured with `strict: true`, `noUnusedLocals`, and `noUnusedParameters`. Keep the build clean — no `any` escape hatches where a real type will do.
- Business logic and non-obvious algorithms are commented in Chinese; keep inline explanations consistent with the surrounding source.
- Match the existing file organization: pure logic in `src/parser.ts` / `src/graph.ts`, UI in components and pages.
- No new runtime dependencies unless there is a strong reason. The graph, layout, and effects are deliberately hand-written SVG and CSS — please keep it that way.

## Commit convention

Use a short, imperative subject line with a type prefix:

- `feat:` — a new feature or view
- `fix:` — a bug fix
- `refactor:` — a code change that neither fixes a bug nor adds a feature
- `chore:` — tooling, docs, or maintenance

For example: `feat: add path alias resolution` or `fix: handle type-only re-exports`.

## Pull requests

1. Fork the repository and create a branch from `main`.
2. Make a focused change and verify it with `npm run build`.
3. Describe what changed and why in the PR, and reference any related issue.
4. Keep PRs small and self-contained; split unrelated changes into separate PRs.

## Good first issues

Looking for a place to start? These are welcoming areas:

- Broaden parser coverage — new `EdgeKind` cases, more file extensions, or better specifier resolution.
- Add structure metrics or polish the charts on the Metrics page.
- Improve the cycle-breaking suggestions on the Cycles page.
- Add layout and coloring options in Settings.
- Improve documentation and translations.

If you are unsure where to begin, open an issue and we will help you find a task.
