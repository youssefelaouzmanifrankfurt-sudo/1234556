// src/scrapers/idealoScraper.js
const { getBrowser } = require('./chat/connection');
const logger = require('../utils/logger');

let priceCache = {};

async function searchIdealo(query, pageNum = 1) {
    const browser = await getBrowser();
    if (!browser) return [];

    logger.log('info', `🔎 Idealo Scraper: Suche "${query}"...`);
    const page = await browser.newPage();

    try {
        await page.setViewport({ width: 1280, height: 1000 });
        
        let searchUrl = `https://www.idealo.de/preisvergleich/MainSearchProductCategory.html?q=${encodeURIComponent(query)}`;
        
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
        
        try {
            const cookieBtn = await page.waitForSelector('#sp-cc-accept, button[id*="accept"]', {timeout: 3000});
            if(cookieBtn) await cookieBtn.click();
        } catch(e){}

        await autoScroll(page);
        await new Promise(r => setTimeout(r, 1000));

        const results = await page.evaluate(() => {
            const items = document.querySelectorAll('.sr-resultList__item_m6xdA'); 
            const data = [];
            
            items.forEach((item) => {
                const titleEl = item.querySelector('[class*="productSummary__title"]');
                const priceEl = item.querySelector('[class*="detailedPriceInfo__price"]');
                const imgEl = item.querySelector('img[class*="resultItemTile__image"]');
                
                const linkEl = item.querySelector('a.sr-resultItemTile__link_Q8V4n') || item.querySelector('a[class*="resultItemTile__link"]');
                
                if (titleEl && linkEl && linkEl.href) {
                    let imgSrc = '';
                    if (imgEl) imgSrc = imgEl.src || imgEl.dataset.src || '';
                    
                    let priceText = priceEl ? priceEl.innerText.trim() : 'Kein Preis';
                    priceText = priceText.replace(/^ab\s+/i, '').replace(/\s*€.*/, ' €'); 

                    data.push({
                        title: titleEl.innerText.trim(),
                        price: priceText,
                        img: imgSrc,
                        url: linkEl.href,
                        source: 'Idealo'
                    });
                }
            });
            return data;
        });

        results.forEach(r => { priceCache[r.url] = r.price; });

        logger.log('success', `Idealo: ${results.length} Treffer.`);
        await page.close();
        return results;

    } catch (e) {
        logger.log('error', 'Idealo Search Fehler: ' + e.message);
        if(!page.isClosed()) await page.close();
        return [];
    }
}

async function scrapeIdealoDetails(url) {
    const browser = await getBrowser();
    const page = await browser.newPage();
    logger.log('info', 'Lade Idealo Details...');
    
    try {
        await page.setViewport({ width: 1280, height: 1000 });
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        
        try {
            const cookieBtn = await page.waitForSelector('#sp-cc-accept', {timeout: 3000});
            if(cookieBtn) await cookieBtn.click();
        } catch(e){}

        await page.evaluate(() => window.scrollBy(0, 1000));
        await new Promise(r => setTimeout(r, 1500));

        const details = await page.evaluate(() => {
            const getText = (sel) => document.querySelector(sel)?.innerText.trim() || '';
            const title = getText('h1') || getText('[class*="productTitle"]'); 
            
            const images = [];
            const slideImages = document.querySelectorAll('.simple-carousel-slides .simple-carousel-item img');
            slideImages.forEach(img => {
                if(img.src && img.src.startsWith('http') && !images.includes(img.src)) {
                    images.push(img.src);
                }
            });
            
            if (images.length === 0) {
                const cover = document.querySelector('.datasheet-cover-image');
                if(cover) images.push(cover.src);
            }

            let energyLabel = 'Unbekannt';
            const energyImgLarge = document.querySelector('.datasheet-energyLabel');
            if (energyImgLarge) {
                energyLabel = energyImgLarge.src;
            } else {
                const energyIcon = document.querySelector('img.energy-label-icon');
                if (energyIcon) energyLabel = energyIcon.src;
            }

            const techData = [];
            const tableRows = document.querySelectorAll('.datasheet-list tr');
            tableRows.forEach(row => {
                if (row.classList.contains('datasheet-listItem--group')) {
                    const header = row.innerText.trim();
                    if(header) techData.push(`### ${header} ###`);
                } 
                else if (row.classList.contains('datasheet-listItem--properties')) {
                    const key = row.querySelector('.datasheet-listItemKey')?.innerText.trim();
                    const val = row.querySelector('.datasheet-listItemValue')?.innerText.trim();
                    if(key && val) techData.push(`${key}: ${val}`);
                }
            });

            const description = getText('.product-description') || getText('[itemprop="description"]');

            return { 
                title, description, 
                images: [...new Set(images)].slice(0, 15), 
                techData, energyLabel, 
                url: document.location.href 
            };
        });

        // WICHTIG: Energielabel in die Bilder-Liste pushen!
        if (details.energyLabel && details.energyLabel !== 'Unbekannt') {
             if (!details.images.includes(details.energyLabel)) {
                details.images.push(details.energyLabel);
            }
        }

        await page.close();
        const cachedPrice = priceCache[url] || "Preis auf Anfrage";
        return { ...details, price: cachedPrice };

    } catch(e) {
        if(!page.isClosed()) await page.close();
        return null;
    }
}

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 60;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if(totalHeight >= scrollHeight || totalHeight > 4000){ clearInterval(timer); resolve(); }
            }, 80);
        });
    });
}

module.exports = { searchIdealo, scrapeIdealoDetails };