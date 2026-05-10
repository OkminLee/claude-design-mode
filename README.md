# claude-design-mode

A Claude Code plugin for HTML/JSX design artifact creation. Inspired by the Claude.ai design-mode workflow, ported to Claude Code with full Playwright preview, AI-slop verifier, starter components, in-page Tweaks panel, and 5 named sub-skills.

## Install

```
/plugin install github.com/OkminLee/claude-design-mode
```

(Or via Claude Code's plugin UI — paste the GitHub URL.)

## Showcase

One prompt → this:

![Tempo launch landing page](examples/tempo-launch.png)

**Prompt:**

> `/design-mode` 시간 추적 앱 "Tempo"의 launch landing page. 다크 테마, Geist 폰트, 좌측 헤드라인+CTA, 우측 iPhone 프레임 안에 앱 UI (현재 추적 중인 타이머 카드 + 오늘 세션 목록). 강조 색상은 한 가지만, gradient/emoji/3-col grid 금지. accent color, headline, lede, CTA 카피, dark toggle을 Tweaks로 라이브 편집 가능하게.

**What the plugin produced:**

- Single self-contained `tempo-launch.html` (~270 lines, vanilla CSS, Google Font import for Geist).
- Custom iPhone bezel with Dynamic Island + home indicator (lifted from the `ios_frame` starter conventions).
- App-inside-the-phone shows a **running timer for "claude-design-mode · v1.0 release"** — a meta touch that doubles as a live demo of the plugin building itself.
- 6 EDITMODE keys: `accent` (color picker), `headline` / `accentWord` / `lede` / `ctaLabel` (text inputs), `dark` (toggle).
- Tweaks panel renders bottom-right; status dot turns green when `tweak-host.js` is running and the file is being persisted on each tweak.
- Verified by `preview.js`: `loaded: true`, `errors: 0`, `network_errors: 0`. `design-verifier` returns `✅ pass` (no gradients, no accent-border cards, no overused fonts, no 3-col grid, no AI-headline phrases like "transform / unlock / supercharge", no emoji).

**Source:** [`examples/tempo-launch.html`](examples/tempo-launch.html). Open it in a browser to interact with the live Tweaks panel.

## Quick start

In any working directory:

```
/design-mode 가운데 정렬 hero 한 개, light mode, gradient 없이
```

Claude will:

1. Ask any clarifying questions.
2. Write an HTML file in the cwd.
3. Track it in `.design-manifest.json` (asset name + version).
4. Run a Playwright preview, capturing console errors and a full-page screenshot.
5. Dispatch the `design-verifier` subagent in the background for an AI-slop audit.
6. Report file paths.

## Features

- **Manifest-tracked artifacts** — every design grouped under an asset name with versioned entries (`<Asset> v2.html`, etc.).
- **Live preview** — `preview.js` loads HTML in headless Chromium, captures console/page/network errors and a screenshot.
- **AI-slop verifier** — a read-only subagent reviews the screenshot against a 7-category checklist (gradients, accent-border cards, SVG illustrations, overused fonts, emoji, three-column feature grids, AI-headline phrases).
- **6 starter components** — `deck_stage` (slide shell), `ios_frame`, `android_frame`, `macos_window`, `browser_window`, `design_canvas`.
- **In-page Tweaks panel** — drop an `EDITMODE-BEGIN/END` JSON block + `tweaks-panel.js` mount and the user can tweak values live in the browser; a small daemon (`tweak-host.js`) auto-persists changes to disk.
- **5 sub-skills** — Make a deck, Wireframe, Make tweakable (retrofit), Save as PDF, Handoff to Claude Code.

## Sub-skills (named workflows inside `/design-mode`)

| Sub-skill | Trigger | What it does |
|---|---|---|
| Make a deck | "deck", "slides", "presentation" | Slide-deck shell with keyboard nav, scaling, speaker notes, print-to-PDF |
| Wireframe | "wireframe", "low-fi", "explore options" | Greyscale variation grid, 4–8 mocks side-by-side |
| Make tweakable | "make this tweakable" | Retrofits an existing HTML with EDITMODE block + Tweaks panel mount |
| Save as PDF | "save as PDF", "export" | `to-pdf.js` Playwright-based PDF export (A4/letter/custom) |
| Handoff to Claude Code | "handoff", "ready for implementation" | Generates `<asset>.handoff.md` with components/tokens/interactions/build sequence |

## Daemon (Tweaks persistence)

Tweaks panel changes auto-persist to disk only when `tweak-host.js` is running. Start it once per session:

```
node <plugin>/skills/design-mode/scripts/tweak-host.js
```

(Default port 5174, configurable via `--port`.) Without the daemon, tweaks apply live in browser but don't save to disk.

## Dependencies

System tools required:

- `node` (v18+) — runs the helper scripts
- `npm` / `npx` — bootstraps the in-plugin Playwright install on first preview
- `jq`, `curl` — used in some workflow shell snippets (commonly preinstalled on macOS/Linux)

On first preview/PDF call, the plugin installs Playwright + Chromium into its own `node_modules/` folder (~150 MB, 1–3 min one-time download).

## Repository structure

```
claude-design-mode/
├── .claude-plugin/plugin.json     # manifest
├── skills/design-mode/
│   ├── SKILL.md                   # the skill itself
│   ├── scripts/                   # 5 Node helpers
│   └── starters/                  # 7 starter components + 3 host templates
├── agents/design-verifier.md      # AI-slop vision audit subagent
├── README.md
└── LICENSE
```

## License

MIT — see [LICENSE](LICENSE).

## Contributing

Issues and PRs welcome at [github.com/OkminLee/claude-design-mode](https://github.com/OkminLee/claude-design-mode).
