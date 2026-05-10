# Roadmap

Tracking what's done and what's next for `claude-design-mode`.

## Shipped in v1.0.0

| # | Sub-project | What it added |
|---|---|---|
| 1 | Agent shell + project conventions | `design-mode` skill, `/design-mode` trigger, `.design-manifest.json` schema, file-naming rules, design philosophy (no-AI-slop, variations strategy, content discipline) |
| 2 | Preview & error pipeline | `scripts/preview.js` — Playwright headless, console / page / network errors, full-page screenshot, JSON output. Lazy-installs Playwright into the plugin's own `node_modules/`. |
| 3 | Verifier subagent | `agents/design-verifier.md` — read-only vision audit against 7-category AI-slop checklist. Brief-override semantics. Dispatched in background after preview passes. |
| 4 | Starter components library | `scripts/copy-starter.js` + 6 starters (`deck_stage.js`, `ios_frame.jsx`, `android_frame.jsx`, `macos_window.jsx`, `browser_window.jsx`, `design_canvas.jsx`) + 2 host templates. `--with-host-html` scaffolds a paired sample. JSX is inlined (no `<script src>`) so file:// preview works without CORS issues. |
| 5 | Tweaks protocol | `scripts/tweak-host.js` daemon (POST /save, atomic EDITMODE-block rewrite) + `starters/tweaks-panel.js` (vanilla, auto-widget detection by JSON value type, debounced fetch, status indicator, headless skip via `navigator.webdriver`). |
| 6 | Sub-skills v1 | Three named sub-skills as `## Sub-skills` sections in SKILL.md: Make a deck, Wireframe, Make tweakable + `scripts/add-tweaks.js` for retrofitting Tweaks onto an existing HTML. |
| 6.5 | Sub-skills v2 | Two more sub-skills: Save as PDF (`scripts/to-pdf.js` — Playwright `page.pdf` with A4/letter/custom WxH + landscape) and Handoff to Claude Code (no script — workflow only, generates `<asset>.handoff.md` from a documented template). |
| 8 | Plugin packaging + GitHub repo | Manifest at `.claude-plugin/plugin.json`, full repo layout, README, MIT LICENSE, `.gitignore`. SKILL.md hardcoded paths replaced with `<SKILL_BASE>` placeholder + Path conventions section. Pushed to GitHub. GitHub Pages enabled at `okminlee.github.io/claude-design-mode/`. Five live examples (Tempo / Quartz / Aurora / Crayon / Foundry) + gallery index page. |

## Pending

### Immediate (user can do solo)

- [ ] **Plugin install verification.** In a fresh Claude Code session: `/plugin install github.com/OkminLee/claude-design-mode` → run `/design-mode <brief>` → confirm Claude resolves `<SKILL_BASE>` correctly and successfully invokes scripts via Bash.
- [ ] **Local copy cleanup** (after install verification passes). Remove the development copies at `~/.claude/skills/design-mode/` and `~/.claude/agents/design-verifier.md`. The plugin cache continues to serve.

If install verification fails, the most likely cause is Claude treating `<SKILL_BASE>` as a literal string. Tighten SKILL.md's "Path conventions" wording.

### Future sub-projects (each is its own brainstorm → spec → plan → execute cycle)

#### #7 — External integrations
GitHub import (read public repo files into design context), `web_fetch` / `web_search` for design references, image-metadata helper, JS sandbox for in-skill code execution. Specifically deferred to keep the plugin's hard system dependencies down to `node`/`npm`/`jq`/`curl` only.

#### #9 — Create design system
Currently treated as too big for a sub-skill section. Would produce a tokens file (`design-tokens.json` or `tokens.css`) + a small component library + a style guide page. Could either live inside `design-mode` SKILL.md as another sub-skill or be its own plugin (`claude-design-system`).

#### Animations starter + Animated video sub-skill
The original Claude design-mode prompt had `animations.jsx` — a timeline engine with `<Stage>`, `<Sprite>`, `useTime()`, `useSprite()`, scrubber, `Easing`, `interpolate()`. This was deferred from #4 because of size. Once shipped, the Animated video sub-skill (currently in the deferred list) becomes possible.

#### Export PPTX, Send to Canva
Both flagged as `#7 territory` — they need external API integration (or `python-pptx`-style heavyweight library inclusion). Probably belong in their own plugin if implemented.

### Light polish (no sub-project ceremony needed)

- [ ] **Cursor / Codex / OpenCode adapters.** superpowers ships `.cursor-plugin/`, `.codex-plugin/`, `gemini-extension.json` so the plugin works in those harnesses too. claude-design-mode could mirror this if there's user demand.
- [ ] **CI / release workflow.** Currently `git tag` + `git push` is manual. A GitHub Actions workflow that publishes to a marketplace (or just bumps version on merge to main) would help iteration speed.
- [ ] **Move `examples/deck_stage.js` and `examples/tweaks-panel.js` to symlinks** pointing at `skills/design-mode/starters/` so changes to starters don't drift from the example copies. (Currently they're snapshot copies.)
- [ ] **Add a `CHANGELOG.md`** with v1.0.0 entry and a section for upcoming work.

## Where to find things

- **Specs** for each sub-project: `~/.claude/docs/superpowers/specs/2026-05-10-design-agent-*-design.md` (in the user's local `~/.claude` — not in this repo). Pattern: one spec per sub-project, one plan per sub-project.
- **Plans** for each sub-project: `~/.claude/docs/superpowers/plans/2026-05-10-design-agent-*.md` (same location).
- **The Claude.ai design-mode source prompt** that inspired the project: https://github.com/elder-plinius/CL4R1T4S/blob/main/ANTHROPIC/Claude-Design-Sys-Prompt.txt

## Conventions

Each new sub-project follows the established pipeline:
1. `superpowers:brainstorming` — interview-style design exploration.
2. `superpowers:writing-plans` — a TDD-shaped implementation plan with bite-sized tasks.
3. `superpowers:subagent-driven-development` (or inline if mostly mechanical edits) — execute the plan.
4. Update the relevant Deferred Capabilities bullet in SKILL.md (rewrite, don't always delete) so the plugin remains honest about what it can and can't do.

When adding a new helper script, copy the existing pattern from `preview.js` / `to-pdf.js`:
- `path.dirname(__filename)` for self-location (plugin-portable).
- Reuse the in-plugin `node_modules/playwright` install instead of duplicating.
- Stdout = JSON only. Stderr = human prose. Exit codes: 0 success, 1 argument-shape, 2 runtime/IO.
- Atomic writes via `tmp + rename` for any file rewrite.

When adding a new sub-skill section to SKILL.md:
- Trigger phrases (English + Korean) at the top.
- Workflow as a numbered list.
- Use `<SKILL_BASE>/scripts/<script>.js` for any script invocation — never hardcode `~/.claude/...`.
- Update `## Deferred Capabilities` bullet to reflect the new state of partial completion.
