/**
 * Hover - Content Script (Cleaned)
 * Detects when the mouse hovers over code blocks and dynamically renders PlantUML or SVG.
 */

let lastHoverTime = 0;
const HOVER_DEBOUNCE_TIME = 15000;
let currentHoverElement = null;
let popup = null;
const plantumlLocation = 'lib/plantuml-encoder.min.js'

const PLANTUML_BLOCK_MATCHERS = [
    { name: "UML", enabled: true, regex: /@startuml[\s\S]*?@enduml/gi },
    { name: "DITAA", enabled: true, regex: /@startditaa[\s\S]*?@endditaa/gi },
    { name: "DOT", enabled: true, regex: /@startdot[\s\S]*?@enddot/gi },
    { name: "JCCKit", enabled: true, regex: /@startjcckit[\s\S]*?@endjcckit/gi },
    { name: "Salt", enabled: true, regex: /@startsalt[\s\S]*?@endsalt/gi },
    { name: "MindMap", enabled: true, regex: /@startmindmap[\s\S]*?@endmindmap/gi },
    { name: "Regex", enabled: true, regex: /@startregex[\s\S]*?@endregex/gi },
    { name: "Gantt", enabled: true, regex: /@startgantt[\s\S]*?@endgantt/gi },
    { name: "Chronology", enabled: true, regex: /@startchronology[\s\S]*?@endchronology/gi },
    { name: "WBS", enabled: true, regex: /@startwbs[\s\S]*?@endwbs/gi },
    { name: "EBNF", enabled: true, regex: /@startebnf[\s\S]*?@endebnf/gi },
    { name: "JSON", enabled: true, regex: /@startjson[\s\S]*?@endjson/gi },
    { name: "YAML", enabled: true, regex: /@startyaml[\s\S]*?@endyaml/gi },
    { name: "SkinParam", enabled: true, regex: /skinparam\s+[\s\S]*?\}/gi },
];


function loadPlantUMLEncoder(doc, lib) {
    console.error("Libraries: ", { doc, lib });
    let libLocation = "";
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
    return window.plantumlEncoder.encode(htmlEscape(code));
}

function extractPlantUMLBlocks(text) {
    const matches = [];
    PLANTUML_BLOCK_MATCHERS.forEach(matcher => {
        if (matcher.enabled) {
            const found = text.match(matcher.regex);
            if (found) {
                found.forEach(block => matches.push({ type: matcher.name, code: block.trim(), encodedText: encodePlantUML(block.trim()) }));
            }
        }
    });
    return matches;
}


function renderPlantUMLInline(blocks, contentDiv) {
    contentDiv.innerHTML = '';
    blocks.forEach(({ code, encodedText }) => {
        const imageUrl = `https://www.plantuml.com/plantuml/png/${encodedText}`;

        const wrapper = document.createElement('div');
        wrapper.style.cssText = `font-family: monospace; font-size: 12px; white-space: pre-wrap;
      word-break: break-all; border: 1px solid #ccc; background: #fafafa;
      padding: 10px; margin-bottom: 30px;`;

        const title = document.createElement('div');
        title.textContent = 'PlantUML Diagnostics';
        title.style.cssText = 'font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px';

        const codeBlock = document.createElement('div');
        codeBlock.innerHTML = `<strong>Original Code:</strong><div style="margin:5px 0; color:#333;">${code}</div>`;

        const links = document.createElement('div');
        links.innerHTML = `
      <strong>Rendering Options:</strong>
      <div><a href="https://www.plantuml.com/plantuml/png/${encodedText}" target="_blank">Open as PNG</a></div>
      <div><a href="https://www.plantuml.com/plantuml/svg/${encodedText}" target="_blank">Open as SVG</a></div>
      <div><a href="https://www.plantuml.com/plantuml/txt/${encodedText}" target="_blank">View as Text</a></div>
      <div style="margin-top: 10px;"><strong>Download:</strong>
        <div><a href="${imageUrl}" download="diagram.png">Download PNG</a></div>
      </div>`;

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
        wrapper.append(codeBlock);
        wrapper.append(links);
        wrapper.append(img);
        contentDiv.append(wrapper);
    });
}

function renderSVG(code) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(code);
}

async function renderCode(code, type) {
    const contentDiv = popup?.querySelector('.hover-extension-content');
    if (!contentDiv) return;
    contentDiv.innerHTML = '<div style="text-align: center;">Loading...</div>';
    try {
        if (type === 'plantuml') {
            const blocks = extractPlantUMLBlocks(code);
            renderPlantUMLInline(blocks, contentDiv);
        } else if (type === 'svg') {
            const img = document.createElement('img');
            img.src = renderSVG(code);
            img.style.cssText = 'max-width: 100%; height: auto';
            contentDiv.innerHTML = '';
            contentDiv.appendChild(img);
        }
    } catch (err) {
        console.error('Render error:', JSON.stringify(err, null, 4));
        contentDiv.innerHTML = `<div style="color: red;">Error: ${err.message}</div>`;
    }
}
function htmlEscape(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
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
    if (now - lastHoverTime < HOVER_DEBOUNCE_TIME) return;

    const target = event.target;
    if (popup?.contains(target)) return;

    let codeText = '', isCode = false;
    if (['CODE', 'PRE'].includes(target.tagName) || target.classList.contains('language-plantuml') || target.classList.contains('language-svg')) {
        codeText = target.textContent;
        isCode = true;
    } else if (target.parentElement && ['CODE', 'PRE'].includes(target.parentElement.tagName)) {
        codeText = target.parentElement.textContent;
        isCode = true;
    }

    if (isCode) {
        currentHoverElement = target;
        lastHoverTime = now;
        showPopup(event.clientX, event.clientY);
        if (isPlantUML(codeText)) await renderCode(codeText, 'plantuml');
        else if (isSVG(codeText)) await renderCode(codeText, 'svg');
    }
}

async function initialize(doc, lib) {
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

initialize(null, null);
