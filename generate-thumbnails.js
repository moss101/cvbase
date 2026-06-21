
/**
 * Resume Thumbnail Generator
 * 
 * Usage: 
 * 1. Ensure your app is running (e.g., http://localhost:5173)
 * 2. Run: node generate-thumbnails.js
 * 
 * Requirements: npm install puppeteer
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

// Configuration
const APP_URL = 'http://localhost:5173'; // Change if your dev server port differs
const OUTPUT_DIR = './public/thumbnails';
const THUMBNAIL_WIDTH = 600;  // 300px * 2 (Retina)
const THUMBNAIL_HEIGHT = 800; // Approx A4 aspect ratio
const PADDING = 40;           // Padding around the resume in the thumbnail

// List of all template IDs to capture
const TEMPLATES = [
    'default', 'classic', 'clean', 'compact', 'simple', 'functional', 'direct', 'global',
    'urban', 'berlin', 'berlin-ii', 'cobalt', 'designer', 'golden', 'teal', 'professional',
    'creative', 'executive', 'corporate', 'modern', 'professional-v2', 'creative-v2',
    'executive-v2', 'corporate-v2', 'tech', 'tech-v2', 'tech-blue', 'tec-ats', 'escobar',
    'modern-ii', 'harvard', 'midnight', 'swiss', 'erasmus', 'minimalist', 'impact',
    'glitch', 'vogue', 'onyx', 'bloom', 'timeline', 'amsterdam', 'melbourne',
    'oak', 'leafy', 'redwood', 'kyoto', 'neomemphis', 'nordic', 'metropolitan',
    'cybergrid'
];

async function generateThumbnails() {
    console.log('📸 Starting Smart Thumbnail Generation...');
    
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)){
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // 1. Set a large viewport initially to ensure the Resume renders fully (A4 is ~794px width)
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });

    for (const templateId of TEMPLATES) {
        try {
            const url = `${APP_URL}?mode=preview&template=${templateId}`;
            console.log(`Processing: ${templateId} ...`);
            
            await page.goto(url, { waitUntil: 'networkidle0' });
            
            // Wait for fonts
            await page.evaluateHandle('document.fonts.ready');
            await new Promise(r => setTimeout(r, 500)); // Safety wait for layout

            // 2. Calculate Scale to Fit
            // We measure the actual content, then apply a CSS transform to fit it into our thumbnail size
            await page.evaluate((targetW, targetH, pad) => {
                const root = document.getElementById('headless-capture-root');
                if (!root) throw new Error('Root element not found');

                // Get natural size of the resume template
                const rect = root.getBoundingClientRect();
                const contentWidth = rect.width;
                const contentHeight = rect.height;

                // Calculate scale factors
                const scaleX = (targetW - (pad * 2)) / contentWidth;
                const scaleY = (targetH - (pad * 2)) / contentHeight;
                const scale = Math.min(scaleX, scaleY); // Fit entirely

                // Apply styles to the body to create the thumbnail container
                document.body.style.width = `${targetW}px`;
                document.body.style.height = `${targetH}px`;
                document.body.style.display = 'flex';
                document.body.style.alignItems = 'center';
                document.body.style.justifyContent = 'center';
                document.body.style.backgroundColor = '#f3f4f6'; // Neutral background for thumbnail
                document.body.style.margin = '0';
                document.body.style.overflow = 'hidden';

                // Scale the resume content
                root.style.transform = `scale(${scale})`;
                root.style.transformOrigin = 'center center';
                root.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'; // Nice drop shadow
                
            }, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, PADDING);

            // 3. Resize Viewport to exact thumbnail size
            await page.setViewport({ width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT, deviceScaleFactor: 1 });

            // 4. Capture
            await page.screenshot({
                path: path.join(OUTPUT_DIR, `${templateId}.png`),
                type: 'png'
            });
            
            console.log(`✅ Saved: ${templateId}.png`);

        } catch (error) {
            console.error(`❌ Error capturing ${templateId}:`, error.message);
        }
    }

    await browser.close();
    console.log('🎉 Thumbnail generation complete!');
}

generateThumbnails();
