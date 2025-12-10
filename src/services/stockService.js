// src/services/stockService.js
const storage = require('../utils/storage');
const logger = require('../utils/logger');
const JsonStore = require('../utils/JsonStore'); 
const { findBestMatch } = require('../utils/similarity');
// [ARCHITECT] Wir brauchen den Formatter für sichere Preise
const { toCents, fromCentsToEuro } = require('../utils/formatter'); 

class StockService extends JsonStore {
    constructor() {
        // Pfad zur Stock-Datei laden
        super(storage.getStockPath());
        logger.log('info', "[SERVICE] StockService gestartet.");
    }

    findInStock(name) {
        if(!name) return null;
        const list = this.getAll();
        
        // 1. Exakter SKU Match (Case Insensitive)
        const skuMatch = list.find(i => i.sku && i.sku.toLowerCase() === name.toLowerCase());
        if (skuMatch) return skuMatch;

        // 2. Fuzzy Match (Toleranz für Tippfehler)
        const matchResult = findBestMatch(name, list);
        if (matchResult.item && matchResult.score > 0.80) {
            return matchResult.item;
        }
        return null;
    }

    checkScanMatch(name) { return this.findInStock(name); }

    createNewItem(title, data = {}) {
        // [HYGIENE] Daten bereinigen bevor sie in die DB kommen
        const newItem = {
            ...data,
            id: data.id || "STOCK-" + Date.now(), // Fallback ID
            title: title,
            // WICHTIG: Preise via Formatter normalisieren ("19,99" -> "19.99")
            purchasePrice: fromCentsToEuro(toCents(data.purchasePrice)),
            marketPrice: fromCentsToEuro(toCents(data.marketPrice)),
            quantity: parseInt(data.quantity) || 0,
            createdAt: new Date().toISOString()
        };
        return this.add(newItem);
    }

    updateDetails(id, data) {
        this.update(id, (item) => {
            if (data.title) item.title = data.title;
            if (data.location) item.location = data.location;
            
            // [HYGIENE] Float-Parsing entfernt! Wir nutzen den sicheren Formatter.
            if (data.purchasePrice !== undefined) {
                 item.purchasePrice = fromCentsToEuro(toCents(data.purchasePrice));
            }
            if (data.marketPrice !== undefined) {
                item.marketPrice = fromCentsToEuro(toCents(data.marketPrice));
            }

            if (data.quantity !== undefined) item.quantity = parseInt(data.quantity);
            if (data.sku) item.sku = data.sku;
            if (data.sourceUrl) item.sourceUrl = data.sourceUrl;
            if (data.sourceName) item.sourceName = data.sourceName;
            
            if (data.linkedAdId !== undefined) item.linkedAdId = data.linkedAdId;
            if (data.image !== undefined) item.image = data.image;
            
            // Tracking Update
            item.updatedAt = new Date().toISOString();
            
            return item;
        });
        // Socket Writer erwartet die komplette Liste zurück
        return this.getAll();
    }

    updateQuantity(id, delta) {
        this.update(id, (item) => {
            const current = parseInt(item.quantity) || 0;
            let newVal = current + delta;
            // Keine negativen Lagerbestände
            if (newVal < 0) newVal = 0;
            item.quantity = newVal;
            return item;
        });
        return this.getAll();
    }

    incrementQuantity(id) {
        return this.updateQuantity(id, 1);
    }
    
    linkToAd(stockId, adId, adImage) {
        this.update(stockId, (item) => {
            item.linkedAdId = adId;
            if (adImage) item.image = adImage;
            return item;
        });
        return true;
    }
}

// Singleton Export (Wie vorher)
module.exports = new StockService();