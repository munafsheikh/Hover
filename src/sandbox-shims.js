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

const requestKey = (request) =>
    typeof request === 'string' ? request : request.url;

class MemoryCache {
    #entries = new Map();

    async match(request) {
        return this.#entries.get(requestKey(request))?.clone();
    }

    async matchAll(request) {
        if (request === undefined) {
            return [...this.#entries.values()].map((r) => r.clone());
        }
        const hit = await this.match(request);
        return hit ? [hit] : [];
    }

    async put(request, response) {
        this.#entries.set(requestKey(request), response.clone());
    }

    async add(request) {
        await this.put(request, await fetch(request));
    }

    async addAll(requests) {
        await Promise.all(requests.map((r) => this.add(r)));
    }

    async delete(request) {
        return this.#entries.delete(requestKey(request));
    }

    async keys() {
        return [...this.#entries.keys()].map((url) => new Request(url));
    }
}

class MemoryCacheStorage {
    #caches = new Map();

    async open(name) {
        if (!this.#caches.has(name)) this.#caches.set(name, new MemoryCache());
        return this.#caches.get(name);
    }

    async has(name) {
        return this.#caches.has(name);
    }

    async delete(name) {
        return this.#caches.delete(name);
    }

    async keys() {
        return [...this.#caches.keys()];
    }

    async match(request) {
        for (const cache of this.#caches.values()) {
            const hit = await cache.match(request);
            if (hit) return hit;
        }
        return undefined;
    }
}

if (storageDenied('caches')) define('caches', new MemoryCacheStorage());
