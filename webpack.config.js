const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const ZipPlugin = require('zip-webpack-plugin');

module.exports = {
    entry: {
        background: './background.js',
        content: './content.js',
        popup: './popup.js',
        options: './options.js',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
    },
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