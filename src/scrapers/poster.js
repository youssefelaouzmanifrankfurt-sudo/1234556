// src/scrapers/poster.js
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const downloader = require('../utils/imageDownloader');
const storage = require('../utils/storage');

puppeteer.use(StealthPlugin());

// 🔥 EIGENES PROFIL FÜR DEN POSTER (Login bleibt erhalten!)
const POSTER_DATA_DIR = 'C:\\weeeeeee_data\\chrome_profile_poster';

function getSystemChromePath() {
    const paths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ];
    for (const p of paths) if (fs.existsSync(p)) return p;
    return null;
}

async function fillAdForm(product) {
    logger.log('info', `🚀 Starte unabhängigen Browser für: "${product.title}"`);

    if (!fs.existsSync(POSTER_DATA_DIR)) {
        try { fs.mkdirSync(POSTER_DATA_DIR, { recursive: true }); } catch(e) {}
    }

    if (!product.images || product.images.length < 1) {
        logger.log('error', `❌ ABBRUCH: Keine Bilder für "${product.title}".`);
        return;
    }

    // --- 1. BILDER SORTIERUNG (FIX: ENERGIE-LABEL AN PLATZ 2) ---
    // Wir filtern erst mal leere Links raus
    let allImages = [...new Set(product.images)].filter(u => u && u.startsWith('http'));

    // A) Wir versuchen das explizite Label aus dem Scraper zu finden
    let targetLabelUrl = product.energyLabel;

    // B) Fallback: Wenn das fehlt, suchen wir nach Keywords in der URL (alte Methode)
    if (!targetLabelUrl) {
         const energyKeywords = ['energy', 'energie', 'label', 'eek', 'efficiency', 'effizienz', 'scale'];
         const found = allImages.find(url => energyKeywords.some(kw => url.toLowerCase().includes(kw)));
         if(found) targetLabelUrl = found;
    }

    // Wenn wir ein Label identifiziert haben -> Verschieben!
    if (targetLabelUrl) {
        const index = allImages.indexOf(targetLabelUrl);
        if (index > -1) {
            // Aus der Liste entfernen
            const labelImg = allImages.splice(index, 1)[0];
            
            // An Position 2 (Index 1) wieder einfügen
            // (Nur wenn es überhaupt ein anderes Bild gibt, sonst ist es eh das einzige)
            if (allImages.length >= 1) {
                allImages.splice(1, 0, labelImg);
                logger.log('info', '💡 Energielabel identifiziert und an Position 2 gesetzt.');
            } else {
                allImages.push(labelImg);
            }
        }
    }

    // --- 2. BILDER LADEN ---
    const filePaths = [];
    // Max 15 Bilder laden
    for (let i = 0; i < Math.min(allImages.length, 15); i++) {
        if(i > 0) await new Promise(r => setTimeout(r, 200)); 
        const filePath = await downloader.downloadImage(allImages[i], `upload_${Date.now()}_${i}.jpg`);
        if (filePath) filePaths.push(filePath);
    }

    // --- 3. TEXT & PREIS VORBEREITUNG ---
    const settings = storage.loadSettings();
    const templates = settings.templates || {};
    
    // Standard-Template (Falls keins in Settings definiert ist)
    // HINWEIS: Wir entfernen hier "Details:" aus dem Hardcode und fügen es dynamisch hinzu
    let template = templates["Default"] || "(titel)\n\n(beschreibung)\n\n(technischedaten)";
    
    let rawDesc = product.description || "Details folgen.";
    
    // 🔥 FIX: Diese Zeilen haben den Footer (Adresse etc.) abgeschnitten. 
    // Ich habe sie entfernt, damit deine vollständige Beschreibung erhalten bleibt.
    // rawDesc = rawDesc.replace(/Buy24.*?$/s, "").trim(); 
    // rawDesc = rawDesc.replace(/Industriestraße.*?$/s, "").trim();

    // Technische Daten aufbereiten
    let techDataString = "";
    if (product.techData && Array.isArray(product.techData)) {
        techDataString = product.techData.join("\n");
    } else if (product.features && Array.isArray(product.features)) {
        techDataString = product.features.map(f => (typeof f === 'string') ? f : (f.text || "")).filter(t=>t).join("\n");
    }

    // Bauen wir den Tech-Block: Nur wenn Daten da sind, fügen wir "Details:" hinzu
    let finalTechBlock = "";
    if (techDataString && techDataString.trim().length > 0) {
        // Falls im Template schon "Details:" steht, fügen wir es hier nicht nochmal hinzu, 
        // aber meistens ist es sauberer, es hier zu steuern.
        finalTechBlock = "Details:\n" + techDataString;
    }

    // Template füllen
    let finalDesc = template
        .replace(/\(titel\)/g, product.title)
        .replace(/\(preis\)/g, product.price || "VB")
        .replace(/\(beschreibung\)/g, rawDesc);

    // Spezialbehandlung für (technischedaten) und alte Templates
    if (finalDesc.includes('(technischedaten)')) {
        finalDesc = finalDesc.replace(/\(technischedaten\)/g, finalTechBlock);
    } else {
        // Fallback: Wenn der Platzhalter fehlt, hängen wir es unten dran (aber nur wenn Daten da sind)
        if (finalTechBlock) {
            finalDesc += "\n\n" + finalTechBlock;
        }
    }

    // Aufräumen: Falls das Template festes "Details:" hatte und wir keine Daten hatten
    // (Regex sucht nach "Details:" am Zeilenende oder gefolgt von Leerzeichen am Ende)
    if (!techDataString) {
        finalDesc = finalDesc.replace(/Details:\s*$/g, "");
    }
    
    if(finalDesc.length > 4000) finalDesc = finalDesc.substring(0, 3990);

    // 🔥 PREIS FIX:
    let rawPrice = product.price;
    if (!rawPrice && product.currentPrice) rawPrice = product.currentPrice;
    if (!rawPrice && product.targetPrice) rawPrice = product.targetPrice;

    // String erzwingen und Punkt zu Komma
    let priceNum = String(rawPrice || "").replace('.', ',');
    priceNum = priceNum.replace(/[^0-9,]/g, '');

    // --- 4. BROWSER STARTEN ---
    const launchOptions = {
        headless: false, 
        userDataDir: POSTER_DATA_DIR,
        defaultViewport: null,
        args: ['--no-sandbox', '--disable-infobars', '--window-size=1280,1000', '--disable-blink-features=AutomationControlled']
    };

    const sysChrome = getSystemChromePath();
    if (sysChrome) launchOptions.executablePath = sysChrome;

    let browser;
    try {
        browser = await puppeteer.launch(launchOptions);
    } catch(e) {
        logger.log('error', 'Browser Startfehler: ' + e.message);
        return;
    }

    const pages = await browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();

    try {
        await page.setViewport({ width: 1280, height: 1000 });
        logger.log('info', '🌍 Öffne Formular...');
        await page.goto('https://www.kleinanzeigen.de/p-anzeige-aufgeben-schritt2.html', { waitUntil: 'domcontentloaded' });

        // Login Check
        const content = await page.content();
        if (content.includes('Einloggen') || content.includes('Registrieren')) {
            logger.log('warning', '⚠️ Nicht eingeloggt! Bitte einloggen. Ich warte...');
            await new Promise(r => setTimeout(r, 5000));
        }

        try { const banner = await page.$('#gdpr-banner-accept'); if(banner) await banner.click(); } catch(e){}
        await new Promise(r => setTimeout(r, 1000));

        // Titel
        await page.evaluate((val) => {
            const el = document.querySelector('#postad-title');
            if(el) { el.value = val; el.dispatchEvent(new Event('input')); }
        }, product.title);
        
        await page.click('body'); 
        await new Promise(r => setTimeout(r, 1500));
        try { await page.click('#category-suggestion-0'); } catch(e){}

        // Beschreibung
        const descField = await page.waitForSelector('#pstad-descrptn', { timeout: 10000 }).catch(() => null);
        if (descField) {
            await page.evaluate((val) => {
                const el = document.querySelector('#pstad-descrptn');
                el.value = val;
                el.dispatchEvent(new Event('input'));
            }, finalDesc);
            logger.log('success', '✅ Beschreibung gesetzt.');
        }

        // Preis
        if (priceNum && priceNum.length > 0) {
            await page.evaluate((val) => {
                const el = document.querySelector('#pstad-price');
                if(el) {
                    el.value = val;
                    el.dispatchEvent(new Event('input', {bubbles:true}));
                    el.dispatchEvent(new Event('change', {bubbles:true}));
                }
            }, priceNum);
            
            await page.evaluate(() => {
                const radio = document.querySelector('input[value="FIXED"]');
                if(radio) radio.click();
            });
            logger.log('success', `✅ Preis gesetzt: ${priceNum} €`);
        } else {
             await page.evaluate(() => {
                const label = document.querySelector('label[for="pstad-price-type-negotiable"]');
                if(label) label.click();
            });
            logger.log('info', 'ℹ️ Kein Preis gefunden -> Setze auf VB.');
        }

        // Bilder Upload
        if (filePaths.length > 0) {
            logger.log('info', `   -> Upload von ${filePaths.length} Bildern...`);
            const fileInput = await page.$('input[type="file"]');
            if (fileInput) {
                await fileInput.uploadFile(...filePaths);
                await new Promise(r => setTimeout(r, 3000 + (filePaths.length * 1500)));
            }
        }

        logger.log('success', '🚀 Fertig! Du kannst das Fenster offen lassen.');
        setTimeout(() => downloader.clearTempFolder(), 60000);

    } catch (e) {
        logger.log('error', 'Poster Fehler: ' + e.message);
    }
}

module.exports = { fillAdForm };