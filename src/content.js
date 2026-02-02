import { Logger } from './utils/Logger';
import { StringMatcher } from './utils/StringMatcher';

class ContentScript {
    logger;
    settings = null;
    advancedSettings = null;

    /**
     * Cache of generated diagrams keyed by encoded UML text.
     * Each entry stores the data URL and the time it was cached.
     */
    static diagramCache = new Map();

    static CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

    constructor() {
        this.logger = Logger.getInstance();
        this.popup = new Popup();
        this.registry = ContentHandlerRegistry.getInstance();
        this.logger.info('ContentScript initialized');
        this.registerHandlers();
    }

    /**
     * Clear the in-memory diagram cache.
     */
    static clearDiagramCache() {
        this.diagramCache.clear();
    }

    /**
     * Retrieve a diagram image for the given encoded UML. Uses an in-memory
     * cache to avoid repeated network requests to the PlantUML server.
     */
    async getDiagramDataUrl(encodedText) {
        const cached = ContentScript.diagramCache.get(encodedText);
        if (cached && Date.now() - cached.timestamp < ContentScript.CACHE_TTL) {
            return cached.dataUrl;
        }

        // Get PlantUML server URL and format from settings
        const serverUrl = this.advancedSettings?.plantuml?.server || 'https://www.plantuml.com/plantuml';
        const format = this.advancedSettings?.plantuml?.format || 'svg';

        // Construct URL with configurable server
        const url = `${serverUrl}/${format}/${encodedText}`;
        this.logger.debug('Fetching diagram from:', url);

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch diagram: ${response.status}`);
        }

        const blob = await response.blob();
        const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        ContentScript.diagramCache.set(encodedText, {
            dataUrl,
            timestamp: Date.now()
        });

        return dataUrl;
    }

    async loadPlantUMLEncoder(doc, lib) {
        const libLocation = lib || 'lib/plantuml-encoder.min.js';
        const document = doc || window.document;

        this.logger.debug('Loading PlantUML encoder from:', libLocation);

        return new Promise((resolve, reject) => {
            if (window.plantumlEncoder) {
                this.logger.debug('PlantUML encoder already loaded');
                return resolve();
            }

            const script = document.createElement('script');
            script.src = chrome.runtime?.getURL
                ? chrome.runtime.getURL(libLocation)
                : libLocation;

            script.onload = () => {
                this.logger.info('PlantUML encoder loaded successfully');
                resolve();
            };

            script.onerror = (error) => {
                this.logger.error('Failed to load PlantUML encoder:', error);
                reject(error);
            };

            document.head.appendChild(script);
        });
    }

    async loadHighlightJS() {
        this.logger.debug('Loading highlight.js');
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('lib/highlight.min.js');

        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = chrome.runtime.getURL('lib/highlight.min.css');

        document.head.appendChild(css);

        return new Promise((resolve, reject) => {
            script.onload = () => {
                this.logger.info('highlight.js loaded');
                resolve();
            };
            script.onerror = (error) => {
                this.logger.error('Failed to load highlight.js:', error);
                reject(error);
            };
            document.head.appendChild(script);
        });
    }

    handleMouseOver = async (event) => {
        const now = Date.now();
        if (now - this.lastHoverTime < this.HOVER_DEBOUNCE_TIME) {
            this.logger.debug('Debouncing hover event');
            return;
        }

        const target = event.target;
        if (!target || this.popup.getContentDiv()?.contains(target)) {
            this.logger.debug('Invalid target or hovering over popup');
            return;
        }

        let codeText = '', isCode = false;

        // Check if element matches any supported type
        if (['CODE', 'PRE'].includes(target.tagName) ||
            this.registry.getAllClassIdentifiers().some(cls => target.classList.contains(cls))) {
            codeText = target.textContent || '';
            isCode = true;
            this.logger.debug('Found code element:', {
                tagName: target.tagName,
                classes: target.classList.toString()
            });
        } else if (target.parentElement && ['CODE', 'PRE'].includes(target.parentElement.tagName)) {
            codeText = target.parentElement.textContent || '';
            isCode = true;
            this.logger.debug('Found code in parent element');
        }

        if (isCode && this.registry.getHandler(codeText)) {
            this.logger.debug('Processing code:', { length: codeText.length });
            this.currentHoverElement = target;
            this.lastHoverTime = now;
            this.popup.show(event.clientX, event.clientY);
            await this.renderCode(codeText);
        }
    };

    async initialize(doc, lib) {
        this.logger.info('Initializing ContentScript');
        try {
            // Load settings from storage
            await this.loadSettings();

            await this.loadPlantUMLEncoder(doc, lib);
            await this.loadHighlightJS();

            document.addEventListener('mouseover', this.handleMouseOver);
            document.addEventListener('mouseout', this.handleMouseOut);
            document.addEventListener('click', this.handleClick);

            // Handle extension messages with proper response
            chrome.runtime?.onMessage?.addListener((msg, sender, sendResponse) => {
                this.logger.debug('Received message:', msg);

                // Handle the message asynchronously
                (async () => {
                    try {
                        if (msg.action === 'updateSettings') {
                            // Handle settings update
                            await this.handleSettingsUpdate(msg.settings);
                        } else if (msg.action === 'updateAdvancedSettings') {
                            await this.handleAdvancedSettingsUpdate(msg.advancedSettings);
                        } else if (msg.action === 'clearCache') {
                            ContentScript.clearDiagramCache();
                        }
                        sendResponse({ success: true });
                    } catch (error) {
                        this.logger.error('Error handling message:', error);
                        sendResponse({ success: false, error: error.message });
                    }
                })();

                return true; // Indicate we will send response asynchronously
            });

            this.logger.info('ContentScript initialization complete');
        } catch (err) {
            this.logger.error('Initialize error:', err);
            throw err;
        }
    }

    async loadSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['settings', 'advancedSettings'], (data) => {
                this.settings = data.settings || {};
                this.advancedSettings = data.advancedSettings || {};
                this.logger.info('Settings loaded:', { settings: this.settings, advancedSettings: this.advancedSettings });
                resolve();
            });
        });
    }

    async handleSettingsUpdate(settings) {
        this.logger.debug('Updating settings:', settings);
        this.settings = settings;
    }

    async handleAdvancedSettingsUpdate(advancedSettings) {
        this.logger.debug('Updating advanced settings:', advancedSettings);
        this.advancedSettings = advancedSettings;
        // Clear cache when settings change to force re-fetch with new server
        ContentScript.clearDiagramCache();
    }

    async renderPlantUMLInline(blocks, contentDiv) {
        this.logger.debug('Rendering PlantUML blocks:', blocks.length);
        contentDiv.innerHTML = '';

        for (const block of blocks) {
            try {
                const wrapper = document.createElement('div');
                wrapper.style.cssText = `
                    font-family: monospace;
                    font-size: 12px;
                    white-space: pre-wrap;
                    word-break: break-all;
                    border: 1px solid #ccc;
                    background: #fafafa;
                    padding: 10px;
                    margin-bottom: 30px;
                `;

                const imgSrc = await this.getDiagramDataUrl(block.encodedText);
                this.logger.debug('Using diagram source:', imgSrc.substring(0, 50));

                wrapper.innerHTML = `
                    <div style="font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px">
                        PlantUML Preview
                    </div>
                    <img src="${imgSrc}" style="max-width: 100%; height: auto; border: 1px solid #ddd; margin-top: 15px">
                    <pre><code class="language-text">${this.htmlEscape(block.code)}</code></pre>
                `;

                const img = wrapper.querySelector('img');
                if (img) {
                    img.onerror = (e) => {
                        this.logger.error('Image load error:', e);
                        img.style.display = 'none';
                        wrapper.appendChild(Object.assign(document.createElement('div'), {
                            textContent: 'Failed to load diagram',
                            style: 'color: red'
                        }));
                    };
                }

                contentDiv.appendChild(wrapper);
            } catch (error) {
                this.logger.error('Error rendering block:', error);
                contentDiv.innerHTML += `<div style="color: red">Error rendering diagram: ${error.message}</div>`;
            }
        }
    }

    extractBlocks(text) {
        this.logger.debug('Extracting blocks from text');
        const matches = StringMatcher.findMatches(text);

        return matches.map(match => {
            const handler = this.registry.getHandler(match.content);
            if (!handler) {
                this.logger.debug(`No handler found for type: ${match.type}`);
                return null;
            }

            const wrappedContent = handler.wrap(match.content);
            const encodedText = PlantUMLCache.get(wrappedContent) ||
                this.encodePlantUML(wrappedContent);

            if (!PlantUMLCache.get(wrappedContent)) {
                PlantUMLCache.set(wrappedContent, encodedText);
            }

            return {
                type: match.type,
                code: wrappedContent,
                encodedText
            };
        }).filter(block => block !== null);
    }
}
