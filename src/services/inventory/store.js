// src/services/inventory/store.js
const storage = require('../../utils/storage');
const JsonStore = require('../../utils/JsonStore');
const logger = require('../../utils/logger');

// [ARCHITECT] Lazy Initialization des Stores
// Wir holen den Pfad dynamisch, da storage.js ihn verwaltet.
let dbInstance = null;

function getDb() {
    if (!dbInstance) {
        // Versuche den Pfad sicher zu ermitteln. 
        // Falls storage.js keine Methode hat, nutzen wir den Standardpfad.
        const path = (storage.getInventoryPath && typeof storage.getInventoryPath === 'function') 
            ? storage.getInventoryPath() 
            : 'data_storage/inventory.json'; // Fallback
            
        dbInstance = new JsonStore(path);
        logger.log('info', `[INVENTORY] Store initialisiert auf: ${path}`);
    }
    return dbInstance;
}

const getAll = () => {
    return getDb().getAll();
};

const saveAll = (items) => {
    const store = getDb();
    store.data = items; // Daten überschreiben
    return store.save(); // Atomares Speichern
};

const deleteItem = (id) => {
    const store = getDb();
    store.delete(id);
    return store.getAll();
};

const replaceAll = (items) => { 
    saveAll(items); 
    return items; 
};

module.exports = { getAll, saveAll, deleteItem, replaceAll };