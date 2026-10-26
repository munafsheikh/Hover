/**
 * Base class for content handlers registered with ContentHandlerRegistry.
 * A handler detects a content type and turns it into renderable blocks.
 */
export class BaseContentHandler {
    /**
     * @param {string} type handler id
     * @param {string} settingKey settings flag that enables this handler
     */
    constructor(type, settingKey) {
        this.type = type;
        this.settingKey = settingKey;
    }

    canHandle() {
        return false;
    }

    getClassIdentifiers() {
        return [];
    }

    /**
     * @returns {{kind: 'plantuml'|'svg', code: string}[]}
     */
    toBlocks() {
        return [];
    }
}
