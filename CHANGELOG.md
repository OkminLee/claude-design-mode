# Changelog

All notable changes to `claude-design-mode` are recorded here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] — 2026-05-13

Two additive helper scripts under sub-project #7 (External integrations). No breaking changes; existing skills, sub-skills, and conventions are untouched.

### Added

- **`scripts/gh-import.js`** — Pulls a single file from a public GitHub repo into `cwd/references/`. Normalizes blob/raw URLs, enforces a content-type allowlist and size cap (default 5 MiB), atomic write with collision bumping, sha256 in the output JSON. Zero new runtime dependencies (Node 18+ built-in `fetch`). 36 unit + integration tests. SKILL.md Step 2 (Explore) is updated to trigger this whenever a user references a GitHub URL.
- **`scripts/image-meta.js`** — Reads `{path, format, width, height, bytes}` from a local PNG or JPG. Pure-JS header parser: 24-byte PNG IHDR read, JPEG SOFn scanner with DHT-skip and standalone-marker handling. Rejects URLs (delegates to `gh-import.js`). Zero new runtime dependencies. 29 unit + integration tests. SKILL.md Step 2 is updated to trigger this when the user provides image assets.
- **New "Helper scripts" section in `SKILL.md`** consolidating all CLI helpers (`preview.js`, `to-pdf.js`, `add-tweaks.js`, `gh-import.js`, `image-meta.js`, `copy-starter.js`, `tweak-host.js`) into a single table with purpose and trigger guidance.

### Changed

- **Deferred Capabilities (#7)** in `SKILL.md` rewritten to reflect partial completion: GitHub import and image-metadata shipped; `web_fetch` / `web_search`, dominant-color and EXIF extraction, and JS sandbox remain deferred.
- **`ROADMAP.md`** #7 section updated with shipping dates and split into "Shipped" / "Still deferred" lists.

## [1.0.0] — 2026-05-10

Initial release. Packages the Claude.ai design-mode workflow as an installable Claude Code plugin.

### Added

- **Skill `design-mode`** — `/design-mode <brief>` trigger, six-step workflow (Understand → Explore → Plan → Build → Verify → Summarize), file-naming and versioning conventions, `.design-manifest.json` asset tracking schema.
- **Preview pipeline (`scripts/preview.js`)** — Playwright-based headless render that captures a full-page screenshot, console errors, page errors, and 4xx/5xx network responses as one-line JSON. Self-installs Playwright + Chromium on first use.
- **Verifier subagent (`agents/design-verifier.md`)** — Vision-only AI-slop audit against a 7-category checklist; dispatched in background after preview passes.
- **Starter components (`starters/` + `scripts/copy-starter.js`)** — Six starters: `deck_stage.js`, `ios_frame.jsx`, `android_frame.jsx`, `macos_window.jsx`, `browser_window.jsx`, `design_canvas.jsx`. `--with-host-html` scaffolds a paired sample with the right boilerplate; JSX is inlined to bypass file:// CORS.
- **Tweaks protocol (`scripts/tweak-host.js` + `starters/tweaks-panel.js`)** — In-page panel with auto-widget detection by JSON value type, debounced fetch, headless skip via `navigator.webdriver`. Daemon persists changes back to the EDITMODE block in source files.
- **Sub-skills**: Make a deck, Wireframe, Make tweakable, Save as PDF, Handoff to Claude Code.
- **Plugin packaging** — `.claude-plugin/plugin.json`, `<SKILL_BASE>` placeholder pattern in `SKILL.md`, README, MIT license. Five live example pages (Tempo / Quartz / Aurora / Crayon / Foundry) published via GitHub Pages.

[1.1.0]: https://github.com/OkminLee/claude-design-mode/releases/tag/v1.1.0
[1.0.0]: https://github.com/OkminLee/claude-design-mode/releases/tag/v1.0.0
