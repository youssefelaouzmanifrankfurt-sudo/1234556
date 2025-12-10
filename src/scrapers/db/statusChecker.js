socket.on('start-db-scrape', async () => {
        try {
            logger.log('info', 'Starte Synchronisation...');
            
            const onProgress = (current, total) => {
                io.emit('scrape-progress', { current, total });
            };

            // Wir übergeben die alte DB nur zum Datum-Klauen
            const freshAds = await dbScraper.scrapeMyAds(global.adsDB, onProgress);
            
            // REPLACE: Wir ersetzen die Datenbank komplett mit dem frischen Scan.
            // Da 'freshAds' alle aktuellen Anzeigen enthält (mit alten Daten gemerged),
            // fallen gelöschte Anzeigen hier automatisch raus.
            global.adsDB = freshAds;

            storage.saveDB(global.adsDB);
            io.emit('update-db', global.adsDB);
            logger.log('success', `Sync fertig. ${global.adsDB.length} Anzeigen in DB.`);

        } catch (e) {
            logger.log('error', 'DB Scrape Fehler: ' + e.message);
        }
    });