// src/scrapers/ottoScraper.js
const { getBrowser } = require('./chat/connection');
const logger = require('../utils/logger');
// [ARCHITECT] WICHTIG: Formatter nutzen für konsistente Preise
const { toCents, fromCentsToEuro } = require('../utils/formatter'); 

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 200;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if(totalHeight >= scrollHeight || totalHeight > 3000){ 
                    clearInterval(timer); resolve();
                }
            }, 50);
        });
    });
}

async function searchOtto(query, pageNum = 1) {
    const browser = await getBrowser();
    if (!browser) return [];
    let page = null;

    try {
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        
        const offset = (pageNum - 1) * 20;
        let searchUrl = `https://www.otto.de/suche/${encodeURIComponent(query)}`;
        if (pageNum > 1) searchUrl += `?o=${offset}`;
        
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        try {
            const cookieBtn = await page.waitForSelector('#onetrust-accept-btn-handler', {timeout: 2000});
            if(cookieBtn) await cookieBtn.click();
        } catch(e){}
        
        await autoScroll(page);

        const results = await page.evaluate(() => {
            const items = document.querySelectorAll('article.product'); 
            const data = [];
            items.forEach((item) => {
                const titleEl = item.querySelector('.find_tile__name');
                const priceEl = item.querySelector('.find_tile__priceValue');
                const imgEl = item.querySelector('img.find_tile__productImage');
                const linkEl = item.querySelector('a.find_tile__productLink');
                
                if (titleEl && linkEl) {
                    let imgSrc = '';
                    if (imgEl) {
                        imgSrc = imgEl.src || imgEl.dataset.src || '';
                        if (!imgSrc && imgEl.srcset) imgSrc = imgEl.srcset.split(',')[0].split(' ')[0];
                    }
                    data.push({
                        title: titleEl.innerText.trim(),
                        rawPrice: priceEl ? priceEl.innerText.trim() : '0',
                        img: imgSrc,
                        url: linkEl.href,
                        source: 'Otto'
                    });
                }
            });
            return data;
        });
        
        // Nachbearbeitung mit Formatter
        return results.map(item => ({
            ...item,
            price: fromCentsToEuro(toCents(item.rawPrice)),
            priceCents: toCents(item.rawPrice)
        }));

    } catch (e) {
        logger.log('error', `[Otto Search] Fehlgeschlagen: ${e.message}`);
        return [];
    } finally {
        if(page) await page.close().catch(() => {});
    }
}

async function scrapeOttoDetails(url) {
    const browser = await getBrowser();
    let page = null;
    
    try {
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 900 }); 
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

        try {
            const cookieBtn = await page.waitForSelector('#onetrust-accept-btn-handler', {timeout: 3000});
            if(cookieBtn) await cookieBtn.click();
            await new Promise(r => setTimeout(r, 500)); 
        } catch(e){}

        const data = await page.evaluate(() => {
            const getText = (sel) => document.querySelector(sel)?.innerText.trim() || '';
            
            const title = getText('h1'); 
            let priceStr = getText('.p_price__regular') || getText('.js_pdp_price__retail-price__value_') || getText('[data-qa="price"]');
            
            let descBuffer = [];
            const listItems = document.querySelectorAll('.js_pdp_selling-points li');
            if(listItems.length > 0) {
                descBuffer.push(Array.from(listItems).map(li => "• " + li.innerText.trim()).join('\n'));
            }
            
            const descContainer = document.querySelector('.js_pdp_description');
            if (descContainer) {
                const paragraphs = descContainer.querySelectorAll('p');
                const fullDesc = Array.from(paragraphs).map(p => p.innerText.trim()).filter(t => t.length > 0).join('\n\n');
                if (fullDesc) descBuffer.push(fullDesc);
            }
            
            const techData = [];
            document.querySelectorAll('table.dv_characteristicsTable tr').forEach(row => {
                const cells = row.querySelectorAll('td');
                if(cells.length === 2) techData.push(`${cells[0].innerText.trim()}: ${cells[1].innerText.trim()}`);
            });

            const foundImages = [];
            const seenIds = new Set();
            document.querySelectorAll('[data-image-id]').forEach(slide => {
                const id = slide.getAttribute('data-image-id');
                if (id && id.length > 5 && !seenIds.has(id)) {
                    seenIds.add(id);
                    foundImages.push(`https://i.otto.de/i/otto/${id}`);
                }
            });
            if (foundImages.length === 0) {
                document.querySelectorAll('.pdp_main-image__image').forEach(img => {
                    if(img.src) foundImages.push(img.src.split('?')[0]);
                });
            }

            return { title, rawPrice: priceStr, description: descBuffer.join('\n\n'), techData, images: foundImages };
        });

        if(!data || !data.title) throw new Error("Keine Produktdaten gefunden.");

        let energyLabel = null;
        try {
            const labelEl = await page.$('[data-qa="energy-efficiency-label-badge"]');
            if(labelEl) {
                const content = await page.evaluate(el => el.getAttribute('data-sheet-content'), labelEl);
                if (content && content.includes('src=')) {
                    const m = content.match(/src="([^"]+)"/);
                    if(m) energyLabel = m[1].replaceAll('&amp;', '&');
                }
            }
        } catch(e) {}

        if(energyLabel && data.images) {
            if(!data.images.includes(energyLabel)) data.images.splice(1, 0, energyLabel);
        }

        return { 
            ...data, 
            price: fromCentsToEuro(toCents(data.rawPrice)), 
            energyLabel, 
            url 
        };

    } catch(e) {
        logger.log('error', `[Otto Detail] Fehler bei ${url}: ${e.message}`);
        return null;
    } finally {
        if(page) await page.close().catch(() => {});
    }
}

module.exports = { searchOtto, scrapeOttoDetails };