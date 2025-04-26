/**
 * Jest test setup file for Hover extension
 */

// Mock chrome API
global.chrome = {
    runtime: {
        onMessage: {
            addListener: jest.fn(),
            removeListener: jest.fn(),
        },
        sendMessage: jest.fn().mockImplementation((message, callback) => {
            if (callback) {
                callback({});
            }
            return { catch: jest.fn() };
        }),
        onInstalled: {
            addListener: jest.fn(),
        },
        openOptionsPage: jest.fn(),
    },
    storage: {
        sync: {
            get: jest.fn().mockImplementation((key, callback) => {
                if (callback) {
                    callback({});
                }
            }),
            set: jest.fn().mockImplementation((obj, callback) => {
                if (callback) {
                    callback();
                }
            }),
        },
    },
    tabs: {
        query: jest.fn().mockImplementation((queryInfo, callback) => {
            if (callback) {
                callback([]);
            }
        }),
        sendMessage: jest.fn().mockReturnValue({ catch: jest.fn() }),
    },
    action: {
        onClicked: {
            addListener: jest.fn(),
        },
    },
};

// Mock TextEncoder/TextDecoder for PlantUML encoding
global.TextEncoder = class TextEncoder {
    encode(text) {
        return new Uint8Array(Array.from(text).map(char => char.charCodeAt(0)));
    }
};

// Mock CompressionStream for PlantUML encoding
global.CompressionStream = class CompressionStream {
    constructor() {
        this.readable = {
            getReader: () => ({
                read: async () => ({ value: new Uint8Array([]), done: true }),
            }),
        };
        this.writable = {
            getWriter: () => ({
                write: jest.fn(),
                close: jest.fn(),
            }),
        };
    }
};

// Silence console errors during tests
global.console.error = jest.fn();

// Set up document for content script testing
if (typeof document === 'undefined') {
    global.document = {
        createElement: jest.fn().mockImplementation(tag => ({
            style: {},
            className: '',
            addEventListener: jest.fn(),
            appendChild: jest.fn(),
            querySelector: jest.fn(),
            setAttribute: jest.fn(),
            tagName: tag.toUpperCase(),
        })),
        querySelector: jest.fn(),
        querySelectorAll: jest.fn().mockReturnValue([]),
        body: {
            appendChild: jest.fn(),
        },
        head: {
            appendChild: jest.fn(),
        },
        addEventListener: jest.fn(),
    };

    global.window = {
        addEventListener: jest.fn(),
        innerWidth: 1024,
        innerHeight: 768,
    };
} 