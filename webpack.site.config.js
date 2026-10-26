/**
 * Builds the static plantuml.js renderer site (site/renderer/), deployed to
 * GitHub Pages and embedded by the extension's offscreen document.
 */
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const PLANTUML_JS = 'node_modules/@sakirtemel/plantuml.js';

module.exports = {
    entry: { renderer: './src/renderer.js' },
    output: {
        path: path.resolve(__dirname, 'site/renderer'),
        filename: '[name].js',
        clean: true,
    },
    devtool: 'source-map',
    performance: { hints: false },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: { presets: ['@babel/preset-env'] },
                },
            },
        ],
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: 'site-src/index.html', to: 'index.html' },
                // plantuml.js runtime (stdlib omitted: ~166MB)
                ...[
                    'plantuml.js',
                    'plantuml-core.jar',
                    'plantuml-core.jar.js',
                    'themes',
                ].map((file) => ({
                    from: `${PLANTUML_JS}/${file}`,
                    to: `plantuml/${file}`,
                    // ship CheerpJ output untouched; skip Terser
                    info: { minimized: true },
                })),
            ],
        }),
    ],
};
