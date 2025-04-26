/**
 * Script to convert SVG icons to PNG format
 * This is required because manifest.json references PNG icons
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

const ICONS_DIR = path.resolve(__dirname, '../icons');
const SIZES = [16, 48, 128];

async function convertSvgToPng() {
    try {
        // Check if imagemagick (convert) is installed
        try {
            await execPromise('convert --version');
            console.log('✓ ImageMagick is installed');
        } catch (error) {
            console.error('❌ ImageMagick is not installed. Please install it to convert icons:');
            console.error('   npm install -g imagemagick');
            console.error('   or visit https://imagemagick.org/script/download.php');
            return;
        }

        // Create promises for all conversion operations
        const conversionPromises = SIZES.map(async (size) => {
            const svgPath = path.join(ICONS_DIR, `icon${size}.svg`);
            const pngPath = path.join(ICONS_DIR, `icon${size}.png`);

            if (!fs.existsSync(svgPath)) {
                throw new Error(`SVG icon not found: ${svgPath}`);
            }

            console.log(`Converting icon${size}.svg to PNG...`);

            // Use ImageMagick to convert SVG to PNG
            await execPromise(`convert -background none -size ${size}x${size} ${svgPath} ${pngPath}`);

            console.log(`✓ Created ${pngPath}`);
        });

        // Execute all conversions in parallel
        await Promise.all(conversionPromises);

        console.log('✨ All icons converted successfully!');
    } catch (error) {
        console.error('❌ Error converting icons:', error.message);
        process.exit(1);
    }
}

// Run the conversion
convertSvgToPng(); 