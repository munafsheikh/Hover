import { Logger } from './utils/Logger';
import { ContentHandlerRegistry } from './registry/ContentHandlers';
import { JsonHandler, PlantUMLHandler, SvgHandler } from './handlers';
import { HoverDebouncer } from './utils/HoverDebouncer';
import { Popup } from './ui/Popup';
import {
    ENGINE_PLANTUML_JS,
    RENDER_ACTION,
    svgToDataUrl
} from './utils/PlantUMLJs';

const DEFAULT_SETTINGS = {
    enabled: true,
    renderPlantUML: true,
    renderSVG: true,
    debounceTime: 15000
};

const DEFAULT_SERVER = 'https://www.plantuml.com/plantuml';
const BASE_SELECTORS = ['pre', 'code', 'textarea'];

export class ContentScript {
    logger;
    settings = { ...DEFAULT_SETTINGS };
    advancedSettings = {};

    /**
     * Cache of generated diagrams keyed by encoded UML text.
     * Each entry stores the data URL and the time it was cached.
     */
    static diagramCache = new Map();

    static CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

    constructor() {
        this.logger = Logger.getInstance();
        this.registry = ContentHandlerRegistry.getInstance();
        this.debouncer = new HoverDebouncer({
            cooldown: DEFAULT_SETTINGS.debounceTime
        });
        this.popup = new Popup({ onClose: this.handlePopupClose });
        this.renderToken = 0;
        this.styleElement = null;
        this.registerHandlers();
        this.logger.info('ContentScript initialized');
    }

    registerHandlers() {
        this.registry.register(new PlantUMLHandler());
        this.registry.register(new SvgHandler());
        this.registry.register(new JsonHandler());
    }

    /**
     * Clear the in-memory diagram cache.
     */
    static clearDiagramCache() {
        this.diagramCache.clear();
    }

    async getDiagramDataUrl(encodedText, code) {
        const cached = ContentScript.diagramCache.get(encodedText);
        if (cached && Date.now() - cached.timestamp < ContentScript.CACHE_TTL) {
            return cached.dataUrl;
        }

        const plantumlSettings = this.advancedSettings?.plantuml || {};
        const engine = plantumlSettings.engine || ENGINE_PLANTUML_JS;
        let dataUrl = null;

        if (engine === ENGINE_PLANTUML_JS && code) {
            try {
                dataUrl = await this.renderWithPlantUMLJs(code);
            } catch (error) {
                if (plantumlSettings.fallbackToServer === false) {
                    throw error;
                }
                this.logger.warn(
                    'plantuml.js render failed, falling back to server:',
                    error.message
                );
            }
        }

        if (!dataUrl) {
            dataUrl = await this.fetchFromServer(encodedText);
        }

        ContentScript.diagramCache.set(encodedText, {
            dataUrl,
            timestamp: Date.now()
        });

        return dataUrl;
    }

    /**
     * Render via the extension's offscreen plantuml.js renderer.
     */
    async renderWithPlantUMLJs(code) {
        this.logger.debug('Rendering diagram with plantuml.js');
        const response = await chrome.runtime.sendMessage({
            action: RENDER_ACTION,
            code
        });
        if (!response?.svg) {
            throw new Error(response?.error || 'No response from renderer');
        }
        return svgToDataUrl(response.svg);
    }

    async fetchFromServer(encodedText) {
        // Get PlantUML server URL and format from settings
        const serverUrl =
            this.advancedSettings?.plantuml?.server || DEFAULT_SERVER;
        const format = this.advancedSettings?.plantuml?.format || 'svg';

        // Construct URL with configurable server
        const url = `${serverUrl}/${format}/${encodedText}`;
        this.logger.debug('Fetching diagram from:', url);

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch diagram: ${response.status}`);
        }

        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    getDiagramLinks(encodedText) {
        const serverUrl =
            this.advancedSettings?.plantuml?.server || DEFAULT_SERVER;
        return [
            ['Open as PNG', `${serverUrl}/png/${encodedText}`],
            ['Open as SVG', `${serverUrl}/svg/${encodedText}`],
            ['View as Text', `${serverUrl}/txt/${encodedText}`]
        ];
    }

    /**
     * Resolve the code block element for a hovered node.
     */
    findCodeRoot(node) {
        const target = node?.nodeType === 1 ? node : node?.parentElement;
        if (!target || this.popup.contains(target)) return null;

        const selectors = [
            ...BASE_SELECTORS,
            ...this.registry.getAllClassIdentifiers().map((cls) => `.${cls}`)
        ];
        const custom = this.advancedSettings?.general?.triggerSelector;

        let root = target.closest(selectors.join(','));
        if (!root && custom) {
            try {
                root = target.closest(custom);
            } catch {
                this.logger.warn('Invalid trigger selector:', custom);
            }
        }
        return root ? root.closest('pre') || root : null;
    }

    getCodeText(root) {
        return root.tagName === 'TEXTAREA' ? root.value : root.textContent;
    }

    getEnabledHandler(text) {
        const handler = this.registry.getHandler(text || '');
        if (!handler || this.settings[handler.settingKey] === false) {
            return null;
        }
        return handler;
    }

    handleMouseOver = (event) => {
        if (this.settings.enabled === false) return;

        const root = this.findCodeRoot(event.target);
        if (!root) return;

        const text = this.getCodeText(root);
        const handler = this.getEnabledHandler(text);
        if (!handler) return;

        const { clientX, clientY } = event;
        if (
            this.debouncer.request(root, () =>
                this.showPreview(handler, text, clientX, clientY)
            )
        ) {
            this.logger.debug('Scheduled preview:', handler.type);
        }
    };

    handleMouseOut = (event) => {
        const root = this.findCodeRoot(event.target);
        if (root && !root.contains(event.relatedTarget)) {
            this.debouncer.cancel(root);
        }
    };

    handleClick = (event) => {
        if (this.popup.isVisible() && !this.popup.contains(event.target)) {
            this.popup.hide(true);
        }
    };

    handlePopupClose = () => {
        this.renderToken++;
        this.debouncer.dismiss();
    };

    async showPreview(handler, text, x, y) {
        const token = ++this.renderToken;
        const general = this.advancedSettings?.general || {};
        this.popup.setSize(general.popupWidth, general.popupHeight);
        this.popup.show(x, y);

        const contentDiv = this.popup.getContentDiv();
        contentDiv.replaceChildren(
            Object.assign(document.createElement('div'), {
                textContent: 'Loading...',
                style: 'text-align: center'
            })
        );

        const sections = await Promise.all(
            handler.toBlocks(text).map((block) => this.renderBlock(block))
        );
        if (token !== this.renderToken) return; // superseded or closed

        contentDiv.replaceChildren(...sections);
    }

    async renderBlock(block) {
        const wrapper = document.createElement('div');
        wrapper.className = 'hover-extension-block';
        wrapper.style.cssText = `font-family: monospace; font-size: 12px;
            border: 1px solid #ccc; background: #fafafa; padding: 10px;
            margin-bottom: 15px;`;

        const title = document.createElement('div');
        title.style.cssText =
            'font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px';
        title.textContent =
            block.kind === 'svg' ? 'SVG Preview' : 'PlantUML Preview';
        wrapper.appendChild(title);

        try {
            let src;
            let links = [];
            if (block.kind === 'svg') {
                src = svgToDataUrl(block.code);
            } else {
                if (!window.plantumlEncoder) {
                    throw new Error('PlantUML encoder not loaded');
                }
                const encodedText = window.plantumlEncoder.encode(block.code);
                src = await this.getDiagramDataUrl(encodedText, block.code);
                links = this.getDiagramLinks(encodedText);
            }

            const img = document.createElement('img');
            img.className = 'hover-extension-diagram';
            img.src = src;
            img.style.cssText =
                'max-width: 100%; height: auto; border: 1px solid #ddd; background: white';
            img.onerror = () => {
                img.replaceWith(this.errorElement('Failed to load diagram'));
            };
            wrapper.appendChild(img);

            if (links.length) {
                const linkRow = document.createElement('div');
                linkRow.style.cssText =
                    'display: flex; gap: 10px; margin-top: 8px; font-family: Arial, sans-serif;';
                for (const [label, href] of links) {
                    linkRow.appendChild(
                        Object.assign(document.createElement('a'), {
                            textContent: label,
                            href,
                            target: '_blank',
                            rel: 'noopener noreferrer'
                        })
                    );
                }
                wrapper.appendChild(linkRow);
            }
        } catch (error) {
            this.logger.error('Error rendering block:', error);
            wrapper.appendChild(
                this.errorElement(`Error rendering diagram: ${error.message}`)
            );
        }

        const details = document.createElement('details');
        details.style.marginTop = '8px';
        const summary = document.createElement('summary');
        summary.textContent = 'Source';
        const pre = document.createElement('pre');
        pre.style.cssText = 'white-space: pre-wrap; word-break: break-all;';
        pre.textContent = block.code;
        details.append(summary, pre);
        wrapper.appendChild(details);

        return wrapper;
    }

    errorElement(message) {
        return Object.assign(document.createElement('div'), {
            textContent: message,
            style: 'color: red'
        });
    }

    applySettings(settings) {
        this.settings = { ...DEFAULT_SETTINGS, ...(settings || {}) };
        this.debouncer.setCooldown(Number(this.settings.debounceTime));
    }

    applyAdvancedSettings(advancedSettings) {
        this.advancedSettings = advancedSettings || {};
        const css = this.advancedSettings.general?.customCSS || '';
        if (css && !this.styleElement) {
            this.styleElement = document.createElement('style');
            document.head.appendChild(this.styleElement);
        }
        if (this.styleElement) this.styleElement.textContent = css;
    }

    async loadSettings() {
        const data = await chrome.storage.sync.get([
            'settings',
            'advancedSettings'
        ]);
        this.applySettings(data.settings);
        this.applyAdvancedSettings(data.advancedSettings);
        this.logger.info('Settings loaded:', {
            settings: this.settings,
            advancedSettings: this.advancedSettings
        });
    }

    async initialize() {
        this.logger.info('Initializing ContentScript');
        try {
            await this.loadSettings();
        } catch (error) {
            this.logger.error(
                'Failed to load settings, using defaults:',
                error
            );
        }

        document.addEventListener('mouseover', this.handleMouseOver);
        document.addEventListener('mouseout', this.handleMouseOut);
        document.addEventListener('click', this.handleClick, true);

        chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== 'sync') return;
            if (changes.settings) {
                this.applySettings(changes.settings.newValue);
            }
            if (changes.advancedSettings) {
                this.applyAdvancedSettings(changes.advancedSettings.newValue);
                // Server/engine may have changed: force re-render
                ContentScript.clearDiagramCache();
            }
        });

        chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
            if (msg.action === 'updateSettings') {
                this.applySettings(msg.settings);
            } else if (msg.action === 'updateAdvancedSettings') {
                this.applyAdvancedSettings(msg.advancedSettings);
                ContentScript.clearDiagramCache();
            } else if (msg.action === 'clearCache') {
                ContentScript.clearDiagramCache();
            } else {
                return false;
            }
            sendResponse({ success: true });
            return false;
        });

        this.logger.info('ContentScript initialization complete');
    }
}

if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
    new ContentScript().initialize();
}
