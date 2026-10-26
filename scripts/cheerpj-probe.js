#!/usr/bin/env node
/**
 * Diagnoses the real plantuml.js/CheerpJ runtime outside the extension.
 * Serves dist/ over http and runs plantuml.js in:
 *   normal   - a plain page (real origin)
 *   sandbox  - an <iframe sandbox="allow-scripts"> (opaque origin, like the
 *              extension's renderer page) with dist/sandbox-shims.js
 * Needs network access to cjrtnc.leaningtech.com.
 *
 * Usage: node scripts/cheerpj-probe.js [distDir] [--channel=<name>]
 */
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const channel =
    args.find((a) => a.startsWith('--channel='))?.slice('--channel='.length) ||
    'chromium';
const distDir = path.resolve(
    args.find((a) => !a.startsWith('--')) || path.join(__dirname, '..', 'dist')
);
const TIMEOUT = 150000;

const probePage = (shims) => `<!DOCTYPE html><html><head><meta charset="utf-8">
${shims ? '<script src="/sandbox-shims.js"></script>' : ''}
<script src="https://cjrtnc.leaningtech.com/2.3/loader.js"></script>
<script src="/plantuml/plantuml.js"></script></head><body><script>
const report = (msg) => (window.parent !== window ? window.parent.postMessage({ probe: msg }, '*') : console.log('[probe] ' + msg));
for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
    const o = console[level].bind(console);
    console[level] = (...a) => { o(...a); if (window.parent !== window) report('[' + level + '] ' + a.join(' ')); };
}
addEventListener('error', (e) => report('[uncaught] ' + e.message + ' ' + (e.filename || '') + ':' + (e.lineno || '')));
addEventListener('unhandledrejection', (e) => report('[rejection] ' + (e.reason && e.reason.stack || e.reason)));
(async () => {
    const t0 = Date.now();
    if (typeof cheerpjInit !== 'function') return report('FAILED loader not available');
    report('cheerpjInit: ' + String(cheerpjInit).slice(0, 300).replace(/\\s+/g, ' '));
    try {
        await plantuml.initialize('/app/plantuml');
        report('initialize done ' + (Date.now() - t0) + 'ms');
        const t1 = Date.now();
        const svg = await cjCall('com.plantuml.wasm.v1.Svg', 'convert', 'light', '@startuml\\nA -> B\\n@enduml');
        report('RESULT ' + (Date.now() - t1) + 'ms ' + String(svg).slice(0, 80));
    } catch (e) {
        report('FAILED ' + (e && e.stack || e));
    }
})();
</script></body></html>`;

const sandboxHost = `<!DOCTYPE html><html><body>
<iframe sandbox="allow-scripts" src="/probe.html?shims=1"></iframe>
<script>addEventListener('message', (e) => e.data && e.data.probe && console.log('[probe] ' + e.data.probe));</script>
</body></html>`;

const types = { '.js': 'text/javascript', '.jar': 'application/java-archive' };

async function run(ctx, port, url, label) {
    const page = await ctx.newPage();
    const lines = [];
    page.on('console', (m) => {
        const t = m.text();
        if (t.startsWith('[probe]')) lines.push(t);
    });
    page.on('requestfailed', (r) =>
        lines.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`)
    );
    await page.goto(`http://127.0.0.1:${port}${url}`);
    const started = Date.now();
    while (
        Date.now() - started < TIMEOUT &&
        !lines.some((l) => /RESULT|FAILED/.test(l))
    ) {
        await page.waitForTimeout(1000);
    }
    console.log(`\n=== ${label} (${Date.now() - started}ms)`);
    console.log(lines.join('\n') || '(no output)');
    await page.close();
    return lines.some((l) => l.includes('RESULT') && l.includes('<svg'));
}

(async () => {
    const server = http.createServer((req, res) => {
        const url = new URL(req.url, 'http://x');
        if (url.pathname === '/probe.html') {
            res.writeHead(200, { 'content-type': 'text/html' });
            return res.end(probePage(url.searchParams.has('shims')));
        }
        if (url.pathname === '/sandbox.html') {
            res.writeHead(200, { 'content-type': 'text/html' });
            return res.end(sandboxHost);
        }
        // /app/<x> maps to the server root in CheerpJ
        const file = path.join(distDir, url.pathname.replace(/^\/app\//, '/'));
        if (
            !file.startsWith(distDir) ||
            !fs.existsSync(file) ||
            fs.statSync(file).isDirectory()
        ) {
            res.writeHead(404);
            return res.end();
        }
        res.writeHead(200, {
            'content-type':
                types[path.extname(file)] || 'application/octet-stream',
            'access-control-allow-origin': '*'
        });
        fs.createReadStream(file).pipe(res);
    });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const port = server.address().port;

    // Which browser APIs does the CheerpJ loader touch?
    try {
        const loader = await (
            await fetch('https://cjrtnc.leaningtech.com/2.3/loader.js')
        ).text();
        console.log(`loader.js: ${loader.length} bytes`);
        for (const api of [
            'caches',
            'indexedDB',
            'localStorage',
            'Worker',
            'SharedArrayBuffer',
            'navigator.storage',
            'serviceWorker',
            'document.cookie',
            'origin',
            'postMessage'
        ]) {
            const hits = [];
            let i = loader.indexOf(api);
            while (i !== -1 && hits.length < 3) {
                hits.push(
                    loader
                        .slice(Math.max(0, i - 60), i + 60)
                        .replace(/\s+/g, ' ')
                );
                i = loader.indexOf(api, i + api.length);
            }
            console.log(
                `- ${api}: ${hits.length ? hits.join(' ... ') : 'none'}`
            );
        }
    } catch (error) {
        console.log(`loader.js scan failed: ${error.message}`);
    }

    const browser = await chromium.launch({ channel });
    const ctx = await browser.newContext();
    const normal = await run(ctx, port, '/probe.html', 'normal page');
    const sandboxed = await run(
        ctx,
        port,
        '/sandbox.html',
        'sandboxed iframe + shims'
    );
    await browser.close();
    server.close();
    console.log(`\nnormal=${normal} sandbox=${sandboxed}`);
    process.exit(normal && sandboxed ? 0 : 1);
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
