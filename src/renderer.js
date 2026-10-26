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
for (const level of ['log', 'warn', 'error']) {
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
