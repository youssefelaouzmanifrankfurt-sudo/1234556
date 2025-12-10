// src/socket/stock/writer.js
const stockService = require('../../services/stockService');
const inventoryService = require('../../services/inventoryService');
const importService = require('../../services/importService');

module.exports = (io, socket) => {

    socket.on('create-new-stock', (data) => {
        const sku = data.sku || ("LAGER-" + Math.floor(Math.random() * 10000));
        stockService.createNewItem(data.title, { 
            ...data, sku, marketPrice: data.marketPrice || 0,
            lastPriceCheck: new Date().toLocaleDateString()
        });
        io.emit('force-reload-stock');
    });

    socket.on('update-stock-details', (d) => { 
        stockService.updateDetails(d.id, d); 
        io.emit('force-reload-stock'); 
    });

    socket.on('delete-stock-item', (id) => {
        const item = stockService.getAll().find(i => i.id === id);
        if (item && item.linkedAdId) {
            inventoryService.removeFromStock(item.linkedAdId);
            io.emit('update-db-list', inventoryService.getAll());
        }
        stockService.delete(id);
        io.emit('force-reload-stock');
    });

    socket.on('update-stock-qty', (data) => {
        const updatedStock = stockService.updateQuantity(data.id, data.delta);
        const item = updatedStock.find(i => i.id === data.id);
        if (item && item.linkedAdId) {
            if (item.quantity <= 0) inventoryService.removeFromStock(item.linkedAdId);
            else inventoryService.markAsInStock(item.linkedAdId);
            io.emit('update-db-list', inventoryService.getAll());
        }
        io.emit('force-reload-stock');
    });

    socket.on('auto-create-ad', async (stockId) => {
        const item = stockService.getAll().find(i => i.id === stockId);
        if (!item) return;
        socket.emit('export-progress', "Starte Import...");
        try {
            await importService.createImportFromStock(item);
            io.emit('reload-imported'); 
            socket.emit('export-success', "Erfolgreich importiert.");
        } catch(e) {
            socket.emit('export-error', e.message);
        }
    });

    socket.on('confirm-link', (data) => {
        stockService.linkToAd(data.stockId, data.adId, data.adImage);
        inventoryService.markAsInStock(data.adId);
        io.emit('force-reload-stock');
        io.emit('update-db-list', inventoryService.getAll());
    });

    socket.on('unlink-stock-item', (stockId) => {
        const item = stockService.getAll().find(i => i.id === stockId);
        if (item && item.linkedAdId) {
            inventoryService.removeFromStock(item.linkedAdId);
            item.linkedAdId = null;
            stockService.updateDetails(item.id, item);
            io.emit('update-db-list', inventoryService.getAll());
            io.emit('force-reload-stock');
        }
    });

    socket.on('check-scan', (query) => {
        const stockItem = stockService.findInStock(query);
        if (stockItem) {
            const updatedList = stockService.incrementQuantity(stockItem.id);
            const updatedItem = updatedList.find(i => i.id === stockItem.id);
            if(updatedItem && updatedItem.quantity === 1 && updatedItem.linkedAdId) {
                inventoryService.markAsInStock(updatedItem.linkedAdId);
                io.emit('update-db-list', inventoryService.getAll());
            }
            io.emit('force-reload-stock');
            socket.emit('scan-result', { type: 'FOUND_STOCK', item: stockItem });
        } else {
            socket.emit('scan-result', { type: 'NOT_FOUND', scannedName: query });
        }
    });
};