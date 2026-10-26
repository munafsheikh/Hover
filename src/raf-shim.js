/**
 * Hover - requestAnimationFrame fallback for the renderer page
 * Loaded before CheerpJ, whose scheduler waits on requestAnimationFrame.
 * Inside the extension's offscreen document nothing is ever painted, so
 * rAF callbacks never fire and CheerpJ stalls after start-up. Each callback
 * runs on whichever comes first: a real frame or a short timer.
 */
const FALLBACK_MS = 50;

const nativeRequest = window.requestAnimationFrame.bind(window);
const nativeCancel = window.cancelAnimationFrame.bind(window);
const handles = new Map();
let nextHandle = 0;

window.requestAnimationFrame = (callback) => {
    const handle = ++nextHandle;
    const run = (time) => {
        const entry = handles.get(handle);
        if (!entry) return;
        handles.delete(handle);
        nativeCancel(entry.frame);
        clearTimeout(entry.timer);
        callback(time ?? performance.now());
    };
    handles.set(handle, {
        frame: nativeRequest(run),
        timer: setTimeout(() => run(performance.now()), FALLBACK_MS)
    });
    return handle;
};

window.cancelAnimationFrame = (handle) => {
    const entry = handles.get(handle);
    if (!entry) return;
    handles.delete(handle);
    nativeCancel(entry.frame);
    clearTimeout(entry.timer);
};
