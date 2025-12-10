// src/services/importService.js
const storage = require('../utils/storage');
const ottoScraper = require('../scrapers/ottoScraper');
const amazonScraper = require('../scrapers/amazonScraper');
const logger = require('../utils/logger');
const { toCents, fromCentsToEuro } = require('../utils/formatter'); // NEU

// Konfiguration
// 2.2 als Integer-Multiplikator behandeln (220%) oder math library nutzen.
// Hier simpel: Wir arbeiten mit Cents.
const PRICE_FACTOR = 2.2; 

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
            // ... (Logging und Scraping Logik bleibt gleich, Fehlerbehandlung ist ok) ...
            try {
                const details = await handler.scraper(stockItem.sourceUrl);
                if (details) {
                     // Defensive Kopie der Daten
                    if (details.description) description = details.description;
                    if (Array.isArray(details.images) && details.images.length > 0) images = details.images;
                    sourceName += ` (${handler.id})`;
                }
            } catch (e) {
                 logger.log('error', `Fehler beim ${handler.id}-Scrape: ` + e.message);
            }
        }
    }

    // 2. Preisberechnung (SAFE MODE)
    // Wir wandeln ALLES erst in Cents um.
    const ekCents = toCents(stockItem.purchasePrice);
    
    // Berechnung: Cents * Faktor. Ergebnis runden (da 2.2 Brüche erzeugt).
    const vkCents = Math.round(ekCents * PRICE_FACTOR);
    
    // Rückwandlung für die DB/UI (wenn das System Strings erwartet)
    // Wenn das System '19.99' (mit Punkt) erwartet, nutzen wir toFixed(2).
    // Wenn es deutsche UI Strings will '19,99', nutzen wir unsere Helper.
    // Basierend auf deinem Code returnst du Strings. Ich nehme Standard JS '19.99' für DB.
    
    const vkPrice = ekCents > 0 ? (vkCents / 100).toFixed(2) : "VB";
    const purchasePriceClean = (ekCents / 100).toFixed(2);

    // 3. Import-Objekt bauen
    const newImport = {
        id: "IMP-" + Date.now(),
        title: stockItem.title || "Unbekanntes Produkt", // Fallback
        description: description,
        price: vkPrice,
        purchasePrice: purchasePriceClean,
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

module.exports = { createImportFromStock };