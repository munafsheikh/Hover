/**
 * Hover - storage shims for the sandboxed renderer page
 * Loaded before the CheerpJ runtime. The sandbox has an opaque origin, so
 * IndexedDB and localStorage are denied; CheerpJ keeps its virtual
 * filesystem in IndexedDB and stalls at start-up without it. Replace both
 * with in-memory implementations (state is rebuilt per offscreen session).
 */
import * as fakeIndexedDB from 'fake-indexeddb';

function storageDenied(name) {
    try {
        if (name === 'indexedDB') {
            window.indexedDB.open('hover-probe');
        } else {
            void window[name];
        }
        return false;
    } catch {
        return true;
    }
}

function define(name, value) {
    Object.defineProperty(window, name, {
        value,
        configurable: true,
        writable: true
    });
}

if (storageDenied('indexedDB')) {
    for (const [name, value] of Object.entries(fakeIndexedDB)) {
        define(name, value);
    }
}

class MemoryStorage {
    #items = new Map();

    get length() {
        return this.#items.size;
    }

    key(index) {
        return [...this.#items.keys()][index] ?? null;
    }

    getItem(key) {
        return this.#items.has(String(key))
            ? this.#items.get(String(key))
            : null;
    }

    setItem(key, value) {
        this.#items.set(String(key), String(value));
    }

    removeItem(key) {
        this.#items.delete(String(key));
    }

    clear() {
        this.#items.clear();
    }
}

for (const name of ['localStorage', 'sessionStorage']) {
    if (storageDenied(name)) define(name, new MemoryStorage());
}
