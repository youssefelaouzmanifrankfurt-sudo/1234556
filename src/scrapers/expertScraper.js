// src/scrapers/expertScraper.js
const { getBrowser } = require('./chat/connection');
const logger = require('../utils/logger');

async function searchExpert(query, pageNum = 1) {
    const browser = await getBrowser();
    if (!browser) return [];
    const page = await browser.newPage();

    try {
        const url = `https://www.expert.de/shop/suche?q=${encodeURIComponent(query)}&page=${pageNum}`;
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        try {
            const cookieBtn = await page.waitForSelector('[data-name="accept-all"]', {timeout: 3000});
            if(cookieBtn) await cookieBtn.click();
        } catch(e){}

        const results = await page.evaluate(() => {
            const items = document.querySelectorAll('.widget-product-card');
            const data = [];

            items.forEach(item => {
                const titleEl = item.querySelector('.product-title');
                const priceEl = item.querySelector('.price-value');
                const imgEl = item.querySelector('.product-image img');
                const linkEl = item.querySelector('a.product-link');

                if (titleEl && linkEl) {
                    data.push({
                        title: titleEl.innerText.trim(),
                        price: priceEl ? priceEl.innerText.trim() + ' €' : '0 €',
                        img: imgEl ? imgEl.src : '',
                        url: linkEl.href,
                        source: 'Expert'
                    });
                }
            });
            return data;
        });

        await page.close();
        return results;
    } catch (e) {
        if(!page.isClosed()) await page.close();
        return [];
    }
}

async function scrapeExpertDetails(url) {
    const browser = await getBrowser();
    const page = await browser.newPage();
    
    try {
        await page.setViewport({ width: 1600, height: 1200 });
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        
        const details = await page.evaluate(() => {
            const title = document.querySelector('h1')?.innerText.trim() || '';
            const price = document.querySelector('.price-value')?.innerText.trim() || '';
            const description = document.querySelector('.product-description')?.innerText.trim() || '';

            const techData = [];
            const rows = document.querySelectorAll('.technical-data tr');
            rows.forEach(row => {
                const cols = row.querySelectorAll('td');
                if(cols.length === 2) {
                    techData.push(`${cols[0].innerText}: ${cols[1].innerText}`);
                }
            });

            const images = [];
            const imgEls = document.querySelectorAll('.gallery-image');
            imgEls.forEach(img => {
                if(img.src) images.push(img.src);
            });

            // --- NEU: ENERGIE LABEL SUCHE ---
            let energyLabel = "Unbekannt";
            // 1. Suche nach dem typischen Expert Energie-Badge Bild
            const eekImg = document.querySelector('img[alt*="Energieeffizienzklasse"], img[src*="energy_labels"]');
            if (eekImg) {
                energyLabel = eekImg.src;
            }

            return { title, price, description, techData, images, energyLabel, url: document.location.href };
        });

        // WICHTIG: Energielabel in die Bilder-Liste pushen!
        if (details.energyLabel && details.energyLabel !== "Unbekannt") {
            // Wir fügen es hinzu, damit der Poster es findet und sortieren kann
            if (!details.images.includes(details.energyLabel)) {
                details.images.push(details.energyLabel);
            }
        }

        await page.close();
        return details;
    } catch(e) {
        if(!page.isClosed()) await page.close();
        return null;
    }
}

module.exports = { searchExpert, scrapeExpertDetails };