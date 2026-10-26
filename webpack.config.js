const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const ZipPlugin = require('zip-webpack-plugin');

module.exports = {
    entry: {
        background: './src/background.js',
        content: './src/content.js',
        popup: './src/popup.js',
        options: './src/options.js',
        offscreen: './src/offscreen.js',
        renderer: './src/renderer.js',
        'sandbox-shims': './src/sandbox-shims.js',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
    },
    devtool: 'cheap-module-source-map',
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                    },
                },
            },
        ],
    },
    resolve: {
        extensions: ['.js'],
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: 'manifest.json', to: 'manifest.json' },
                { from: 'popup.html', to: 'popup.html' },
                { from: 'options.html', to: 'options.html' },
                { from: 'icons', to: 'icons' },
                { from: 'offscreen.html', to: 'offscreen.html' },
                { from: 'renderer.html', to: 'renderer.html' },
                { from: 'lib', to: 'lib' },
                // plantuml.js runtime (stdlib omitted: ~166MB)
                ...[
                    'plantuml.js',
                    'plantuml-core.jar',
                    'plantuml-core.jar.js',
                    'themes',
                ].map((file) => ({
                    from: `node_modules/@sakirtemel/plantuml.js/${file}`,
                    to: `plantuml/${file}`,
                    // ship CheerpJ output untouched; skip Terser
                    info: { minimized: true },
                })),
            ],
        }),
        new ZipPlugin({
            filename: 'hover-extension.zip',
            pathPrefix: '',
            path: path.resolve(__dirname, 'dist'),
        }),
    ],
}; 