// src/services/smartSearchService.js
const inventoryService = require('./inventoryService');
const stockService = require('./stockService');
const { findBestMatch } = require('../utils/similarity');

// --- SCRAPER ---
const ottoScraper = require('../scrapers/ottoScraper');
const idealoScraper = require('../scrapers/idealoScraper');
const amazonScraper = require('../scrapers/amazonScraper');
// const expertScraper = require('../scrapers/expertScraper'); // Optional

function parseGermanPrice(priceStr) {
    if (!priceStr) return 0;
    const clean = String(priceStr).replace(/\./g, '').replace(/[^0-9,]/g, '').replace(',', '.');
    return parseFloat(clean) || 0;
}

class SmartSearchService {

    /**
     * WORKFLOW SCHRITT 1 & 2:
     * Prüft Scan gegen Lager (Bestand) UND Archiv (Datenbank)
     */
    checkScan(query) {
        // 1. Zuerst im physischen LAGER schauen
        let result = stockService.checkScanMatch(query);
        
        // 2. Wenn NICHT im Lager, im ARCHIV (Kleinanzeigen DB) schauen
        if (!result.found) {
             const dbItems = inventoryService.getAll();
             const dbMatch = findBestMatch(query, dbItems);
             
             // Wir sind etwas strenger (0.65), damit wir keinen Müll importieren
             if (dbMatch.item && dbMatch.score > 0.65) { 
                 result = {
                     found: true,
                     isInventory: true, // WICHTIG: Markierung für "Aus Archiv"
                     scannedName: query,
                     candidate: {
                         id: dbMatch.item.id,
                         title: dbMatch.item.title, // Titel übernehmen
                         price: dbMatch.item.price, // Preis übernehmen
                         location: "Archiv / Datenbank",
                         quantity: 0,
                         status: dbMatch.item.status,
                         // Bild übernehmen (das erste verfügbare)
                         image: (dbMatch.item.images && dbMatch.item.images.length > 0) ? dbMatch.item.images[0] : null,
                         // WICHTIG: URL übernehmen für späteren Preisvergleich
                         sourceUrl: dbMatch.item.url || "" 
                     },
                     score: dbMatch.score
                 };
             }
        }
        return result;
    }

    /**
     * WORKFLOW SCHRITT 3:
     * Parallele Suche bei Händlern (wenn in Schritt 1 & 2 nichts gefunden wurde)
     */
    async searchSuggestions(query) {
        console.log(`[Smart Search] Starte Online-Suche für "${query}"...`);
        
        // Parallel Online Shops abfragen
        const pIdealo = idealoScraper.searchIdealo(query).catch(e => []);
        const pAmazon = amazonScraper.searchAmazon(query).catch(e => []);
        const pOtto = ottoScraper.searchOtto(query).catch(e => []);

        const [rIdealo, rAmazon, rOtto] = await Promise.all([pIdealo, pAmazon, pOtto]);

        let suggestions = [];

        // Wir priorisieren Idealo und Amazon
        if (rIdealo) suggestions = suggestions.concat(rIdealo.slice(0, 3));
        if (rAmazon) suggestions = suggestions.concat(rAmazon.slice(0, 3));
        if (rOtto) suggestions = suggestions.concat(rOtto.slice(0, 2));

        // Preise formatieren und Quelle sauber setzen
        return suggestions.map(s => ({
            ...s,
            priceVal: typeof s.price === 'number' ? s.price : parseGermanPrice(s.price),
            // Wichtig: Die URL kommt vom Scraper und wird hier durchgereicht
            sourceUrl: s.url 
        }));
    }
}

module.exports = new SmartSearchService();