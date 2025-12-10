// src/services/priceService.js
const ottoScraper = require('../scrapers/ottoScraper');
const idealoScraper = require('../scrapers/idealoScraper');
const logger = require('../utils/logger');

// Helper: Preis bereinigen (aus "19,99 €" mach 19.99)
function parsePrice(str) {
    if (typeof str === 'number') return str;
    if (!str) return 0;
    return parseFloat(str.replace(/[^0-9,]/g, '').replace(',', '.')) || 0;
}

// Helper: Ergebnisse einheitlich formatieren
function formatResults(list, source) {
    if (!list || !Array.isArray(list)) return [];
    return list.slice(0, 3).map(item => ({
        title: item.title,
        price: parsePrice(item.price),
        image: item.img || item.image,
        url: item.url,
        source: source
    }));
}

async function searchMarketPrices(query) {
    if (!query || query.length < 3) return [];
    
    logger.log('info', `🔎 Preis-Check Service: "${query}"`);

    // Parallel suchen für Geschwindigkeit
    const [rOtto, rIdealo] = await Promise.all([
        ottoScraper.searchOtto(query).catch(e => []),
        idealoScraper.searchIdealo(query).catch(e => [])
    ]);

    let allResults = [];
    if (rOtto) allResults.push(...formatResults(rOtto, 'Otto'));
    if (rIdealo) allResults.push(...formatResults(rIdealo, 'Idealo'));

    return allResults;
}

module.exports = {
    searchMarketPrices
};