// src/services/matchService.js
const inventoryService = require('./inventoryService');
const { compareStrings } = require('../utils/similarity');

// Helper: Bestes Bild finden
function getBestImage(adItem) {
    if (!adItem) return null;
    if (Array.isArray(adItem.images) && adItem.images.length > 0) return adItem.images[0];
    if (adItem.img && adItem.img.length > 5) return adItem.img;
    if (adItem.image && adItem.image.length > 5) return adItem.image;
    return null; 
}

function findMatchesForStockItem(stockItemTitle) {
    if (!stockItemTitle) return [];

    const inventory = inventoryService.getAll();
    
    const candidates = inventory.map(ad => {
        const score = compareStrings(stockItemTitle, ad.title);
        return {
            id: ad.id,
            title: ad.title,
            price: ad.price,
            image: getBestImage(ad),
            status: ad.status,
            score: score
        };
    });

    // Top 5 Treffer mit mehr als 30% Übereinstimmung
    return candidates
        .filter(c => c.score > 0.3) 
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
}

module.exports = {
    findMatchesForStockItem
};