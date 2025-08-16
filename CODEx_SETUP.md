# CODEx_SETUP for Hover

- Always use `npm run codex:*` scripts, not raw tools.
- After editing code, run `npm run codex:check`.
- For packaging, run `npm run codex:package`.
- To debug, press F5 → "🧩 Debug Hover Extension".

## Workflow
1. `npm run codex:setup` – clean install + watcher
2. `npm run dev` – keep webpack watching
3. `npm run codex:check` – validate changes
4. `npm run codex:package` – build for Chrome Web Store
