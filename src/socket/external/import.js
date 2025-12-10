// src/socket/external/import.js
const storage = require('../../utils/storage');

module.exports = (io, socket) => {

    // Produkt in Ablage speichern
    socket.on('save-external-product', (product) => {
        const list = storage.loadExternal();
        
        // Duplikate vermeiden (anhand der URL)
        if(!list.find(p => p.url === product.url)) {
            product.importedAt = new Date().toLocaleString();
            // Falls es keine ID hat (vom Scraper direkt), geben wir eine
            if (!product.id) product.id = "IMP-" + Date.now();
            
            list.push(product);
            storage.saveExternal(list);
            socket.emit('import-success');
        }
    });

    // Liste abrufen
    socket.on('get-imported-products', () => {
        socket.emit('update-imported-list', storage.loadExternal());
    });

    // Eintrag löschen
    socket.on('delete-imported', (idOrUrl) => {
        let list = storage.loadExternal();
        // Wir filtern entweder nach ID (neu) oder URL (alt)
        list = list.filter(p => p.id !== idOrUrl && p.url !== idOrUrl);
        storage.saveExternal(list);
        socket.emit('update-imported-list', list);
    });
};