// src/scrapers/featureScraper.js
const { getDbPage } = require('./chat/connection');
const logger = require('../utils/logger');
const { parseListInBrowser } = require('./db/parsers'); // Wir importieren den "Profi"-Parser

/**
 * Scannt eine einzelne Anzeige erneut, indem es die Seite lädt 
 * und den zentralen Parser nutzt.
 */
async function refreshSingleAd(adId) {
    const page = await getDbPage();
    if (!page) return null;

    logger.log('info', `🔍 Prüfe Anzeige ${adId} im Detail...`);

    try {
        // 1. Seite sicherstellen
        if (!page.url().includes('m-meine-anzeigen')) {
            await page.goto('https://www.kleinanzeigen.de/m-meine-anzeigen.html');
        } else {
            await page.reload({ waitUntil: 'domcontentloaded' });
        }
        
        await new Promise(r => setTimeout(r, 1500)); // Kurz warten bis React da ist

        // 2. TRICK: Wir nutzen exakt dieselbe Funktion wie beim großen Scan!
        // Puppeteer kann die Funktion in den Browser übertragen.
        // Dadurch müssen wir die Logik nicht doppelt pflegen.
        const allAdsOnPage = await page.evaluate(parseListInBrowser);

        // 3. Wir suchen uns einfach das eine Element raus, das wir brauchen
        const foundAd = allAdsOnPage.find(ad => ad.id === String(adId));

        if (foundAd) {
            return foundAd;
        } else {
            logger.log('warning', `Anzeige ${adId} auf der aktuellen Seite nicht gefunden.`);
            return null;
        }

    } catch (e) {
        logger.log('error', `Single Scrape Error: ${e.message}`);
        return null;
    }
}

module.exports = { refreshSingleAd };