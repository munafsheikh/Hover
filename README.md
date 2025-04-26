# Hover

A Chrome extension that provides render-on-hover functionality for image-as-code formats like PlantUML and SVG.

## Features

- **Automatic Detection**: Automatically detects code blocks that contain PlantUML or SVG code while browsing the web
- **Hover Preview**: Renders the detected code as an image when you hover over the code block
- **Customizable**: Configure debounce time, rendering services, and more
- **Extensible**: Designed to support multiple rendering services (PlantUML server, ChatGPT, custom APIs)

### Version 1

- Auto-renders PlantUML and SVG diagrams when hovering over code blocks
- Uses the PlantUML server for rendering PlantUML diagrams
- Directly renders SVG code

### Planned for Version 2

- Send hovered text to ChatGPT or similar AI systems for analysis
- Custom API integration
- More rendering options

## Installation

### From Chrome Web Store (Coming Soon)

1. Visit the Chrome Web Store (link to be added)
2. Click "Add to Chrome"
3. Confirm the installation

### Manual Installation (Developer Mode)

1. Clone this repository or download as a ZIP file
2. Extract the files if needed
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode" in the top-right corner
5. Click "Load unpacked" and select the extension folder
6. The extension should now be installed and active

## Usage

1. Browse to any webpage that contains PlantUML or SVG code blocks
2. Hover your mouse over a code block
3. A popup will appear with the rendered diagram
4. The popup will automatically disappear when you move your cursor away

### Settings

Click on the extension icon to access the following settings:

- Enable/disable the extension
- Toggle rendering for PlantUML and SVG
- Adjust debounce time (minimum time between renderings)
- Select rendering service

For advanced settings, click on "Advanced Options" to configure:

- Custom CSS for the popup
- Customize selectors for code detection
- Configure PlantUML server URL
- Set up custom API parameters (coming in future versions)
- Configure ChatGPT integration (coming in future versions)

## Development

### Prerequisites

- Node.js and npm
- ImageMagick (for icon conversion)

### Local Setup

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run convert-icons` to generate PNG icons from SVG
4. Run `npm run build` to build the extension
5. The built extension will be in the `dist` directory

### Build Commands

```bash
# Development build with watch mode
npm run dev

# Production build
npm run build

# Package the extension
npm run package

# Convert SVG icons to PNG
npm run convert-icons
```

## How It Works

The extension uses content scripts to detect when you hover over code blocks. When a code block containing PlantUML or SVG is detected, it:

1. For PlantUML: Encodes the UML text using the DEFLATE algorithm and sends it to the PlantUML server
2. For SVG: Directly renders the SVG code
3. Displays the rendered image in a popup

The extension implements debouncing to prevent excessive API calls, waiting at least 15 seconds (configurable) between renderings.

## Technical Details

### PlantUML Encoding

PlantUML diagrams are encoded using the following process:

1. Convert the PlantUML text to a Uint8Array
2. Compress it using the DEFLATE algorithm
3. Convert the compressed data to base64
4. Replace certain characters to make it URL-safe
5. Send it to the PlantUML server for rendering

### Extension Structure

- `manifest.json`: Extension configuration
- `background.js`: Background service worker
- `content.js`: Content script that runs on web pages
- `popup.html`/`popup.js`: Extension popup UI
- `options.html`/`options.js`: Advanced options page
- `lib/plantuml-encoder.min.js`: Third-party library for PlantUML encoding

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [PlantUML](https://plantuml.com/) for providing the rendering service
- All contributors and users of this extension

---

> Because image-as-code formats are almost native to markdown and html now, and it's just annoying that mermaid is rendered, but plantuml isn't.

1. Chrome Plugin

> NB: Use at your own risk. Most of this code was "vibe-coded" using CursorAI.

const url = `https://www.plantuml.com/plantuml/png/~1${encoded}`;
console.log('PlantUML URL:', url);
return url;
