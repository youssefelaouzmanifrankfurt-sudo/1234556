// src/socket/stock/writer.js
const stockService = require('../../services/stockService');
const inventoryService = require('../../services/inventoryService');
const importService = require('../../services/importService');
const logger = require('../../utils/logger');

module.exports = (io, socket) => {

    // Wrapper für sicheres Error-Handling
    const safeExec = (name, fn) => {
        try {
            fn();
        } catch (e) {
            logger.log('error', `Socket Error [${name}]: ${e.message}`);
            socket.emit('error-notification', { message: `Fehler: ${e.message}` });
        }
    };

    socket.on('create-new-stock', (data) => {
        safeExec('create-new-stock', () => {
            // [FIX] Timestamp-basierte SKU statt random (verhindert Duplikate)
            const generatedSku = "LAGER-" + Date.now().toString(36).toUpperCase();
            const sku = data.sku || generatedSku;
            
            stockService.createNewItem(data.title, { 
                ...data, 
                sku, 
                // Preise werden jetzt im Service formatiert, hier nur durchreichen
                lastPriceCheck: new Date().toLocaleDateString()
            });
            io.emit('force-reload-stock');
        });
    });

    socket.on('update-stock-details', (d) => { 
        safeExec('update-stock-details', () => {
            stockService.updateDetails(d.id, d); 
            io.emit('force-reload-stock'); 
        });
    });

    socket.on('delete-stock-item', (id) => {
        safeExec('delete-stock-item', () => {
            const item = stockService.getAll().find(i => i.id === id);
            // Konsistenz-Check: Wenn verknüpft, auch aus Inventar löschen?
            // Aktuelle Logik: Ja.
            if (item && item.linkedAdId) {
                inventoryService.removeFromStock(item.linkedAdId);
                io.emit('update-db-list', inventoryService.getAll());
            }
            stockService.delete(id);
            io.emit('force-reload-stock');
        });
    });

    socket.on('update-stock-qty', (data) => {
        safeExec('update-stock-qty', () => {
            const updatedList = stockService.updateQuantity(data.id, data.delta);
            const item = updatedList.find(i => i.id === data.id);
            
            // Automatische Synchronisation (Lagerbestand 0 -> Nicht mehr im Inventar)
            if (item && item.linkedAdId) {
                if (item.quantity <= 0) inventoryService.removeFromStock(item.linkedAdId);
                else inventoryService.markAsInStock(item.linkedAdId);
                
                io.emit('update-db-list', inventoryService.getAll());
            }
            io.emit('force-reload-stock');
        });
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
            logger.log('error', `Import Fehler: ${e.message}`);
            socket.emit('export-error', e.message);
        }
    });

    socket.on('confirm-link', (data) => {
        safeExec('confirm-link', () => {
            stockService.linkToAd(data.stockId, data.adId, data.adImage);
            inventoryService.markAsInStock(data.adId);
            io.emit('force-reload-stock');
            io.emit('update-db-list', inventoryService.getAll());
        });
    });

    socket.on('unlink-stock-item', (stockId) => {
        safeExec('unlink-stock-item', () => {
            const item = stockService.getAll().find(i => i.id === stockId);
            if (item && item.linkedAdId) {
                inventoryService.removeFromStock(item.linkedAdId);
                
                // Lokal update (Memory) -> Service persistiert es beim nächsten Update
                item.linkedAdId = null;
                stockService.updateDetails(item.id, { linkedAdId: null });
                
                io.emit('update-db-list', inventoryService.getAll());
                io.emit('force-reload-stock');
            }
        });
    });

    socket.on('check-scan', (query) => {
        safeExec('check-scan', () => {
            const stockItem = stockService.findInStock(query);
            if (stockItem) {
                const updatedList = stockService.incrementQuantity(stockItem.id);
                const updatedItem = updatedList.find(i => i.id === stockItem.id);
                
                // Wieder verfügbar -> ins Inventar
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
    });
};