/**
 * Helpers shared by the plantuml.js (in-browser) rendering pipeline.
 * content -> background -> offscreen document -> embedded renderer page
 */

export const ENGINE_PLANTUML_JS = 'plantumljs';
export const ENGINE_SERVER = 'server';

export const OFFSCREEN_TARGET = 'offscreen';
export const RENDER_ACTION = 'renderPlantUML';

// Hosted plantuml.js renderer page (see site-src/); configurable in options
export const DEFAULT_RENDERER_URL =
    'https://munafsheikh.github.io/Hover/renderer/';

/**
 * Normalise the value returned by com.plantuml.wasm.v1.Svg.convert.
 * Success yields raw SVG markup; failures yield a JSON status object.
 */
export function parseSvgResult(result) {
    const text = String(result ?? '').trim();
    if (text.startsWith('<')) {
        return { svg: text };
    }

    try {
        const obj = JSON.parse(text);
        const detail = obj.line ? ` (line ${obj.line}): ${obj.error}` : '';
        return {
            error: `${obj.status || 'Render failed'}${detail || (obj.exception ? `: ${obj.exception}` : '')}`
        };
    } catch {
        return { error: text || 'Empty result from plantuml.js' };
    }
}

/**
 * Encode SVG markup as a UTF-8 safe data URL.
 */
export function svgToDataUrl(svg) {
    const bytes = new TextEncoder().encode(svg);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return `data:image/svg+xml;base64,${btoa(binary)}`;
}
