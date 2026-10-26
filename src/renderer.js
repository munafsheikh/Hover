/**
 * Hover - plantuml.js renderer (sandboxed page)
 * Runs PlantUML in-browser via CheerpJ. Lives in a sandbox because CheerpJ
 * needs its remote runtime and dynamic code evaluation, both blocked by the
 * MV3 extension page CSP.
 */
/* global plantuml, cjCall */
import { parseSvgResult } from './utils/PlantUMLJs';

const PLANTUML_PATH = '/app/plantuml';

// Forward console output and errors to the offscreen document, which
// attaches recent lines to failed renders (the sandbox is hard to inspect)
function trace(...parts) {
    const line = parts
        .map((p) =>
            p instanceof Error ? `${p.name}: ${p.message}` : String(p)
        )
        .join(' ')
        .slice(0, 500);
    window.parent.postMessage({ log: line }, '*');
}
for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
    const original = console[level].bind(console);
    console[level] = (...parts) => {
        original(...parts);
        trace(`[${level}]`, ...parts);
    };
}
window.addEventListener('error', (e) =>
    trace('[uncaught]', e.message, e.filename || '', e.lineno || '')
);
window.addEventListener('unhandledrejection', (e) =>
    trace('[unhandled rejection]', e.reason)
);

// Time each CheerpJ start-up stage
function traced(name) {
    const fn = window[name];
    if (typeof fn !== 'function') return;
    window[name] = async (...args) => {
        const started = Date.now();
        trace(`${name} start`);
        try {
            const result = await fn(...args);
            trace(`${name} done in ${Date.now() - started}ms`);
            return result;
        } catch (error) {
            trace(`${name} failed`, error);
            throw error;
        }
    };
}
traced('cheerpjInit');
traced('cheerpjRunMain');

// Network and storage diagnostics: failed requests, plus a periodic list of
// requests still pending (a hung start-up shows up here)
const inflight = new Map();
let requestSeq = 0;
function track(url, done) {
    const key = requestSeq++;
    inflight.set(key, { url: String(url).slice(-120), started: Date.now() });
    return (status) => {
        inflight.delete(key);
        if (!done(status)) trace('[net]', status, url);
    };
}
const originalFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
    const finish = track(input?.url || input, (s) => s >= 200 && s < 400);
    return originalFetch(input, init).then(
        (res) => {
            finish(res.status);
            return res;
        },
        (error) => {
            finish(`fetch error ${error?.message}`);
            throw error;
        }
    );
};
const originalOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    const finish = track(url, (s) => s >= 200 && s < 400);
    this.addEventListener('loadend', () => finish(this.status || 'xhr error'));
    return originalOpen.call(this, method, url, ...rest);
};
setInterval(() => {
    if (!inflight.size) return;
    const now = Date.now();
    const oldest = [...inflight.values()]
        .slice(0, 5)
        .map((r) => `${r.url} (${Math.round((now - r.started) / 1000)}s)`);
    trace(`[net] ${inflight.size} pending:`, oldest.join(', '));
}, 10000);

function probeStorage() {
    trace('[env] location', location.href, 'origin', String(self.origin));
    try {
        const req = indexedDB.open('hover-probe');
        req.onsuccess = () => trace('[env] indexedDB ok');
        req.onerror = () => trace('[env] indexedDB error', req.error);
    } catch (error) {
        trace('[env] indexedDB throws', error);
    }
    try {
        caches.keys().then(
            () => trace('[env] caches ok'),
            (error) => trace('[env] caches error', error)
        );
    } catch (error) {
        trace('[env] caches throws', error);
    }
    try {
        localStorage.getItem('x');
        trace('[env] localStorage ok');
    } catch (error) {
        trace('[env] localStorage throws', error);
    }
}
probeStorage();

let initPromise = null;
let queue = Promise.resolve();

function ensureInitialized() {
    if (!initPromise) {
        initPromise = plantuml.initialize(PLANTUML_PATH).catch((error) => {
            initPromise = null;
            throw error;
        });
    }
    return initPromise;
}

async function renderSvg(code) {
    await ensureInitialized();
    const result = await cjCall(
        'com.plantuml.wasm.v1.Svg',
        'convert',
        'light',
        code
    );
    trace('render done');
    return parseSvgResult(result);
}

window.addEventListener('message', (event) => {
    if (event.source !== window.parent) return;

    const { id, code } = event.data || {};
    if (typeof id !== 'number' || typeof code !== 'string') return;

    // CheerpJ is single-threaded; serialise renders
    queue = queue
        .then(() => renderSvg(code))
        .catch((error) => ({ error: error?.message || String(error) }))
        .then((result) => window.parent.postMessage({ id, ...result }, '*'));
});

window.parent.postMessage({ ready: true }, '*');
