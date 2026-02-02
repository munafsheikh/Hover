import { BaseContentHandler } from '../handlers/BaseContentHandler';

export class ContentHandlerRegistry {
    static instance;
    handlers;

    constructor() {
        this.handlers = new Map();
    }

    static getInstance() {
        if (!ContentHandlerRegistry.instance) {
            ContentHandlerRegistry.instance = new ContentHandlerRegistry();
        }
        return ContentHandlerRegistry.instance;
    }

    register(handler) {
        this.handlers.set(handler.type, handler);
    }

    getHandler(content) {
        for (const handler of this.handlers.values()) {
            if (handler.canHandle(content)) {
                return handler;
            }
        }
        return null;
    }

    getAllClassIdentifiers() {
        return Array.from(this.handlers.values())
            .flatMap(handler => handler.getClassIdentifiers());
    }
}
