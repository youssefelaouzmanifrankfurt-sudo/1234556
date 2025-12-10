// src/scrapers/db/worker.js
const logger = require('../../utils/logger');
const config = require('./config');
const { parseDetailInBrowser } = require('./parsers');

async function processQueue(browser, queue) {
    if (queue.length === 0) return;

    logger.log('info', `⚡ Deep-Scan: ${queue.length} Anzeigen in Queue.`);

    const createWorker = async (workerId) => {
        let page = null;
        try {
            page = await browser.newPage();
            
            // Performance: Unnötiges blockieren
            await page.setRequestInterception(true);
            page.on('request', r => {
                const type = r.resourceType();
                if (['image', 'stylesheet', 'font', 'media'].includes(type)) r.abort();
                else r.continue();
            });

            while (queue.length > 0) {
                const targetAd = queue.shift();
                if (!targetAd) break; 

                let success = false;
                // Retry Loop (2 Versuche)
                for (let attempt = 1; attempt <= 2; attempt++) {
                    if (success) break;
                    try {
                        await page.goto(targetAd.url, { waitUntil: 'domcontentloaded', timeout: config.PAGE_TIMEOUT });
                        
                        const details = await page.evaluate(parseDetailInBrowser);
                        if (details) {
                            // Daten direkt in das Objekt schreiben (Call by Reference)
                            Object.assign(targetAd, details);
                            success = true;
                        }
                    } catch (e) {
                        if (attempt === 2) logger.log('warn', `[W${workerId}] Skip ${targetAd.id} nach Fehler.`);
                        try { await page.goto('about:blank'); } catch(err){}
                        await new Promise(r => setTimeout(r, 2000));
                    }
                }
                
                if(success) await new Promise(r => setTimeout(r, config.MIN_DELAY));
            }
        } catch(err) {
            logger.log('error', `Worker ${workerId} Crash: ${err.message}`);
        } finally {
            if(page) await page.close().catch(()=>{});
        }
    };

    // Worker Pool starten
    const activeWorkers = [];
    const numWorkers = Math.min(config.CONCURRENT_TABS, queue.length);
    for(let i=0; i < numWorkers; i++) activeWorkers.push(createWorker(i + 1));
    
    await Promise.all(activeWorkers);
}

module.exports = { processQueue };