# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hover is a Chrome extension that provides render-on-hover functionality for image-as-code formats like PlantUML and SVG diagrams. When users hover over code blocks on web pages, the extension automatically detects and renders visual representations in a popup.

**Architecture**: Chrome Manifest V3 extension with service worker
**Language**: Vanilla JavaScript (ES2021+)
**Build Tool**: Webpack 5 with Babel transpilation

## Common Build Commands

```bash
# Development
npm run dev              # Development build with watch mode
npm run dev:setup        # Clean install + setup + start dev watcher

# Production
npm run build            # Production build
npm run dev:package      # Build and create distribution ZIP

# Quality Checks
npm run dev:check        # Run lint and tests
npm run lint             # ESLint on src/**/*.js
npm test                 # Run Jest unit tests
npm run format           # Format code with Prettier

# Utilities
npm run package          # Create ZIP file from dist/
npm run convert-icons    # Convert SVG icons to PNG (requires ImageMagick)
npm run version          # Update version in manifest.json
```

## Code Architecture

### Entry Points (4 independent bundles)

Webpack bundles four separate entry points defined in `webpack.config.js`:

1. **background.js** - Service worker (Manifest V3)
   - Manages extension lifecycle (install, update)
   - Handles settings persistence via `chrome.storage.sync`
   - Message broker between content scripts, popup, and options page
   - Initializes default settings

2. **content.js** - Content script injected into all web pages
   - Main orchestrator with singleton Logger instance
   - Detects code blocks on hover
   - Renders PlantUML diagrams via PlantUML server
   - Manages popup display and diagram caching (24-hour TTL)
   - Uses ContentHandlerRegistry for extensibility

3. **popup.js** - Extension popup UI controller
   - Basic settings: enable/disable, toggle PlantUML/SVG, debounce time
   - Communicates with background.js via `chrome.runtime.sendMessage`

4. **options.js** - Advanced options page controller
   - Custom CSS, code selectors, PlantUML server URL
   - Future: Custom API and ChatGPT integration settings

### Key Components

#### ContentHandlerRegistry Pattern
**Location**: `src/registry/ContentHandlers.js`

Registry + Strategy pattern for managing different content type handlers (PlantUML, SVG, etc.):
- `register(handler)`: Add new content handlers
- `getHandler(content)`: Match content to appropriate handler
- `getAllClassIdentifiers()`: Get CSS classes for detection

**Note**: References a missing `BaseContentHandler` class - this is incomplete architecture for future extensibility.

#### Singleton Logger
**Location**: `src/utils/Logger.js`

Centralized logging utility with methods: `info()`, `debug()`, `error()`, `warn()`
- Prefixed output: `[Hover-Extension][LEVEL]`
- Debug mode toggle for production

#### String Matcher
**Location**: `src/utils/StringMatcher.js`

Pattern detection utility for code blocks:
- PlantUML blocks: `@start(uml|ditaa|json|yaml|mindmap)` ... `@end...`
- Markdown code blocks: ` ```language ` ... ` ``` `
- Returns array of `MatchResult` with type, content, start/end indices

**Tests**: `src/utils/StringMatcher.test.js` (Jest)

### Extension Communication Flow

```
Web Page
   ↓ (user hovers over code block)
content.js
   ↓ (detects PlantUML/SVG code)
StringMatcher
   ↓ (encodes diagram)
lib/plantuml-encoder.min.js
   ↓ (fetches from PlantUML server)
PlantUML Server API
   ↓ (returns PNG image)
content.js
   ↓ (displays in popup)
User sees rendered diagram
```

Settings flow:
```
popup.js / options.js
   ↓ (chrome.runtime.sendMessage)
background.js
   ↓ (chrome.storage.sync.set)
Persistent Storage
   ↓ (chrome.storage.sync.get)
content.js (reads settings)
```

## Development Workflow

### Initial Setup
```bash
npm install                  # Install dependencies
npm run convert-icons        # Generate PNG icons from SVG (requires ImageMagick)
npm run dev                  # Start development build with watch mode
```

### Regular Development
1. Make code changes
2. Webpack auto-rebuilds in watch mode (`npm run dev`)
3. Reload extension in Chrome: `chrome://extensions/` → click reload icon
4. Test on web pages with PlantUML/SVG code

### Pre-Commit Workflow
```bash
npm run dev:check            # Runs lint + test
npm run format               # Auto-format code
```

### Packaging for Distribution
```bash
npm run dev:package          # Builds production bundle + creates ZIP
```

Output: `dist/hover-extension.zip` ready for Chrome Web Store

## Testing

### Running Tests
```bash
npm test                     # Run all Jest tests
npm test -- --watch          # Watch mode
npm test -- StringMatcher    # Run specific test file
```

### Test Structure
- Unit tests located alongside source files: `*.test.js`
- Jest configuration via `babel.config.js`
- Current coverage: StringMatcher utility

### Writing New Tests
Follow Jest conventions:
```javascript
describe('MyUtility', () => {
    test('should do something', () => {
        expect(result).toBe(expected);
    });
});
```

## Debugging

### VS Code Debugging (F5)
Launch configuration in `.vscode/launch.json`:

**"Debug Hover Extension"** (F5):
- Launches Chrome with extension loaded from `dist/`
- Auto-opens DevTools
- URL: http://localhost:3000 (configurable)

**"Attach to Chrome"**:
- Attaches to existing Chrome instance
- Requires Chrome started with `--remote-debugging-port=9222`

### Manual Debugging
1. Build: `npm run build` or `npm run dev`
2. Chrome: `chrome://extensions/` → Enable Developer Mode → Load unpacked → select `dist/`
3. Inspect:
   - Background worker: Click "service worker" link in extension card
   - Content script: Right-click page → Inspect → Console tab (filter by "[Hover-Extension]")
   - Popup: Right-click extension icon → Inspect popup

### Common Issues
- **Changes not reflected**: Reload extension in `chrome://extensions/`
- **Popup not showing**: Check console for errors, verify code block detection
- **PlantUML not rendering**: Check network tab for API errors, verify PlantUML server URL

## Extension Structure

### Manifest V3 Architecture
**File**: `manifest.json`

Key configurations:
- **Service Worker**: `background.js` (persistent: false)
- **Content Scripts**: `content.js` injected into all URLs (`<all_urls>`)
- **Permissions**: `storage`, `activeTab`
- **Web Accessible Resources**: icons, lib/plantuml-encoder.min.js

### Build Output (dist/)
```
dist/
├── manifest.json           # Extension manifest
├── background.js           # Service worker bundle
├── content.js              # Content script bundle
├── popup.js                # Popup UI bundle
├── popup.html              # Popup HTML
├── options.js              # Options page bundle
├── options.html            # Options HTML
├── icons/                  # Extension icons (16, 48, 128px)
├── lib/                    # Third-party libraries
└── hover-extension.zip     # Distribution package
```

### Static Assets
- **icons/**: SVG source + generated PNG (16x16, 48x48, 128x128)
- **lib/plantuml-encoder.min.js**: DEFLATE-based PlantUML text encoder

## Code Patterns and Conventions

### Code Style
- **Linting**: ESLint with `eslint:recommended`
- **Formatting**: Prettier (4-space tabs, single quotes, semicolons required)
- **ES Version**: ES2021+ (Babel transpiles to browser-compatible JS)

### Extension APIs
- Use `chrome.*` APIs (global available in all extension contexts)
- Async operations: Prefer Promises over callbacks where available
- Storage: `chrome.storage.sync` for settings persistence

### Logging
Always use the Logger singleton:
```javascript
import Logger from './utils/Logger.js';
const logger = Logger.getInstance();
logger.info('Message');
```

### Caching Strategy
- In-memory cache with 24-hour TTL for rendered diagrams
- Cache key: PlantUML encoded text
- Prevents excessive API calls on repeated hovers

## Important Notes

- **Missing BaseContentHandler**: The ContentHandlerRegistry references a non-existent base class at `../handlers/BaseContentHandler.js` - this is incomplete architecture for future handler implementations
- **PlantUML Server**:
  - Default uses public server (https://www.plantuml.com/plantuml)
  - Configurable in extension options under "PlantUML" tab
  - Supports local servers for privacy/performance (see LOCAL_PLANTUML_SETUP.md)
  - Format can be changed between SVG and PNG
- **Settings Management**: Extension loads settings from `chrome.storage.sync` on initialization and updates when changed
- **Debouncing**: 15-second default debounce prevents excessive API calls
- **Future Extensibility**: Architecture designed to support ChatGPT integration and custom APIs (v2.0)

## Chrome Extension CSP Considerations

Chrome Manifest V3 enforces strict Content Security Policy (CSP) that blocks `eval()` and similar functions for security.

**Webpack Configuration**: The `webpack.config.js` uses `devtool: 'cheap-module-source-map'` instead of the default `eval` source maps to comply with CSP. Do NOT change this to `eval`, `eval-source-map`, or similar options that use `eval()`.

**Allowed devtool options for Chrome extensions**:
- `cheap-module-source-map` (current) - Good balance of build speed and debugging
- `source-map` - Full source maps, slower builds
- `inline-source-map` - Embedded source maps
- `false` - No source maps

**CSP Violations**: If you see errors like "Evaluating a string as JavaScript violates the following Content Security Policy directive", check:
1. Webpack devtool setting
2. Third-party libraries using `eval()` or `new Function()`
3. Dynamic code generation in source code
