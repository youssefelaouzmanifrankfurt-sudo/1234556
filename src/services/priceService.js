// src/services/priceService.js
const ottoScraper = require('../scrapers/ottoScraper');
const idealoScraper = require('../scrapers/idealoScraper');
const logger = require('../utils/logger');
const { toCents, fromCentsToEuro } = require('../utils/formatter');

// Helper: Ergebnisse einheitlich formatieren
function formatResults(list, source) {
    if (!list || !Array.isArray(list)) return [];
    
    return list.slice(0, 3).map(item => {
        // [HYGIENE] Wir holen uns die Cents, um sicher zu sein, dass es eine Zahl ist
        const cents = toCents(item.price);
        return {
            title: item.title,
            price: fromCentsToEuro(cents), // Einheitliches String-Format für Frontend
            priceValue: cents / 100, // Float für Sortierung (falls nötig)
            image: item.img || item.image,
            url: item.url,
            source: source
        };
    });
}

async function searchMarketPrices(query) {
    if (!query || query.length < 3) return [];
    
    logger.log('info', `🔎 Preis-Check Service: "${query}"`);

    // Parallel suchen für Geschwindigkeit
    const [rOtto, rIdealo] = await Promise.all([
        ottoScraper.searchOtto(query).catch(e => {
            logger.log('error', `Otto Fehler: ${e.message}`); 
            return [];
        }),
        idealoScraper.searchIdealo(query).catch(e => {
            logger.log('error', `Idealo Fehler: ${e.message}`);
            return [];
        })
    ]);

    let allResults = [];
    if (rOtto) allResults.push(...formatResults(rOtto, 'Otto'));
    if (rIdealo) allResults.push(...formatResults(rIdealo, 'Idealo'));

    return allResults;
}

module.exports = {
    searchMarketPrices
};