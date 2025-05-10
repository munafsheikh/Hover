const fs = require('fs');
const path = require('path');

// Read manifest.json
const manifestPath = path.join(__dirname, '..', 'manifest.json');
const manifest = require(manifestPath);

// Update version from package.json
const packageJson = require('../package.json');
manifest.version = packageJson.version;

// Write updated manifest
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n'); 