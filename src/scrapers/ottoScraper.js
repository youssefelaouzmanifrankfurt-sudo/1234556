// src/scrapers/ottoScraper.js
const { getBrowser } = require('./chat/connection');
const logger = require('../utils/logger');

async function searchOtto(query, pageNum = 1) {
    const browser = await getBrowser();
    if (!browser) return [];
    const page = await browser.newPage();

    try {
        await page.setViewport({ width: 1280, height: 800 });
        const offset = (pageNum - 1) * 20;
        let searchUrl = `https://www.otto.de/suche/${encodeURIComponent(query)}`;
        if (pageNum > 1) searchUrl += `?o=${offset}`;
        
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
        try {
            const cookieBtn = await page.waitForSelector('#onetrust-accept-btn-handler', {timeout: 2000});
            if(cookieBtn) await cookieBtn.click();
        } catch(e){}
        
        await autoScroll(page);
        await new Promise(r => setTimeout(r, 1000));

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
                        price: priceEl ? priceEl.innerText.trim() : '0',
                        img: imgSrc,
                        url: linkEl.href,
                        source: 'Otto'
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

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 150;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if(totalHeight >= scrollHeight || totalHeight > 4000){
                    clearInterval(timer); resolve();
                }
            }, 50);
        });
    });
}

async function scrapeOttoDetails(url) {
    const browser = await getBrowser();
    const page = await browser.newPage();
    logger.log('info', 'Lade Details von Otto...');
    
    try {
        await page.setViewport({ width: 1280, height: 900 });
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        try {
            const cookieBtn = await page.waitForSelector('#onetrust-accept-btn-handler', {timeout: 3000});
            if(cookieBtn) await cookieBtn.click();
            await new Promise(r => setTimeout(r, 1000)); 
        } catch(e){}

        const baseData = await page.evaluate(() => {
            const getText = (sel) => document.querySelector(sel)?.innerText.trim() || '';
            const title = getText('h1'); 
            let price = getText('.p_price__regular') || getText('.js_pdp_price__retail-price__value_') || getText('[data-qa="price"]');
            
            let descriptionParts = [];
            const listItems = document.querySelectorAll('.js_pdp_selling-points li');
            if(listItems.length > 0) {
                const points = Array.from(listItems).map(li => "• " + li.innerText.trim()).join('\n');
                descriptionParts.push(points);
            }
            const descContainer = document.querySelector('.js_pdp_description');
            if (descContainer) {
                const paragraphs = descContainer.querySelectorAll('p');
                const fullDesc = Array.from(paragraphs).map(p => p.innerText.trim()).filter(t => t.length > 0).join('\n\n');
                if (fullDesc) descriptionParts.push(fullDesc);
            } else {
                 const simpleDesc = getText('.product-description');
                 if(simpleDesc) descriptionParts.push(simpleDesc);
            }
            const description = descriptionParts.join('\n\n');

            const techData = [];
            const tables = document.querySelectorAll('table.dv_characteristicsTable');
            tables.forEach(table => {
                const caption = table.querySelector('caption')?.innerText;
                if(caption) techData.push(`### ${caption} ###`);
                const rows = table.querySelectorAll('tr');
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if(cells.length === 2) {
                        techData.push(`${cells[0].innerText.trim()}: ${cells[1].innerText.trim()}`);
                    }
                });
            });
            return { title, price, description, techData };
        });

        // --- ENERGIELABEL SUCHE (Aggressiver) ---
        let energyLabel = 'Unbekannt';
        try {
            // Methode 1: Klassischer Button
            let labelDiv = await page.$('.pdp_eek__label');
            if (!labelDiv) labelDiv = await page.$('[data-qa="energy-efficiency-label-badge"]'); // Neuer Selektor
            
            if (labelDiv) {
                // Manchmal steht das Bild direkt im Attribut
                const content = await page.evaluate(el => el.getAttribute('data-sheet-content'), labelDiv);
                if (content) {
                    const match = content.match(/src="([^"]+)"/);
                    if (match && match[1]) energyLabel = match[1].replaceAll('&amp;', '&');
                } else {
                    // Manchmal muss man klicken
                    await labelDiv.click();
                    await new Promise(r => setTimeout(r, 500));
                    energyLabel = await page.evaluate(() => {
                        const img = document.querySelector('.pdp_eek__layer-image');
                        return img ? img.src : 'Unbekannt';
                    });
                }
            }
        } catch(e) {
            logger.log('warning', 'Otto E-Label Fehler: ' + e.message);
        }

        const images = await page.evaluate(() => {
            const found = [];
            const seenIds = new Set();
            const slides = document.querySelectorAll('[data-image-id]');
            slides.forEach(slide => {
                const id = slide.getAttribute('data-image-id');
                if (id && id.length > 10 && !seenIds.has(id)) {
                    seenIds.add(id);
                    found.push(`https://i.otto.de/i/otto/${id}`);
                }
            });
            if (found.length === 0) {// src/scrapers/ottoScraper.js
const { getBrowser } = require('./chat/connection');
const logger = require('../utils/logger');

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
        
        // Cookie Banner schnell wegklicken
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
                        // Otto nutzt oft srcset für hochauflösende Bilder
                        if (!imgSrc && imgEl.srcset) imgSrc = imgEl.srcset.split(',')[0].split(' ')[0];
                    }
                    data.push({
                        title: titleEl.innerText.trim(),
                        price: priceEl ? priceEl.innerText.trim() : '0',
                        img: imgSrc,
                        url: linkEl.href,
                        source: 'Otto'
                    });
                }
            });
            return data;
        });
        
        return results;

    } catch (e) {
        logger.log('error', '[Otto Search] ' + e.message);
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
        // Desktop Viewport wichtig für Layout
        await page.setViewport({ width: 1280, height: 900 }); 
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

        // Cookie Klick (wichtig für Lazy Load Bilder)
        try {
            const cookieBtn = await page.waitForSelector('#onetrust-accept-btn-handler', {timeout: 3000});
            if(cookieBtn) await cookieBtn.click();
            await new Promise(r => setTimeout(r, 500)); 
        } catch(e){}

        const data = await page.evaluate(() => {
            const getText = (sel) => document.querySelector(sel)?.innerText.trim() || '';
            
            // Titel & Preis
            const title = getText('h1'); 
            let price = getText('.p_price__regular') || getText('.js_pdp_price__retail-price__value_') || getText('[data-qa="price"]');
            
            // Beschreibung bauen
            let descBuffer = [];
            
            // 1. Bullet Points
            const listItems = document.querySelectorAll('.js_pdp_selling-points li');
            if(listItems.length > 0) {
                descBuffer.push(Array.from(listItems).map(li => "• " + li.innerText.trim()).join('\n'));
            }
            
            // 2. Fließtext
            const descContainer = document.querySelector('.js_pdp_description');
            if (descContainer) {
                const paragraphs = descContainer.querySelectorAll('p');
                const fullDesc = Array.from(paragraphs).map(p => p.innerText.trim()).filter(t => t.length > 0).join('\n\n');
                if (fullDesc) descBuffer.push(fullDesc);
            }
            
            // Technische Daten
            const techData = [];
            document.querySelectorAll('table.dv_characteristicsTable tr').forEach(row => {
                const cells = row.querySelectorAll('td');
                if(cells.length === 2) techData.push(`${cells[0].innerText.trim()}: ${cells[1].innerText.trim()}`);
            });

            // Bilder holen
            const foundImages = [];
            const seenIds = new Set();
            // Otto API Bilder (hohe Qualität)
            document.querySelectorAll('[data-image-id]').forEach(slide => {
                const id = slide.getAttribute('data-image-id');
                if (id && id.length > 5 && !seenIds.has(id)) {
                    seenIds.add(id);
                    foundImages.push(`https://i.otto.de/i/otto/${id}`);
                }
            });
            // Fallback Bilder
            if (foundImages.length === 0) {
                document.querySelectorAll('.pdp_main-image__image').forEach(img => {
                    if(img.src) foundImages.push(img.src.split('?')[0]);
                });
            }

            return { title, price, description: descBuffer.join('\n\n'), techData, images: foundImages };
        });

        // Energie-Label Extraktion (Isoliert)
        let energyLabel = null;
        try {
            const labelEl = await page.$('[data-qa="energy-efficiency-label-badge"]');
            if(labelEl) {
                // Versuche, die URL aus dem Attribut zu lesen (ohne Klick)
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

        return { ...data, energyLabel, url };

    } catch(e) {
        logger.log('error', `[Otto Detail] Fehler bei ${url}: ${e.message}`);
        return null;
    } finally {
        // WICHTIG: Seite schließen, egal was passiert
        if(page) await page.close().catch(() => {});
    }
}

// Helper für Lazy-Loading
async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 200;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if(totalHeight >= scrollHeight || totalHeight > 3000){ // Max 3000px
                    clearInterval(timer); resolve();
                }
            }, 50);
        });
    });
}

module.exports = { searchOtto, scrapeOttoDetails };
                const imgs = document.querySelectorAll('.pdp_main-image__image');
                imgs.forEach(img => {
                    if(img.src) found.push(img.src.split('?')[0]);
                });
            }
            return found;
        });

        // --- ENERGIELABEL EINFÜGEN (Position 2) ---
        if (energyLabel !== 'Unbekannt') {
            if (!images.includes(energyLabel)) {
                if (images.length > 0) {
                    // An Index 1 einfügen (das ist die 2. Stelle)
                    images.splice(1, 0, energyLabel);
                } else {
                    images.push(energyLabel);
                }
            }
        }

        await page.close();
        return { ...baseData, energyLabel, images, url };

    } catch(e) {
        if(!page.isClosed()) await page.close();
        return null;
    }
}

module.exports = { searchOtto, scrapeOttoDetails };