/**
 * Hover - plantuml.js renderer (sandboxed page)
 * Runs PlantUML in-browser via CheerpJ. Lives in a sandbox because CheerpJ
 * needs its remote runtime and dynamic code evaluation, both blocked by the
 * MV3 extension page CSP.
 */
/* global plantuml, cjCall */
import { parseSvgResult } from './utils/PlantUMLJs';

const PLANTUML_PATH = '/app/plantuml';

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
