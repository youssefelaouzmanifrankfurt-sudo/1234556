// src/services/inventory/actions.js
const store = require('./store');

// Lager Status setzen
const markAsInStock = (adId, stockLocation) => {
    const db = store.getAll();
    const ad = db.find(i => i.id === adId);
    if (ad) {
        ad.inStock = true;
        const tag = " [LAGER]";
        if (!ad.internalNote) ad.internalNote = "";
        if (!ad.internalNote.includes(tag)) ad.internalNote += tag;
        if (stockLocation) ad.stockLocation = stockLocation;
        store.saveAll(db);
        return true;
    }
    return false;
};

// Lager Status entfernen
const removeFromStock = (adId) => {
    const db = store.getAll();
    const ad = db.find(i => i.id === adId);
    if (ad) {
        ad.inStock = false;
        ad.stockLocation = null;
        
        // Tag aus Notiz entfernen
        if (ad.internalNote) {
            ad.internalNote = ad.internalNote.replace(" [LAGER]", "").trim();
        }
        
        store.saveAll(db);
        return true;
    }
    return false;
};

// Feature hinzufügen
const addFeature = (id, type, endDate) => {
    const db = store.getAll();
    const item = db.find(i => i.id === id);
    if (item) {
        if (!item.features) item.features = [];
        item.features = item.features.filter(f => f.type !== type);
        item.features.push({ type, endDate, active: true });
        store.saveAll(db);
    }
    return db;
};

// Entwurf aus Lagerbestand erstellen
const addFromStock = (stockItem) => {
    const db = store.getAll();
    const exists = db.find(i => i.title === stockItem.title);
    if (exists) return false; 

    const newAd = {
        id: "DRAFT-" + Date.now(),
        title: stockItem.title,
        price: stockItem.purchasePrice ? (parseFloat(stockItem.purchasePrice) * 2) + " €" : "VB",
        description: "Aus Lagerbestand importiert. Bitte bearbeiten.",
        images: [],
        uploadDate: new Date().toLocaleDateString('de-DE'),
        status: 'DRAFT', 
        active: false,
        views: 0,
        favorites: 0,
        inStock: true,
        internalNote: `Lagerort: ${stockItem.location || 'Unbekannt'} [LAGER]`
    };

    db.push(newAd);
    store.saveAll(db);
    return true;
};

module.exports = { markAsInStock, removeFromStock, addFeature, addFromStock };