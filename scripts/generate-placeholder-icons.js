/**
 * Script to generate placeholder PNG icons for development
 * This is a fallback for environments where ImageMagick isn't available
 */

const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.resolve(__dirname, '../icons');
const SIZES = [16, 48, 128];

// Simple 1x1 transparent PNG pixel (base64 encoded)
// This is the minimal valid PNG file format
const TRANSPARENT_PIXEL = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAEtAI/QTQjlQAAAABJRU5ErkJggg==',
    'base64'
);

function generatePlaceholderIcons() {
    try {
        // Ensure icons directory exists
        if (!fs.existsSync(ICONS_DIR)) {
            fs.mkdirSync(ICONS_DIR, { recursive: true });
        }

        // Generate a placeholder PNG for each size
        SIZES.forEach(size => {
            const pngPath = path.join(ICONS_DIR, `icon${size}.png`);

            // Skip if file already exists
            if (fs.existsSync(pngPath)) {
                console.log(`Icon already exists: ${pngPath}`);
                return;
            }

            // Write the transparent pixel as a placeholder
            fs.writeFileSync(pngPath, TRANSPARENT_PIXEL);
            console.log(`✓ Created placeholder icon: ${pngPath}`);
        });

        console.log('✨ All placeholder icons created successfully!');
        console.log('NOTE: These are transparent 1x1 pixel placeholders.');
        console.log('      For proper icons, use convert-icons.js with ImageMagick installed.');
    } catch (error) {
        console.error('❌ Error generating placeholder icons:', error.message);
    }
}

// Run the generator
generatePlaceholderIcons(); 