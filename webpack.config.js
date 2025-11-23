const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const ZipPlugin = require('zip-webpack-plugin');

module.exports = {
    entry: {
        background: './src/background.js',
        content: './src/content.ts',
        popup: './src/popup.js',
        options: './src/options.js',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
    },
    module: {
        rules: [
            {
                test: /\.[tj]s$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env', '@babel/preset-typescript'],
                    },
                },
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: 'manifest.json', to: 'manifest.json' },
                { from: 'popup.html', to: 'popup.html' },
                { from: 'options.html', to: 'options.html' },
                { from: 'icons', to: 'icons' },
                { from: 'lib', to: 'lib' },
            ],
        }),
        new ZipPlugin({
            filename: 'hover-extension.zip',
            pathPrefix: '',
            path: path.resolve(__dirname, 'dist'),
        }),
    ],
}; 