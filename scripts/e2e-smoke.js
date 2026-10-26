#!/usr/bin/env node
/**
 * Loads the built extension in Chromium and exercises hover rendering
 * against test/e2e.html. The PlantUML server is always stubbed.
 *
 * Usage: node scripts/e2e-smoke.js [distDir] [--cheerpj=offline|stub|real]
 *   [--channel=<name>] [--executable=<path>]
 *   --cheerpj: how the CheerpJ CDN behaves (default offline)
 *       offline  unreachable: plantuml.js fails, server fallback is used
 *       stub     local fake runtime: exercises the plantuml.js message path
 *       real     the real CDN (needs network): renders with real plantuml.js
 *     --stub-cheerpj is an alias for --cheerpj=stub
 *   --channel: Playwright browser channel, e.g. msedge or chrome
 *   --executable: path to another Chromium-based browser, e.g.
 *                 /opt/microsoft/msedge/msedge
 *   Defaults to Playwright's bundled Chromium.
 * Requires: playwright (not a project dependency)
 */
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const cheerpj = args.includes('--stub-cheerpj')
    ? 'stub'
    : args
          .find((a) => a.startsWith('--cheerpj='))
          ?.slice('--cheerpj='.length) || 'offline';
if (!['offline', 'stub', 'real'].includes(cheerpj)) {
    throw new Error(`Unknown --cheerpj mode: ${cheerpj}`);
}
// The real runtime downloads a JVM on first use
const RENDER_TIMEOUT = cheerpj === 'real' ? 180000 : 20000;
const executable = args
    .find((a) => a.startsWith('--executable='))
    ?.slice('--executable='.length);
const channel =
    args.find((a) => a.startsWith('--channel='))?.slice('--channel='.length) ||
    'chromium';
const distDir = path.resolve(
    args.find((a) => !a.startsWith('--')) || path.join(root, 'dist')
);
const CDN = 'https://cjrtnc.leaningtech.com';

const STUB_SVG = (label) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><text y="20">${label}</text></svg>`;

const FAKE_CHEERPJ = `
window.cheerpjInit = async () => {};
window.cheerpjRunMain = async () => 0;
window.cjCall = async (cls, method, mode, text) =>
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><text y="20">local:' + text.length + '</text></svg>';
`;

function serve(handler) {
    return new Promise((resolve) => {
        const server = http.createServer(handler);
        server.listen(0, '127.0.0.1', () => resolve(server));
    });
}

function prepareExtension(port) {
    if (cheerpj === 'real') return distDir;
    // offline: a closed local port so the loader fails fast
    const host =
        cheerpj === 'stub' ? `http://127.0.0.1:${port}` : 'http://127.0.0.1:9';
    const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'hover-ext-'));
    fs.cpSync(distDir, copy, { recursive: true });
    for (const file of ['renderer.html', 'manifest.json']) {
        const p = path.join(copy, file);
        fs.writeFileSync(p, fs.readFileSync(p, 'utf8').split(CDN).join(host));
    }
    return copy;
}

async function main() {
    const fixture = fs.readFileSync(path.join(root, 'test/e2e.html'));
    const server = await serve((req, res) => {
        if (req.url.startsWith('/2.3/loader.js')) {
            res.writeHead(200, { 'content-type': 'text/javascript' });
            return res.end(FAKE_CHEERPJ);
        }
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end(fixture);
    });
    const port = server.address().port;
    const ext = prepareExtension(port);

    const ctx = await chromium.launchPersistentContext('', {
        headless: true,
        ...(executable ? { executablePath: executable } : { channel }),
        args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`]
    });
    console.log(
        `Browser: ${ctx.browser()?.version() || executable || channel}, cheerpj: ${cheerpj}`
    );

    const serverHits = [];
    await ctx.route('https://www.plantuml.com/**', (route) => {
        serverHits.push(route.request().url());
        route.fulfill({
            contentType: 'image/svg+xml',
            body: STUB_SVG('server'),
            headers: { 'access-control-allow-origin': '*' }
        });
    });

    if (cheerpj === 'real') {
        // Render directly through the extension first, to surface runtime errors
        const sw =
            ctx.serviceWorkers()[0] ||
            (await ctx.waitForEvent('serviceworker'));
        const extPage = await ctx.newPage();
        await extPage.goto(
            `${sw.url().split('/').slice(0, 3).join('/')}/options.html`
        );
        const started = Date.now();
        const direct = await extPage.evaluate(() =>
            chrome.runtime.sendMessage({
                action: 'renderPlantUML',
                code: '@startuml\nAlice -> Bob : hello\n@enduml'
            })
        );
        const ok = direct?.svg?.includes('<svg');
        console.log(
            `${ok ? 'PASS' : 'FAIL'} real plantuml.js render in ${Date.now() - started}ms - ${JSON.stringify(direct).slice(0, 200)}`
        );
        await extPage.close();
        if (!ok) {
            console.log(`Renderer log:\n${(direct?.log || []).join('\n')}`);
            process.exit(1);
        }
    }

    const page = await ctx.newPage();
    const logs = [];
    page.on('console', (m) => logs.push(m.text()));
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.waitForTimeout(500);

    // Point at the right edge of the block so the popup opens clear of the column
    const hover = async (selector) => {
        const el = await page.$(selector);
        await el.scrollIntoViewIfNeeded();
        const box = await el.boundingBox();
        const pre = await (await el.evaluateHandle((n) => n.closest('pre')))
            .asElement()
            .boundingBox();
        await page.mouse.move(pre.x + pre.width - 5, box.y + 5);
    };

    const results = [];
    const check = async (name, ok, detail = '') => {
        results.push({ name, ok });
        console.log(
            `${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` - ${detail}` : ''}`
        );
        if (process.env.E2E_DEBUG) {
            const state = await page.evaluate(() => {
                const p = document.querySelector('.hover-extension-popup');
                return p
                    ? `${p.style.display} ${p.style.left},${p.style.top} :: ${p.innerText.slice(0, 160).replace(/\n/g, ' | ')}`
                    : 'no popup';
            });
            console.log(`   popup: ${state}`);
        }
    };
    const popupVisible = () =>
        page.evaluate(
            () =>
                document.querySelector('.hover-extension-popup')?.style
                    .display === 'block'
        );
    const diagramSrcs = () =>
        page.$$eval('.hover-extension-diagram', (imgs) =>
            imgs.map((i) => i.src)
        );
    const decode = (src) =>
        src.startsWith('data:image/svg+xml;base64,')
            ? Buffer.from(src.split(',')[1], 'base64').toString()
            : src;
    const waitForDiagram = () =>
        page
            .waitForSelector('.hover-extension-diagram', {
                timeout: RENDER_TIMEOUT
            })
            .then(
                () => true,
                () => false
            );

    // 1. PlantUML renders on hover (via child element)
    await hover('#uml-a .tok');
    await check('popup opens on PlantUML hover', await waitForDiagram());
    const first = (await diagramSrcs()).map(decode);
    await check(
        'diagram image rendered',
        first.length === 1 && first[0].includes('<svg'),
        first[0]?.slice(0, 80)
    );
    if (cheerpj === 'stub') {
        await check(
            'rendered locally with plantuml.js',
            first[0]?.includes('local:'),
            `server hits=${serverHits.length}`
        );
    } else if (cheerpj === 'real') {
        await check(
            'rendered locally with real plantuml.js',
            serverHits.length === 0 && !first[0]?.includes('server'),
            `server hits=${serverHits.length}`
        );
    } else {
        await check('fell back to server', first[0]?.includes('server'));
    }

    // 2. Moving within the same block does not re-render
    const hitsBefore = serverHits.length;
    await page.mouse.move(80, 60);
    await hover('#uml-a');
    await hover('#uml-a .tok');
    await page.waitForTimeout(600);
    await check('same block not re-rendered', serverHits.length === hitsBefore);

    // 3. Hovering a different block renders immediately (no global lock)
    await hover('#uml-b code');
    await page
        .waitForFunction(
            () =>
                document
                    .querySelector('.hover-extension-content pre')
                    ?.textContent.includes('mindmap'),
            null,
            { timeout: RENDER_TIMEOUT }
        )
        .catch(() => {});
    const second = await page
        .$eval('.hover-extension-content pre', (p) => p.textContent)
        .catch(() => '');
    await check(
        'different block renders straight away',
        second.includes('@startmindmap')
    );

    // 4. Close the popup; re-hovering the same block stays closed (cooldown)
    await page.click('.hover-extension-close');
    await hover('#uml-b code');
    await page.waitForTimeout(600);
    await check('dismissed block stays closed', !(await popupVisible()));

    // 5. SVG renders inline
    await hover('#svg');
    await waitForDiagram();
    const svgSrc = (await diagramSrcs()).map(decode)[0] || '';
    await check('SVG block renders inline', svgSrc.includes('<circle'));

    // 6. JSON renders as a diagram
    await hover('#json');
    await page
        .waitForFunction(
            () =>
                document
                    .querySelector('.hover-extension-content pre')
                    ?.textContent.includes('@startjson'),
            null,
            { timeout: RENDER_TIMEOUT }
        )
        .catch(() => {});
    await check('JSON block renders', (await diagramSrcs()).length === 1);

    // 7. Plain code does nothing; click outside closes
    await page.mouse.click(5, 5); // click outside the popup
    await hover('#plain');
    await page.waitForTimeout(600);
    await check('plain code ignored', !(await popupVisible()));

    await ctx.close();
    server.close();

    const failed = results.filter((r) => !r.ok);
    if (failed.length) {
        console.log(
            '\nContent script console:\n' +
                logs
                    .filter((l) => l.includes('Hover'))
                    .slice(-20)
                    .join('\n')
        );
        process.exit(1);
    }
    console.log(`\nAll ${results.length} checks passed`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
