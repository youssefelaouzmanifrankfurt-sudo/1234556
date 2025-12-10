// src/services/stockService.js
const storage = require('../utils/storage');
const logger = require('../utils/logger');
const JsonStore = require('../utils/JsonStore'); // Unser neuer Store
const { findBestMatch } = require('../utils/similarity');

class StockService extends JsonStore {
    constructor() {
        // Wir initialisieren den Store mit dem Pfad aus storage.js
        super(storage.getStockPath());
        logger.log('info', "[SERVICE] StockService gestartet (In-Memory Mode).");
    }
    
    // Überschreibt die load Methode des Parent, falls wir Custom Logic bräuchten
    // Aber eigentlich reicht die Parent-Logik.
    // getAll() kommt jetzt automatisch vom JsonStore (Parent).

    findInStock(name) {
        if(!name) return null;
        const list = this.getAll(); // Zugriff auf RAM
        
        // 1. Exakter SKU Match
        const skuMatch = list.find(i => i.sku && i.sku.toLowerCase() === name.toLowerCase());
        if (skuMatch) return skuMatch;

        // 2. Fuzzy Match
        const matchResult = findBestMatch(name, list);
        if (matchResult.item && matchResult.score > 0.80) {
            return matchResult.item;
        }
        return null;
    }

    checkScanMatch(name) { return this.findInStock(name); }

    incrementQuantity(id) {
        // Nutzt die update() Methode des JsonStore für sicheres Schreiben
        this.update(id, (item) => {
            item.quantity = (parseInt(item.quantity) || 0) + 1;
            item.lastScanned = new Date().toLocaleString();
            logger.log('success', `Bestand erhöht: ${item.title} (+1)`);
            return item;
        });
        return this.getAll();
    }

    createNewItem(name, details = {}) {
        const newItem = {
            id: "STOCK-" + Date.now(),
            title: name,
            quantity: parseInt(details.quantity) || 1,
            location: details.location || "Lager",
            
            purchasePrice: parseFloat(details.purchasePrice) || 0,
            marketPrice: parseFloat(details.marketPrice) || 0,
            
            sku: details.sku || ("SKU-" + Date.now()),
            minQuantity: parseInt(details.minQuantity) || 0,
            
            sourceUrl: details.sourceUrl || "",
            sourceName: details.sourceName || "",
            
            linkedAdId: details.linkedAdId || null,
            image: details.image || null,
            
            scannedAt: new Date().toLocaleString(),
            lastPriceCheck: details.lastPriceCheck || null
        };
        
        // add() speichert automatisch
        this.add(newItem);
        logger.log('info', `Neu im Lager: ${name}`);
        return this.getAll();
    }

    linkToAd(stockId, adId, adImage) {
        let success = false;
        this.update(stockId, (item) => {
            item.linkedAdId = adId;
            if(adImage) item.image = adImage;
            success = true;
            return item;
        });
        return success;
    }

    updateDetails(id, data) {
        this.update(id, (item) => {
            if (data.title) item.title = data.title;
            if (data.location) item.location = data.location;
            if (data.purchasePrice) item.purchasePrice = parseFloat(data.purchasePrice);
            if (data.quantity) item.quantity = parseInt(data.quantity);
            
            if (data.sku) item.sku = data.sku;
            if (data.marketPrice) item.marketPrice = data.marketPrice;
            if (data.sourceUrl) item.sourceUrl = data.sourceUrl;
            if (data.sourceName) item.sourceName = data.sourceName;
            
            if (data.linkedAdId !== undefined) item.linkedAdId = data.linkedAdId;
            if (data.image !== undefined) item.image = data.image;
            return item;
        });
        return this.getAll();
    }

    updateQuantity(id, delta) {
        this.update(id, (item) => {
            item.quantity = (parseInt(item.quantity) || 0) + delta;
            if (item.quantity < 0) item.quantity = 0;
            return item;
        });
        return this.getAll();
    }

    // delete ist bereits im Parent (JsonStore) implementiert,
    // aber wir behalten die return-Signatur (Boolean vs List) im Auge.
    // JsonStore.delete gibt true/false zurück.
    // Dein alter Code gab true zurück. Das passt.
}

module.exports = new StockService();