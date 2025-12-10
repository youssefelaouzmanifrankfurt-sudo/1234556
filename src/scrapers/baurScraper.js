// src/scrapers/baurScraper.js
const { getBrowser } = require('./chat/connection');
const logger = require('../utils/logger');

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            var totalHeight = 0;
            var distance = 300;
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if(totalHeight >= scrollHeight || totalHeight > 6000){ clearInterval(timer); resolve(); }
            }, 50);
        });
    });
}

async function searchBaur(query, pageNum = 1) {
    const browser = await getBrowser();
    if (!browser) return [];
    const page = await browser.newPage();

    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36');
        await page.setViewport({ width: 1600, height: 1200 });
        
        const url = `https://www.baur.de/s/${encodeURIComponent(query)}?p=${pageNum}`;
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        try { const cookie = await page.$('#onetrust-accept-btn-handler'); if(cookie) await cookie.click(); } catch(e){}
        await autoScroll(page);
        await new Promise(r => setTimeout(r, 1000));

        const results = await page.evaluate(() => {
            const items = document.querySelectorAll('li.product-card');
            const data = [];
            items.forEach(item => {
                const linkEl = item.querySelector('.product-card-name');
                const priceEl = item.querySelector('.price-value');
                const imgEl = item.querySelector('.product-card-image img');

                if (linkEl) {
                    let link = linkEl.getAttribute('href');
                    if (link && !link.startsWith('http')) link = 'https://www.baur.de' + link;

                    let img = '';
                    if (imgEl) {
                        let raw = imgEl.getAttribute('srcset') ? imgEl.getAttribute('srcset').split(',').pop().trim().split(' ')[0] : (imgEl.src || imgEl.getAttribute('data-src'));
                        if(raw) {
                            let clean = raw.split('?')[0];
                            img = `${clean}?imwidth=600&format=jpg`; 
                        }
                    }

                    data.push({
                        title: linkEl.innerText.trim(),
                        price: priceEl ? priceEl.innerText.trim().replace(/\s+/g, ' ') : '0 €',
                        img,
                        url: link,
                        source: 'Baur'
                    });
                }
            });
            return data;
        });
        await page.close();
        return results;
    } catch(e) { return []; }
}

async function scrapeBaurDetails(url) {
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 1200 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36');
    
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await autoScroll(page);
        await new Promise(r => setTimeout(r, 1500));

        let energyLabelUrl = "Unbekannt";
        try {
            const badgeBtn = await page.$('.font-family-efficiency-label, button:has(svg text)');
            if (badgeBtn) {
                await badgeBtn.click();
                await page.waitForSelector('dialog[open] img', { timeout: 3000 });
                
                energyLabelUrl = await page.evaluate(() => {
                    const img = document.querySelector('dialog[open] img[alt*="Energie"], dialog[open] img');
                    return img ? img.src.split('?')[0] + '?format=jpg' : "Unbekannt";
                });
            }
        } catch(e) {
             energyLabelUrl = await page.evaluate(() => {
                const link = document.querySelector('a[href*="bilder.baur.de/v1/static"]');
                return link ? link.href : "Unbekannt";
             });
        }

        const details = await page.evaluate((eLabel) => {
            const title = document.querySelector('h1')?.innerText.trim() || '';
            const price = document.querySelector('.price-value')?.innerText.trim() || '';
            
            let description = '';
            const bullets = document.querySelectorAll('ul[aria-labelledby="selling-points"] li');
            if (bullets.length > 0) description = Array.from(bullets).map(li => '• ' + li.innerText.trim()).join('\n');
            else description = document.querySelector('[data-testid="product-description"]')?.innerText.trim() || '';

            const techData = [];
            document.querySelectorAll('table').forEach(table => {
                const header = table.querySelector('th')?.innerText.trim();
                if (header && (header.includes('Compliance') || header.includes('Verantwortlich'))) return;
                table.querySelectorAll('tbody tr').forEach(row => {
                    const cols = row.querySelectorAll('td');
                    if (cols.length === 2) techData.push(`${cols[0].innerText.trim()}: ${cols[1].innerText.trim()}`);
                });
            });

            const images = [];
            const optimize = (src) => {
                if(!src) return null;
                try {
                    let s = decodeURIComponent(src);
                    if(s.includes('url=')) s = s.match(/url=([^&]+)/)[1];
                    return s.split('?')[0] + '?imwidth=1200&format=jpg';
                } catch(e){ return src; }
            };

            document.querySelectorAll('#gallery-scroll img, .product-card-image img').forEach(img => {
                let src = img.getAttribute('srcset');
                if(src) {
                    const parts = src.split(',');
                    src = parts[parts.length - 1].trim().split(' ')[0];
                } else src = img.src;
                images.push(optimize(src));
            });

            const uniqueImages = [...new Set(images.filter(i => i && !i.includes('data:image')))];

            return { 
                title, price, description, techData, 
                images: uniqueImages, 
                energyLabel: eLabel !== "Unbekannt" ? eLabel : null, 
                url: document.location.href 
            };
        }, energyLabelUrl);

        // WICHTIG: Energielabel in die Bilder-Liste pushen!
        if (details.energyLabel) {
            if (!details.images.includes(details.energyLabel)) {
                details.images.push(details.energyLabel);
            }
        }

        await page.close();
        return details;
    } catch (e) { 
        if(!page.isClosed()) await page.close();
        return null; 
    }
}

module.exports = { searchBaur, scrapeBaurDetails };