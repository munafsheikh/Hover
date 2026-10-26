/**
 * Hover - plantuml.js renderer page
 * Runs PlantUML in-browser via CheerpJ. Hosted as a static site (GitHub
 * Pages by default) and embedded by the extension's offscreen document:
 * CheerpJ needs a real origin, which MV3 sandbox pages cannot have, and
 * keeping its remote runtime out of the extension package keeps the
 * package free of remote code. Diagram text never leaves the browser.
 */
/* global plantuml, cjCall */
import { parseSvgResult } from './utils/PlantUMLJs';

// CheerpJ maps /app/ to the origin root; the site may live under a sub-path
const PLANTUML_PATH = `/app${location.pathname.replace(/[^/]*$/, '')}plantuml`;

const isEmbedded = window.parent !== window;
let requesterOrigin = null;
const pendingLog = [];

function send(message, origin) {
    if (isEmbedded) window.parent.postMessage(message, origin);
}

// Forward console output and errors to the embedding page, which attaches
// recent lines to failed renders. Held back until a requester is known.
function trace(...parts) {
    const line = parts
        .map((p) =>
            p instanceof Error ? `${p.name}: ${p.message}` : String(p)
        )
        .join(' ')
        .slice(0, 500);
    if (requesterOrigin) send({ log: line }, requesterOrigin);
    else pendingLog.push(line);
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
    if (!isEmbedded || event.source !== window.parent) return;

    const { id, code } = event.data || {};
    if (typeof id !== 'number' || typeof code !== 'string') return;

    if (!requesterOrigin) {
        requesterOrigin = event.origin;
        pendingLog
            .splice(0)
            .forEach((line) => send({ log: line }, requesterOrigin));
    }
    const origin = event.origin;

    // CheerpJ is single-threaded; serialise renders
    queue = queue
        .then(() => renderSvg(code))
        .catch((error) => ({ error: error?.message || String(error) }))
        .then((result) => send({ id, ...result }, origin));
});

// Carries no data, so any embedder may see it
send({ ready: true }, '*');
