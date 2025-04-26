/**
 * Packaging script for the Hover extension
 * This script bundles the extension into a ZIP file ready for distribution
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Configuration
const DIST_DIR = path.resolve(__dirname, '../dist');
const OUTPUT_FILE = path.resolve(DIST_DIR, 'hover-extension.zip');
const VERSION = require('../package.json').version;

// Ensure the dist directory exists
if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
}

// Create a file to stream archive data to
const output = fs.createWriteStream(OUTPUT_FILE);
const archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level
});

// Listen for all archive data to be written
output.on('close', () => {
    console.log(`✨ Successfully created: ${OUTPUT_FILE}`);
    console.log(`📦 Total size: ${archive.pointer()} bytes`);
});

archive.on('warning', (err) => {
    if (err.code === 'ENOENT') {
        console.warn('Warning:', err);
    } else {
        throw err;
    }
});

archive.on('error', (err) => {
    throw err;
});

// Pipe archive data to the file
archive.pipe(output);

// Add files from the dist directory but exclude any zip files
// that might already be there from previous builds
archive.glob('**/*', {
    cwd: DIST_DIR,
    ignore: ['*.zip']
});

// Finalize the archive (i.e. we are done appending files but streams have to finish yet)
archive.finalize();

console.log(`🚀 Packaging Hover Extension v${VERSION}...`); 