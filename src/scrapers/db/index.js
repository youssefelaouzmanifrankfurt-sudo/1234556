// src/scrapers/db/index.js
const { getDbPage } = require('../chat/connection');
const logger = require('../../utils/logger');
const { parseListInBrowser } = require('./parsers');

// Module
const nav = require('./navigation');
const merger = require('./merger');
const worker = require('./worker');
const config = require('./config');

async function scrapeMyAds(existingAds = [], progressCallback) {
    const mainPage = await getDbPage();
    
    // SAFETY 1
    if (!mainPage) {
        logger.log('error', '❌ Scan Fehler: Kein Browser Page.');
        return null;
    }

    logger.log('info', `🚀 Scan Start (Auto-Retry aktiv)...`);

    // Init & Login Check
    const isReady = await nav.initPage(mainPage);
    if (!isReady) return null;

    let finalAdsList = []; 
    let pageNum = 1;
    let hasNextPage = true;

    while (hasNextPage) {
        logger.log('info', `📄 Scanne Seite ${pageNum}...`);
        await nav.forceVisibility(mainPage);

        // A) Liste lesen
        let liveAds = [];
        try {
            liveAds = await mainPage.evaluate(parseListInBrowser);
        } catch(e) {
            logger.log('warn', 'Fehler beim Lesen, versuche Reload...');
            await mainPage.reload({ waitUntil: 'domcontentloaded' });
            liveAds = await mainPage.evaluate(parseListInBrowser);
        }

        // B) Mergen & Queue
        const mergedAds = merger.mergeData(liveAds, existingAds);
        const deepScanQueue = merger.identifyMissingDetails(mergedAds);

        // C) Deep Scan
        if (deepScanQueue.length > 0) {
            await worker.processQueue(mainPage.browser(), deepScanQueue);
        }

        finalAdsList = finalAdsList.concat(mergedAds);

        // D) Nächste Seite
        hasNextPage = await nav.goToNextPage(mainPage);
        if (hasNextPage) pageNum++;
        
        if(progressCallback) progressCallback(finalAdsList.length, "unbekannt");
    }

    // SAFETY 3: Plausibilitäts-Check bei 0 Treffern
    if (finalAdsList.length === 0 && pageNum === 1) {
         try {
             const noAdsText = await mainPage.evaluate(() => document.body.innerText.includes("Keine Anzeigen"));
             if (!noAdsText) {
                 logger.log('warning', '⚠️ Scan ergab 0 Treffer, aber "Keine Anzeigen" Text fehlt. Sicherheitshalber Abbruch.');
                 return null;
             }
         } catch(e) {}
    }

    logger.log('success', `✅ Fertig! ${finalAdsList.length} Anzeigen gescannt.`);
    
    // Aufräumen
    try { await mainPage.goto(config.URL_MY_ADS); } catch(e){}
    
    return finalAdsList;
}

module.exports = { scrapeMyAds };