// src/services/inventory/store.js
const storage = require('../../utils/storage');

const getAll = () => storage.loadDB() || [];
const saveAll = (items) => storage.saveDB(items);

const deleteItem = (id) => {
    let db = getAll();
    // Filtert das Item heraus
    db = db.filter(i => i.id !== id);
    // Speichert und gibt die neue Liste zurück (wie im Original)
    saveAll(db);
    return db;
};

const replaceAll = (items) => { 
    saveAll(items); 
    return items; 
};

module.exports = { getAll, saveAll, deleteItem, replaceAll };