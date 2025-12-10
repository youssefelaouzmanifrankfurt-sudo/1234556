// src/socket/index.js
const chatHandler = require('./chatHandler');
const taskHandler = require('./taskHandler');
// const dbHandler = require('./dbHandler'); // Nicht mehr benötigt
const trackingHandler = require('./trackingHandler');
const settingsHandler = require('./settingsHandler');

// Scraper Import
const dbScraper = require('../scrapers/dbScraper');
// NEU: Poster Import (für das Browser-Fenster)
const poster = require('../scrapers/poster');

// Modulare Handler
const externalHandler = require('./external'); 
const stockHandler = require('./stock'); 

const logger = require('../utils/logger');
const inventoryService = require('../services/inventoryService'); 

module.exports = (io) => {
    io.on('connection', (socket) => {
        // Alle Handler starten
        chatHandler(io, socket);
        taskHandler(io, socket);
        trackingHandler(io, socket);
        settingsHandler(io, socket);
        
        externalHandler(io, socket);
        stockHandler(io, socket);

        // --- DATENBANK EVENTS ---

        // 1. Liste laden
        socket.on('get-db-products', () => {
            const data = inventoryService.getAll();
            socket.emit('update-db-list', data);
        });

        // 2. Item löschen
        socket.on('delete-db-item', (id) => {
             inventoryService.delete(id);
             io.emit('update-db-list', inventoryService.getAll());
        });

        // 3. Scan Starten
        socket.on('start-db-scrape', async () => {
            logger.log('info', 'Eingehender Request: start-db-scrape');
            const currentDB = inventoryService.getAll();

            const scannedItems = await dbScraper.scrapeMyAds(currentDB, (current, total) => {
                let t = (typeof total === 'number') ? total : 100;
                socket.emit('scrape-progress', { current, total: t });
            });

            if (scannedItems) {
                const updatedList = inventoryService.syncWithScan(scannedItems);
                logger.log('success', 'DB Sync abgeschlossen. Sende Update an Client.');
                io.emit('update-db-list', updatedList);
            } else {
                socket.emit('scrape-progress', { error: true });
            }
        });

        // 4. RE-UPLOAD IMPLEMENTIERUNG (MIT BROWSER START)
        socket.on('re-up-item', ({ id }) => {
            logger.log('info', `🚀 Re-Up Request für ID: ${id}`);
            
            const db = inventoryService.getAll();
            const originalItem = db.find(i => i.id === id);

            if (originalItem) {
                // Wir erstellen eine KOPIE als Draft
                const newId = 'DRAFT-' + Date.now();
                const newItem = {
                    ...originalItem,
                    id: newId,
                    status: 'DRAFT',        // Wird gelb markiert
                    active: false,
                    views: 0,
                    favorites: 0,
                    uploadDate: new Date().toLocaleDateString('de-DE'),
                    // Falls du willst, dass der Titel angepasst wird, hier ändern:
                    // title: "RE: " + originalItem.title 
                };

                // Zur DB hinzufügen
                db.push(newItem);
                inventoryService.saveAll(db);

                // Bestätigung an alle Clients
                io.emit('update-db-list', db);
                logger.log('success', `✅ Anzeige dupliziert (${newId}). Starte Poster-Browser...`);
                
                // +++ HIER IST DER FIX: Browser öffnen! +++
                poster.fillAdForm(newItem);

            } else {
                logger.log('error', `Re-Up fehlgeschlagen: Item ${id} nicht gefunden.`);
            }
        });

        // ------------------------

        // Globale Events
        socket.on('refresh-stock-request', () => {
            io.emit('force-reload-stock');
        });

        socket.on('start-scraper', (d) => logger.log('info', `Bot Start: ${d.term}`));
        socket.on('stop-scraper', () => logger.log('warning', 'Bot Stop'));
    });
};