// src/scrapers/amazonScraper.js
const { getBrowser } = require('./chat/connection');
const logger = require('../utils/logger');

// [ARCHITECT NOTE] Zufälliger Sleep ist gut gegen Bot-Detection.
const randomSleep = (min, max) => new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min + 1) + min)));

// [ARCHITECT NOTE] Helper für saubere Preise (Dirty Data Firewall)
// Verhindert, dass "1.299" zu "1.29" wird.
const parsePrice = (priceStr) => {
    if (!priceStr) return "0";
    // Nur Zahlen und Kommas behalten (Amazon DE Standard)
    // Wir gehen davon aus, dass '€' und andere Zeichen Müll sind.
    let clean = priceStr.replace(/[^0-9,]/g, ''); 
    return clean || "0";
};

async function searchAmazon(query, pageNum = 1) {
    const browser = await getBrowser();
    if (!browser) return [];
    
    const page = await browser.newPage();
    
    try {
        await page.setViewport({ width: 1366, height: 768 });
        // User Agent Rotation wäre hier der nächste Schritt für mehr Sicherheit
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        await page.goto(`https://www.amazon.de/s?k=${encodeURIComponent(query)}&page=${pageNum}`, { waitUntil: 'domcontentloaded' });
        
        // Cookie Banner wegklicken (Best Effort)
        try { 
            const cookieBtn = await page.waitForSelector('#sp-cc-accept', {timeout: 2000}); 
            if(cookieBtn) await cookieBtn.click();
        } catch(e) { /* Ignorieren, wenn kein Banner kommt */ }

        await randomSleep(500, 1500); 

        const results = await page.evaluate(() => {
            const items = document.querySelectorAll('div[data-component-type="s-search-result"]');
            const data = [];
            
            items.forEach(item => {
                const titleEl = item.querySelector('h2 span');
                const linkEl = item.querySelector('div[data-cy="title-recipe"] a') || item.querySelector('h2 a');
                const imgEl = item.querySelector('img.s-image');
                
                let price = "0";
                
                // [FIX] Robustere Preislogik
                const whole = item.querySelector('.a-price-whole');
                const fraction = item.querySelector('.a-price-fraction');
                
                if (whole) {
                    // Entferne Tausender-Punkte im Browser-Kontext
                    const wholeClean = whole.innerText.replace(/\./g, '').trim();
                    const fractionClean = fraction ? fraction.innerText.trim() : '00';
                    price = `${wholeClean},${fractionClean}`;
                } else {
                    const offscreen = item.querySelector('.a-price .a-offscreen');
                    if (offscreen) {
                        // Fallback für ausgeblendete Preise
                        price = offscreen.innerText.replace('€', '').replace(/\./g, '').trim(); 
                    }
                }

                if (titleEl && linkEl) {
                    let link = linkEl.href;
                    if(!link.startsWith('http')) link = 'https://www.amazon.de' + link;
                    
                    data.push({
                        title: titleEl.innerText.trim(),
                        price: price, 
                        img: imgEl ? imgEl.src : '',
                        url: link,
                        source: 'Amazon'
                    });
                }
            });
            return data;
        });
        
        await page.close();
        return results;

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
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await randomSleep(1500, 3000); 

        // --- ENERGIELABEL SUCHE ---
        let energyLabelUrl = "Unbekannt";
        try {
            const badgeSelectors = [
                '.s-energy-efficiency-badge-standard', 
                'svg[class*="energy-efficiency"]',
                '#energyEfficiencyLabel_feature_div img', 
                'a[href*="energy_efficiency"]'
            ];
            
            let badge = null;
            for (const sel of badgeSelectors) {
                badge = await page.$(sel);
                if (badge) break;
            }

            if (badge) {
                const isImg = await page.evaluate(el => el.tagName === 'IMG', badge);
                if(isImg) {
                    energyLabelUrl = await page.evaluate(el => el.src, badge);
                } else {
                    await badge.click();
                    await randomSleep(1000, 2000); 
                    energyLabelUrl = await page.evaluate(() => {
                        const img = document.querySelector('.a-popover-content img') || document.querySelector('#energy-label-popover img');
                        return img ? img.src : "Unbekannt";
                    });
                }
            }
        } catch(e) {
            logger.log('warning', "Amazon E-Label Fehler: " + e.message);
        }

        const details = await page.evaluate((eLabel) => {
            const title = document.querySelector('#productTitle')?.innerText.trim();
            if (!title) return null;
            
            // [FIX] Preis-Logik auch hier angepasst
            let price = '';
            const whole = document.querySelector('.a-price-whole');
            const fraction = document.querySelector('.a-price-fraction');
            
            if (whole) {
                 const wholeClean = whole.innerText.replace(/\./g, '').trim();
                 const fractionClean = fraction ? fraction.innerText.trim() : '00';
                 price = `${wholeClean},${fractionClean}`;
            } else {
                 const pEl = document.querySelector('.a-price .a-offscreen');
                 if(pEl) price = pEl.innerText.replace('€','').replace(/\./g, '').trim();
            }

            // Bullet Points: Sicherer Zugriff
            const bullets = Array.from(document.querySelectorAll('#feature-bullets li span'))
                .map(el => el.innerText.trim())
                .join('\n');
            
            // Bilder Logik
            const images = [];
            const imgContainer = document.querySelector('#imgTagWrapperId img');
            if(imgContainer) {
                const dyn = imgContainer.getAttribute('data-a-dynamic-image');
                if(dyn) {
                    try {
                        const urls = JSON.parse(dyn);
                        Object.keys(urls).forEach(u => images.push(u));
                    } catch(e) {
                        images.push(imgContainer.src);
                    }
                } else {
                    images.push(imgContainer.src);
                }
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
                price, 
                description: bullets, 
                techData, 
                images: images.slice(0, 10), 
                energyLabel: eLabel, 
                url: document.location.href 
            };
        }, energyLabelUrl);

        // --- ENERGIELABEL EINFÜGEN ---
        if (details && energyLabelUrl !== "Unbekannt") {
            if (!details.images.includes(energyLabelUrl)) {
                if (details.images.length > 0) {
                    details.images.splice(1, 0, energyLabelUrl);
                } else {
                    details.images.push(energyLabelUrl);
                }
            }
        }

        await page.close();
        return details;

    } catch(e) { 
        logger.log('error', `[Scraper] Details fehlgeschlagen für ${url}: ${e.message}`);
        if(!page.isClosed()) await page.close();
        return null; 
    }
}

module.exports = { searchAmazon, scrapeAmazonDetails };