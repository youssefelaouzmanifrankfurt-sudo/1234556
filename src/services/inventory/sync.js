// src/services/inventory/sync.js
const store = require('./store');

const syncWithScan = (scannedItems) => {
    const currentDB = store.getAll();
    let updatedDB = [];
    const dbMap = new Map(currentDB.map(item => [item.id, item]));
    const scannedIds = new Set();

    // 1. Neue und existierende Items verarbeiten
    scannedItems.forEach(newItem => {
        scannedIds.add(newItem.id);
        const existingItem = dbMap.get(newItem.id);

        if (existingItem) {
            // Merge Logik: Bestehende Daten behalten, neue ergänzen
            updatedDB.push({
                ...newItem,
                description: existingItem.description || newItem.description,
                images: (existingItem.images && existingItem.images.length > 0) ? existingItem.images : newItem.images,
                techData: (existingItem.techData && existingItem.techData.length > 0) ? existingItem.techData : newItem.techData,
                internalNote: existingItem.internalNote || "",
                isFavorite: existingItem.isFavorite || false,
                customTitle: existingItem.customTitle || "",
                features: existingItem.features || newItem.features,
                statsDiff: newItem.statsDiff || existingItem.statsDiff,
                status: newItem.status || 'ACTIVE',
                inStock: existingItem.inStock || false,
                stockLocation: existingItem.stockLocation || null
            });
        } else {
            // Komplett neues Item
            updatedDB.push({ ...newItem, status: newItem.status || 'ACTIVE', inStock: false });
        }
    });
    
    // 2. Nicht mehr gefundene Items markieren (Soft Delete)
    currentDB.forEach(oldItem => {
        if (!scannedIds.has(oldItem.id)) {
            updatedDB.push({
                ...oldItem,
                status: 'DELETED',
                active: false,
                features: []
            });
        }
    });
    
    store.saveAll(updatedDB);
    return updatedDB;
};

module.exports = { syncWithScan };