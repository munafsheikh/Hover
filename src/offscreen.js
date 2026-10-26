/**
 * Hover - Offscreen document
 * Hosts the sandboxed plantuml.js renderer once for the whole extension and
 * relays render requests from the background service worker.
 */
import { OFFSCREEN_TARGET, RENDER_ACTION } from './utils/PlantUMLJs';

const RENDER_TIMEOUT = 120000; // first render downloads the CheerpJ runtime

const LOG_LINES = 200;

const pending = new Map();
const log = [];
let nextId = 0;
let resolveReady;
const ready = new Promise((resolve) => (resolveReady = resolve));

const frame = document.createElement('iframe');
frame.src = 'renderer.html';

window.addEventListener('message', (event) => {
    if (event.source !== frame.contentWindow) return;

    const { id, ready: isReady, log: line, ...result } = event.data || {};
    if (line !== undefined) {
        log.push(line);
        if (log.length > LOG_LINES) log.shift();
        return;
    }
    if (isReady) {
        resolveReady();
        return;
    }

    const entry = pending.get(id);
    if (entry) {
        pending.delete(id);
        clearTimeout(entry.timer);
        entry.resolve(result.error ? { ...result, log: [...log] } : result);
    }
});

document.body.appendChild(frame);

async function render(code) {
    await ready;
    const id = nextId++;
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            pending.delete(id);
            resolve({ error: 'plantuml.js render timed out', log: [...log] });
        }, RENDER_TIMEOUT);
        pending.set(id, { resolve, timer });
        frame.contentWindow.postMessage({ id, code }, '*');
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (
        message.target !== OFFSCREEN_TARGET ||
        message.action !== RENDER_ACTION
    ) {
        return false;
    }
    render(message.code).then(sendResponse);
    return true;
});
