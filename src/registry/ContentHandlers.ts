import { BaseContentHandler } from '../handlers/BaseContentHandler';

export class ContentHandlerRegistry {
    private static instance: ContentHandlerRegistry;
    private handlers: Map<string, BaseContentHandler>;

    private constructor() {
        this.handlers = new Map();
    }

    static getInstance(): ContentHandlerRegistry {
        if (!ContentHandlerRegistry.instance) {
            ContentHandlerRegistry.instance = new ContentHandlerRegistry();
        }
        return ContentHandlerRegistry.instance;
    }

    register(handler: BaseContentHandler): void {
        this.handlers.set(handler.type, handler);
    }

    getHandler(content: string): BaseContentHandler | null {
        for (const handler of this.handlers.values()) {
            if (handler.canHandle(content)) {
                return handler;
            }
        }
        return null;
    }

    getAllClassIdentifiers(): string[] {
        return Array.from(this.handlers.values())
            .flatMap(handler => handler.getClassIdentifiers());
    }
} 