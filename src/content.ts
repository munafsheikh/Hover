import { Logger } from './utils/Logger';
import { StringMatcher } from './utils/StringMatcher';

class ContentScript {
    private logger: Logger;
    // ... other properties ...

    constructor() {
        this.logger = Logger.getInstance();
        this.popup = new Popup();
        this.registry = ContentHandlerRegistry.getInstance();
        this.logger.info('ContentScript initialized');
        this.registerHandlers();
    }

    private async loadPlantUMLEncoder(doc?: Document, lib?: string): Promise<void> {
        const libLocation = lib || 'lib/plantuml-encoder.min.js';
        const document = doc || window.document;

        this.logger.debug('Loading PlantUML encoder from:', libLocation);

        return new Promise((resolve, reject) => {
            if ((window as any).plantumlEncoder) {
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

    private async loadHighlightJS(): Promise<void> {
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

    private handleMouseOver = async (event: MouseEvent): Promise<void> => {
        const now = Date.now();
        if (now - this.lastHoverTime < this.HOVER_DEBOUNCE_TIME) {
            this.logger.debug('Debouncing hover event');
            return;
        }

        const target = event.target as Element;
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

    async initialize(doc?: Document, lib?: string): Promise<void> {
        this.logger.info('Initializing ContentScript');
        try {
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

    private async handleSettingsUpdate(settings: any): Promise<void> {
        this.logger.debug('Updating settings:', settings);
        // Implement settings update logic
    }

    private async renderPlantUMLInline(blocks: ContentBlock[], contentDiv: HTMLDivElement): Promise<void> {
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

                const imageUrl = `https://www.plantuml.com/plantuml/svg/${block.encodedText}`;
                this.logger.debug('Generated image URL:', imageUrl);
                
                wrapper.innerHTML = `
                    <div style="font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px">
                        PlantUML Preview
                    </div>
                    <img src="${imageUrl}" style="max-width: 100%; height: auto; border: 1px solid #ddd; margin-top: 15px">
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

    private extractBlocks(text: string): ContentBlock[] {
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
        }).filter((block): block is ContentBlock => block !== null);
    }
} 