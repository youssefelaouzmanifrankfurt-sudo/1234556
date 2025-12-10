// src/services/importService.js
const storage = require('../utils/storage');
const ottoScraper = require('../scrapers/ottoScraper');
const amazonScraper = require('../scrapers/amazonScraper'); // Amazon hinzufügen
const logger = require('../utils/logger');

// Konfiguration
const PRICE_FACTOR = 2.2; 

// Helper: Preis sicher parsen (egal ob "12.99" oder "12,99")
function parsePrice(input) {
    if (!input) return 0;
    // Entferne alles außer Zahlen, Punkt und Komma
    let clean = String(input).replace(/[^0-9.,]/g, '');
    // Ersetze Komma durch Punkt für JS Math
    clean = clean.replace(',', '.');
    return parseFloat(clean) || 0;
}

// Strategie-Wähler: Welcher Scraper ist zuständig?
const SCRAPERS = [
    { id: 'otto', check: (url) => url.includes('otto.de'), scraper: ottoScraper.scrapeOttoDetails },
    { id: 'amazon', check: (url) => url.includes('amazon'), scraper: amazonScraper.scrapeAmazonDetails }
];

async function createImportFromStock(stockItem) {
    if (!stockItem) return null;

    logger.log('info', `🤖 Import-Service: Erstelle Import für "${stockItem.title}"`);

    let description = "Automatisch erstellt aus Lagerbestand.";
    let images = stockItem.image ? [stockItem.image] : [];
    let sourceName = "Lagerbestand";

    // 1. Externen Scraper finden und ausführen
    if (stockItem.sourceUrl) {
        const handler = SCRAPERS.find(s => s.check(stockItem.sourceUrl));
        
        if (handler) {
            logger.log('info', `🔎 Erkannt: ${handler.id.toUpperCase()} - Starte Live-Scrape...`);
            try {
                const details = await handler.scraper(stockItem.sourceUrl);
                if (details) {
                    if (details.description) description = details.description;
                    if (details.images && details.images.length > 0) images = details.images;
                    sourceName += ` (${handler.id})`;
                }
            } catch (e) {
                logger.log('error', `Fehler beim ${handler.id}-Scrape: ` + e.message);
            }
        }
    }

    // 2. Preis berechnen (Sicherer Parse)
    const ekPrice = parsePrice(stockItem.purchasePrice);
    const vkPrice = ekPrice > 0 ? (ekPrice * PRICE_FACTOR).toFixed(2) : "VB";

    // 3. Import-Objekt bauen
    const newImport = {
        id: "IMP-" + Date.now(),
        title: stockItem.title,
        description: description,
        price: vkPrice,
        purchasePrice: ekPrice, // Auch EK speichern für Tracking
        images: images,
        source: sourceName,
        url: stockItem.sourceUrl || "",
        scannedAt: new Date().toLocaleDateString(),
        stockId: stockItem.id 
    };

    // 4. Speichern
    const importedList = storage.loadExternal();
    importedList.push(newImport);
    storage.saveExternal(importedList);

    return newImport;
}

module.exports = {
    createImportFromStock
};