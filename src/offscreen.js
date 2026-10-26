/**
 * Hover - Offscreen document
 * Embeds the plantuml.js renderer page once for the whole extension and
 * relays render requests from the background service worker.
 */
import { OFFSCREEN_TARGET, RENDER_ACTION } from './utils/PlantUMLJs';

const RENDER_TIMEOUT = 120000; // first render downloads the CheerpJ runtime
const READY_TIMEOUT = 15000; // renderer page unreachable: fail fast
const LOG_LINES = 200;

const pending = new Map();
const log = [];
let nextId = 0;
let renderer = null; // { url, origin, frame, ready }

function failPending(error) {
    for (const [id, entry] of pending) {
        clearTimeout(entry.timer);
        entry.resolve({ error, log: [...log] });
        pending.delete(id);
    }
}

function loadRenderer(url) {
    if (renderer?.url === url) return renderer;

    renderer?.frame.remove();
    failPending('Renderer changed');
    log.length = 0;

    const frame = document.createElement('iframe');
    const current = { url, origin: new URL(url).origin, frame };
    current.ready = new Promise((resolve, reject) => {
        current.resolveReady = resolve;
        const fail = () => reject(new Error(`Renderer did not load: ${url}`));
        setTimeout(fail, READY_TIMEOUT);
        // The page posts "ready" before its load event; an error page
        // (offline, 404) loads without it
        frame.addEventListener('load', () => setTimeout(fail, 1000));
    });
    current.ready.catch(() => {
        // Retry on the next request
        if (renderer === current) {
            frame.remove();
            renderer = null;
        }
    });

    frame.src = url;
    document.body.appendChild(frame);
    renderer = current;
    return current;
}

window.addEventListener('message', (event) => {
    if (
        !renderer ||
        event.source !== renderer.frame.contentWindow ||
        event.origin !== renderer.origin
    ) {
        return;
    }

    const { id, ready: isReady, log: line, ...result } = event.data || {};
    if (line !== undefined) {
        log.push(line);
        if (log.length > LOG_LINES) log.shift();
        return;
    }
    if (isReady) {
        renderer.resolveReady();
        return;
    }

    const entry = pending.get(id);
    if (entry) {
        pending.delete(id);
        clearTimeout(entry.timer);
        entry.resolve(result.error ? { ...result, log: [...log] } : result);
    }
});

async function render(code, url) {
    const current = loadRenderer(url);
    try {
        await current.ready;
    } catch (error) {
        return { error: error.message };
    }

    const id = nextId++;
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            pending.delete(id);
            resolve({ error: 'plantuml.js render timed out', log: [...log] });
        }, RENDER_TIMEOUT);
        pending.set(id, { resolve, timer });
        current.frame.contentWindow.postMessage({ id, code }, current.origin);
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (
        message.target !== OFFSCREEN_TARGET ||
        message.action !== RENDER_ACTION
    ) {
        return false;
    }
    render(message.code, message.rendererUrl).then(sendResponse);
    return true;
});
