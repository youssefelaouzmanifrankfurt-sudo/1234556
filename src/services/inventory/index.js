// src/services/inventory/index.js
const store = require('./store');
const sync = require('./sync');
const actions = require('./actions');

// Exporte identisch zur alten inventoryService.js Struktur
module.exports = {
    // Store
    getAll: store.getAll,
    saveAll: store.saveAll,
    delete: store.deleteItem,  // WICHTIG: Mapping auf deleteItem
    replaceAll: store.replaceAll,

    // Sync
    syncWithScan: sync.syncWithScan,

    // Actions
    markAsInStock: actions.markAsInStock,
    removeFromStock: actions.removeFromStock,
    addFeature: actions.addFeature,
    addFromStock: actions.addFromStock
};