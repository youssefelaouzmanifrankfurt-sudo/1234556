// src/socket/stock/reader.js
const stockService = require('../../services/stockService');
const inventoryService = require('../../services/inventoryService');
const priceService = require('../../services/priceService');
const matchService = require('../../services/matchService');
const { getBestImage } = require('./helpers');

module.exports = (io, socket) => {
    
    // Lagerbestand abrufen
    socket.on('get-stock', () => {
        const stock = stockService.getAll();
        const inventory = inventoryService.getAll();
        const inventoryMap = new Map(inventory.map(ad => [ad.id, ad]));

        const enrichedStock = stock.map(item => {
            let adStatus = 'OFFLINE';
            let displayImage = item.image;
            let linkedAd = null;

            if (item.linkedAdId && inventoryMap.has(item.linkedAdId)) {
                linkedAd = inventoryMap.get(item.linkedAdId);
            } else if (item.title) {
                linkedAd = inventory.find(ad => ad.title && ad.title.toLowerCase() === item.title.toLowerCase());
            }

            if (linkedAd) {
                adStatus = linkedAd.status || 'ACTIVE';
                if (!displayImage) displayImage = getBestImage(linkedAd);
            }

            let trafficStatus = 'grey'; 
            const qty = parseInt(item.quantity) || 0;
            const isOnline = (adStatus === 'ACTIVE');

            if (qty > 0 && isOnline) trafficStatus = 'green';
            else if (qty > 0 && !isOnline) trafficStatus = 'yellow';
            else if (qty <= 0 && isOnline) trafficStatus = 'red';

            return { 
                ...item, 
                onlineStatus: adStatus, 
                isLinked: !!item.linkedAdId, 
                image: displayImage, 
                trafficStatus 
            };
        });
        socket.emit('update-stock', enrichedStock);
    });

    // Preissuche
    socket.on('search-price-sources', async (query) => {
        try {
            const results = await priceService.searchMarketPrices(query);
            socket.emit('price-search-results', results);
        } catch (e) {
            socket.emit('price-search-results', []);
        }
    });

    // DB Match Suche
    socket.on('request-db-match', (stockId) => {
        const item = stockService.getAll().find(i => i.id === stockId);
        if (!item) return;
        const candidates = matchService.findMatchesForStockItem(item.title);
        socket.emit('db-match-result', { found: true, stockId, candidates });
    });
};