import puppeteer from 'puppeteer';
import fs from 'fs';
import { execSync } from 'child_process';

const PATH_ASSETS = './assets';

async function generateAssets() {
    console.log('💎 Starting High-Fidelity Mobile Asset Generation...');

    // 1. Ensure assets directory exists
    if (!fs.existsSync(PATH_ASSETS)) {
        fs.mkdirSync(PATH_ASSETS, { recursive: true });
    }

    // 2. Launch Puppeteer
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Custom Web Elements containing elegant UI layouts for the logo and splash screen
    const logoHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800;900&family=Space+Grotesk:wght@500;700;900&display=swap');
            * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }
            body {
                background: linear-gradient(135deg, #0f172a 0%, #172554 100%);
                width: 1024px;
                height: 1024px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Inter', sans-serif;
                overflow: hidden;
            }
            .glow-bg {
                position: absolute;
                width: 700px;
                height: 700px;
                background: radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%);
                top: 162px;
                left: 162px;
                pointer-events: none;
            }
            .icon-wrapper {
                width: 580px;
                height: 580px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                background: rgba(255, 255, 255, 0.02);
                border: 2px solid rgba(255, 255, 255, 0.08);
                border-radius: 140px;
                backdrop-filter: blur(25px);
                box-shadow: 0 60px 120px -30px rgba(0,0,0,0.6);
            }
            .brand-text {
                margin-top: 36px;
                font-size: 60px;
                font-weight: 900;
                color: #ffffff;
                letter-spacing: -2px;
                text-transform: uppercase;
                font-family: 'Space Grotesk', 'Inter', sans-serif;
            }
            .brand-purple {
                color: #a78bfa;
            }
        </svg>
        </style>
    </head>
    <body>
        <div class="glow-bg"></div>
        <div class="icon-wrapper">
            <!-- Modern Resume Base SVG Symbol -->
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style="width: 260px; height: 260px; filter: drop-shadow(0 15px 30px rgba(0,0,0,0.35));">
                <defs>
                    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#a855f7;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <rect x="15" y="10" width="70" height="80" rx="14" fill="url(#grad1)" />
                <rect x="23" y="18" width="54" height="64" rx="10" fill="#ffffff" />
                <!-- Resume Headers & Lines -->
                <rect x="33" y="30" width="34" height="6" rx="3" fill="#1e1b4b" />
                <rect x="33" y="42" width="22" height="5" rx="2.5" fill="#4f46e5" />
                <rect x="33" y="52" width="34" height="4" rx="2" fill="#cbd5e1" />
                <rect x="33" y="61" width="28" height="4" rx="2" fill="#cbd5e1" />
                <circle cx="61" cy="44" r="6.5" fill="#a855f7" />
            </svg>
            <div class="brand-text">CV<span class="brand-purple">Base</span></div>
        </div>
    </body>
    </html>
    `;

    const splashHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800;900&family=Space+Grotesk:wght@500;700;900&display=swap');
            * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }
            body {
                background: linear-gradient(135deg, #090d16 0%, #1e1b4b 50%, #030712 100%);
                width: 2732px;
                height: 2732px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-family: 'Inter', sans-serif;
                overflow: hidden;
            }
            .glow-bg-1 {
                position: absolute;
                width: 1600px;
                height: 1600px;
                background: radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 75%);
                top: 566px;
                left: 566px;
                pointer-events: none;
            }
            .glow-bg-2 {
                position: absolute;
                width: 1400px;
                height: 1400px;
                background: radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, transparent 75%);
                top: 100px;
                right: 100px;
                pointer-events: none;
            }
            .content-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 10;
            }
            .brand-name {
                margin-top: 96px;
                font-size: 148px;
                font-weight: 900;
                color: #ffffff;
                letter-spacing: -4px;
                text-transform: uppercase;
                font-family: 'Space Grotesk', 'Inter', sans-serif;
                text-shadow: 0 16px 48px rgba(0,0,0,0.5);
            }
            .brand-purple {
                color: #a855f7;
            }
            .tagline {
                margin-top: 32px;
                font-size: 48px;
                font-weight: 500;
                color: #94a3b8;
                letter-spacing: 6px;
                text-transform: uppercase;
                text-shadow: 0 8px 16px rgba(0,0,0,0.3);
            }
        </style>
    </head>
    <body>
        <div class="glow-bg-1"></div>
        <div class="glow-bg-2"></div>
        <div class="content-container">
            <!-- Stunning High-Res App Icon Symbol -->
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style="width: 520px; height: 520px; filter: drop-shadow(0 40px 80px rgba(0,0,0,0.65));">
                <defs>
                    <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#a855f7;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <rect x="15" y="10" width="70" height="80" rx="14" fill="url(#grad2)" />
                <rect x="23" y="18" width="54" height="64" rx="10" fill="#ffffff" />
                <!-- Resume Headers & Lines -->
                <rect x="33" y="30" width="34" height="6" rx="3" fill="#1e1b4b" />
                <rect x="33" y="42" width="22" height="5" rx="2.5" fill="#4f46e5" />
                <rect x="33" y="52" width="34" height="4" rx="2" fill="#cbd5e1" />
                <rect x="33" y="61" width="28" height="4" rx="2" fill="#cbd5e1" />
                <circle cx="61" cy="44" r="6.5" fill="#a855f7" />
            </svg>
            <div class="brand-name">CV<span class="brand-purple">Base</span></div>
            <div class="tagline">AI Resume Architecture</div>
        </div>
    </body>
    </html>
    `;

    // 3. Render and save App Icon (Logo) Group
    console.log('🎨 Rendering App Icon logo.png (1024x1024)...');
    await page.setViewport({ width: 1024, height: 1024, deviceScaleFactor: 1 });
    await page.setContent(logoHtml);
    // Wait for web fonts to load
    await page.evaluate(async () => {
        await document.fonts.ready;
    });
    await page.screenshot({ path: `${PATH_ASSETS}/logo.png`, type: 'png' });
    await page.screenshot({ path: `${PATH_ASSETS}/logo-dark.png`, type: 'png' });
    console.log('✅ Generated assets/logo.png and logo-dark.png successfully!');

    // 4. Render and save Splash Screen Group
    console.log('🎨 Rendering App Splash Screen splash.png (2732x2732)...');
    await page.setViewport({ width: 2732, height: 2732, deviceScaleFactor: 1 });
    await page.setContent(splashHtml);
    // Wait for web fonts to load
    await page.evaluate(async () => {
        await document.fonts.ready;
    });
    await page.screenshot({ path: `${PATH_ASSETS}/splash.png`, type: 'png' });
    await page.screenshot({ path: `${PATH_ASSETS}/splash-dark.png`, type: 'png' });
    console.log('✅ Generated assets/splash.png and splash-dark.png successfully!');

    // Close the browser
    await browser.close();

    // 5. Run the Capacitor Assets generator for Android & iOS!
    console.log('⚙️ Executing npx @capacitor/assets generate to build native icon sets...');
    try {
        execSync('npx -y @capacitor/assets generate', { stdio: 'inherit' });
        console.log('🎉 iOS and Android icons and splash screens updated successfully!');
    } catch (err) {
        console.error('❌ Failed to execute @capacitor/assets utility:', err);
    }
}

generateAssets();
