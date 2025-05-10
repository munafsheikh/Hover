/**
 * Hover - Content Script (Cleaned)
 * Detects when the mouse hovers over code blocks and dynamically renders PlantUML or SVG.
 */

let lastHoverTime = null;
const HOVER_DEBOUNCE_TIME = 5000;
let currentHoverElement = null;
let popup = null;
const plantumlLocation = 'lib/plantuml-encoder.min.js';

const PLANTUML_BLOCK_MATCHERS = [
    { name: 'UML', enabled: true, regex: /@startuml[\s\S]*?@enduml/gi },
    // { name: 'DITAA', enabled: true, regex: /@startditaa[\s\S]*?@endditaa/gi },
    { name: 'DOT', enabled: true, regex: /@startdot[\s\S]*?@enddot/gi },
    // { name: 'JCCKit', enabled: true, regex: /@startjcckit[\s\S]*?@endjcckit/gi },
    { name: 'Salt', enabled: true, regex: /@startsalt[\s\S]*?@endsalt/gi },
    { name: 'MindMap', enabled: true, regex: /@startmindmap[\s\S]*?@endmindmap/gi },
    { name: 'Regex', enabled: true, regex: /@startregex[\s\S]*?@endregex/gi },
    { name: 'Gantt', enabled: true, regex: /@startgantt[\s\S]*?@endgantt/gi },
    { name: 'Chronology', enabled: true, regex: /@startchronology[\s\S]*?@endchronology/gi },
    { name: 'WBS', enabled: true, regex: /@startwbs[\s\S]*?@endwbs/gi },
    { name: 'EBNF', enabled: true, regex: /@startebnf[\s\S]*?@endebnf/gi },
    { name: 'JSON', enabled: true, regex: /@startjson[\s\S]*?@endjson/gi },
    { name: 'YAML', enabled: true, regex: /@startyaml[\s\S]*?@endyaml/gi },
    { name: 'SkinParam', enabled: true, regex: /skinparam\s+[\s\S]*?\}/gi },
];

// Content Type Handler Registry
const ContentHandlers = {
    handlers: new Map(),

    register(handler) {
        this.handlers.set(handler.type, handler);
    },

    getHandler(content) {
        for (const handler of this.handlers.values()) {
            if (handler.canHandle(content)) {
                return handler;
            }
        }
        return null;
    }
};

// Base Handler Class
class BaseContentHandler {
    constructor(type) {
        this.type = type;
    }

    canHandle(content) { return false; }
    wrap(content) { return content; }
    getClassIdentifiers() { return []; }
}

// PlantUML Handler
class PlantUMLHandler extends BaseContentHandler {
    constructor() {
        super('plantuml');
        this.blockMatchers = PLANTUML_BLOCK_MATCHERS;
    }

    canHandle(content) {
        return this.blockMatchers.some(matcher =>
            matcher.regex.test(content.trim().toLowerCase())
        );
    }

    getClassIdentifiers() {
        return ['language-plantuml'];
    }

    wrap(content) {
        return content; // Already in PlantUML format
    }
}

// JSON Handler
class JsonHandler extends BaseContentHandler {
    constructor() {
        super('json');
    }

    canHandle(content) {
        try {
            JSON.parse(content);
            return true;
        } catch (e) {
            return false;
        }
    }

    getClassIdentifiers() {
        return ['language-json'];
    }

    wrap(content) {
        const formattedJson = JSON.stringify(JSON.parse(content), null, 2);
        return `@startjson\n${formattedJson}\n@endjson`;
    }
}

// SVG Handler
class SvgHandler extends BaseContentHandler {
    constructor() {
        super('svg');
    }

    canHandle(content) {
        const trimmed = content.trim().toLowerCase();
        return trimmed.startsWith('<svg') && trimmed.includes('</svg>');
    }

    getClassIdentifiers() {
        return ['language-svg'];
    }

    wrap(content) {
        return content;
    }
}

function loadPlantUMLEncoder(doc, lib) {
    // console.info('Libraries: ', { doc: doc ? 'doc' : null, lib: lib ? 'lib' : null });
    let libLocation = '';
    if (!lib) {
        libLocation = plantumlLocation;
    }
    else {
        libLocation = lib;
    }

    if (doc) {
        document = doc;
    }

    return new Promise((resolve, reject) => {
        // Check if it's already loaded
        if (window.plantumlEncoder) {
            console.log('PlantUML encoder already loaded');
            return resolve();
        }

        const script = document.createElement('script');
        console.log(libLocation);
        // Use the provided lib path directly in test environment
        script.src = lib || (chrome.runtime?.getURL ? chrome.runtime.getURL(libLocation) : libLocation);
        script.onload = () => {
            console.log('PlantUML encoder loaded successfully');
            resolve();
        };
        script.onerror = (error) => {
            console.error('Failed to load PlantUML encoder:', error);
            reject(error);
        };
        document.head.appendChild(script);
    });
}

function isPlantUML(text) {
    const trimmed = text.trim().toLowerCase();
    return PLANTUML_BLOCK_MATCHERS.some(matcher => matcher.enabled && matcher.regex.test(trimmed));
}

function isSVG(text) {
    const trimmed = text.trim().toLowerCase();
    return trimmed.startsWith('<svg') && trimmed.includes('</svg>');
}

function encodePlantUML(code) {
    if (!window.plantumlEncoder) throw new Error('Encoder not loaded');
    return window.plantumlEncoder.encode(htmlEscape(code.trim()));
}

function extractPlantUMLBlocks(text) {
    const matches = [];
    PLANTUML_BLOCK_MATCHERS.forEach(matcher => {
        if (matcher.enabled) {
            const found = text.match(matcher.regex);
            if (found) {
                found.forEach(block => matches.push({ type: matcher.name, code: block.trim(), encodedText: encodePlantUML(block) }));
            }
        }
    });
    return matches;
}


function renderPlantUMLInline(blocks, contentDiv) {
    contentDiv.innerHTML = '';
    blocks.forEach(({ matcher, code, encodedText }) => {
        const imageUrl = `https://www.plantuml.com/plantuml/svg/${encodedText}`;

        const wrapper = document.createElement('div');
        wrapper.style.cssText = `font-family: monospace; font-size: 12px; white-space: pre-wrap;
      word-break: break-all; border: 1px solid #ccc; background: #fafafa;
      padding: 10px; margin-bottom: 30px;`;

        const title = document.createElement('div');
        title.textContent = 'PlantUML Diagnostics ';
        title.style.cssText = 'font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px';

        const codeBlock = document.createElement('div');
        codeBlock.innerHTML = `Original Code<p><div style="margin:5px 0; color:#333;"><code><pre>${code}</pre></code></div></p>`;

        const links = document.createElement('div');
        links.innerHTML = `
      <h2>Rendering Options:</h2>
      <a href="https://www.plantuml.com/plantuml/png/${encodedText}" target="_blank" download="diagram.png">Open as PNG</a>
      <a href="https://www.plantuml.com/plantuml/svg/${encodedText}" target="_blank" download="diagram.svg">Open as SVG</a>
      <a href="https://www.plantuml.com/plantuml/txt/${encodedText}" target="_blank">View as Text</a></div>`;

        const img = document.createElement('img');
        img.src = imageUrl;
        img.style.cssText = 'max-width: 100%; height: auto; border: 1px solid #ddd; margin-top: 15px';
        img.onerror = () => {
            img.style.display = 'none';
            wrapper.appendChild(Object.assign(document.createElement('div'), {
                textContent: 'Failed to load image',
                style: 'color: red'
            }));
        };

        wrapper.append(title);
        wrapper.append(img);
        wrapper.append(links);
        wrapper.append(codeBlock);
        contentDiv.append(wrapper);
    });
    return contentDiv;
}

function renderSVG(code) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(code);
}

async function renderCode(code, type) {
    const contentDiv = popup?.querySelector('.hover-extension-content');
    if (!contentDiv) return;

    contentDiv.innerHTML = '<div style="text-align: center;">Loading...</div>';
    try {
        const blocks = extractBlocks(code);
        renderPlantUMLInline(blocks, contentDiv);
    } catch (err) {
        console.error('Render error:', err);
        contentDiv.innerHTML = `<div style="color: red;">Error: ${err.message}</div>`;
    }
}

function htmlEscape(text) {
    return text;
    // return text
    //     .replace(/&/g, '&amp;')
    //     .replace(/</g, '&lt;')
    //     .replace(/>/g, '&gt;')
    //     .replace(/"/g, '&quot;')
    //     .replace(/'/g, '&#039;');
}

function createPopup() {
    if (popup) return;
    popup = document.createElement('div');
    popup.className = 'hover-extension-popup';
    popup.style.cssText = `position: fixed; width: 400px; max-height: 400px; background: white; border: 1px solid #ccc;
    border-radius: 5px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); z-index: 10000; padding: 10px; display: none; overflow: auto;`;
    popup.innerHTML = `<div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
    <div style="font-weight: bold;">Hover - Image Preview</div>
    <button style="background: none; border: none; font-size: 20px; cursor: pointer; padding: 0 5px;">×</button>
  </div><div class="hover-extension-content"></div>`;
    popup.querySelector('button').onclick = hidePopup;
    document.body.appendChild(popup);
}

function showPopup(x, y) {
    if (!popup) createPopup();
    const vw = window.innerWidth, vh = window.innerHeight;
    const pw = 400, ph = Math.min(400, vh * 0.8);
    const left = (x + pw > vw) ? x - pw - 10 : x + 10;
    const top = (y + ph > vh) ? vh - ph - 10 : y + 10;
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
    popup.style.display = 'block';
}

function hidePopup() {
    if (popup) {
        popup.style.display = 'none';
        popup.querySelector('.hover-extension-content').innerHTML = '';
    }
}

async function handleMouseOver(event) {
    const now = Date.now();
    // if (!lastHoverTime) {
    //     lastHoverTime = 0;
    // }
    // if ((now - lastHoverTime) < HOVER_DEBOUNCE_TIME) return;

    const target = event.target;
    if (popup?.contains(target)) return;

    // Check if element matches any supported type
    let { codeText, isCode, lastHoverTime, rendered } = await render(target, event);
}

async function render(target, event) {
    console.log('render', target, event);
    let codeText = '';
    let isCode = false;
    const supportedClasses = Array.from(ContentHandlers.handlers.values())
        .flatMap(handler => handler.getClassIdentifiers());
    if (['CODE', 'PRE'].includes(target.tagName) ||
        supportedClasses.some(cls => target.classList.contains(cls))) {
        // console.log('target.tagName', target.tagName);
        codeText = target.textContent;
        isCode = true;
    } else if (target.parentElement && ['CODE', 'PRE'].includes(target.parentElement.tagName)) {
        // console.log('target.parentElement.tagName', target.parentElement.tagName);
        codeText = target.parentElement.textContent;
        isCode = true;
    }
    let rendered = [];
    if (isCode && isRenderable(codeText)) {
        console.log('isCode && isRenderable(codeText)', isCode, isRenderable(codeText));
        currentHoverElement = target;
        lastHoverTime = Date.now();
        showPopup(event.clientX, event.clientY);
        rendered = await renderCode(codeText, 'plantuml');
    }
    return { codeText, isCode, lastHoverTime, rendered };
}

async function initialize(doc, lib) {
    lastHoverTime = 0;
    try {
        if (doc || lib) {
            // Test environment initialization
            document = doc || document;
            await loadPlantUMLEncoder(doc, lib);
        } else {
            // Production environment initialization
            await loadPlantUMLEncoder(null, null);
            document.head.appendChild(Object.assign(document.createElement('style'), {
                textContent: `.hover-extension-popup { font-family: Arial; font-size: 14px; }`
            }));
            createPopup();

            document.addEventListener('mouseover', handleMouseOver);
            document.addEventListener('mouseout', (e) => {
                if (currentHoverElement && !popup.contains(e.relatedTarget)) currentHoverElement = null;
            });
            document.addEventListener('click', (e) => {
                if (popup?.style.display === 'block' && !popup.contains(e.target)) hidePopup();
            });

            chrome.runtime.onMessage.addListener((msg, _, res) => {
                if (msg.action === 'updateSettings') { }
                res({ success: true });
                return true;
            });
        }
    } catch (err) {
        console.error('initialize error:', JSON.stringify(err, null, 4));
    }
}



// Register handlers
ContentHandlers.register(new PlantUMLHandler());
ContentHandlers.register(new JsonHandler());
ContentHandlers.register(new SvgHandler());

// Modified core functions
function isRenderable(text) {
    return ContentHandlers.getHandler(text) !== null;
}

// Add cache utilities
const PlantUMLCache = {
    prefix: 'plantuml_cache_',
    ttl: 24 * 60 * 60 * 1000, // 24 hours in milliseconds

    getKey(content) {
        // Create a cache key from the content
        return this.prefix + this.hashString(content);
    },

    hashString(str) {
        // Simple hash function for cache keys
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    },

    get(content) {
        try {
            const key = this.getKey(content);
            const cached = localStorage.getItem(key);
            if (!cached) return null;

            const { value, timestamp } = JSON.parse(cached);

            // Check if cache has expired
            if (Date.now() - timestamp > this.ttl) {
                localStorage.removeItem(key);
                return null;
            }

            return value;
        } catch (e) {
            console.error('Cache read error:', e);
            return null;
        }
    },

    set(content, value) {
        try {
            const key = this.getKey(content);
            const data = {
                value,
                timestamp: Date.now()
            };
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error('Cache write error:', e);
        }
    }
};

function extractBlocks(text) {
    const handler = ContentHandlers.getHandler(text);
    if (!handler) return [];

    const wrappedContent = handler.wrap(text);

    // Try to get encoded content from cache
    // console.log('wrappedContent', wrappedContent);
    let encodedTextCached = PlantUMLCache.get(wrappedContent);
    // console.log('encodedTextCached', encodedTextCached);

    // If not in cache, encode and cache it
    if (!encodedTextCached) {
        // console.log('encoding');
        encodedTextCached = encodePlantUML(wrappedContent);
        PlantUMLCache.set(wrappedContent, encodedTextCached);
    }

    return [{
        type: handler.type,
        code: wrappedContent,
        encodedText: encodedTextCached
    }];
}

initialize(null, null);