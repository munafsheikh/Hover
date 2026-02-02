# Development Workflow for Hover

- Always use `npm run dev:*` scripts, not raw tools.
- After editing code, run `npm run dev:check`.
- For packaging, run `npm run dev:package`.
- To debug, press F5 → "Debug Hover Extension".

## Workflow
1. `npm run dev:setup` – clean install + watcher
2. `npm run dev` – keep webpack watching
3. `npm run dev:check` – validate changes
4. `npm run dev:package` – build for Chrome Web Store
