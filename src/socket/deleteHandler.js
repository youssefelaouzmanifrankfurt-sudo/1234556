// src/socket/deleteHandler.js
const deleter = require('../scrapers/deleter');
const storage = require('../utils/storage');
const logger = require('../utils/logger');

module.exports = (io, socket) => {

    // EINZELN LÖSCHEN
    socket.on('delete-single-ad', async (id) => {
        logger.log('info', `Starte Löschvorgang für ID ${id}...`);
        
        const success = await deleter.deleteAd(id);
        
        if (success) {
            // Aus DB entfernen
            global.adsDB = global.adsDB.filter(ad => ad.id !== String(id));
            storage.saveDB(global.adsDB);
            
            // Update an alle
            io.emit('update-db', global.adsDB);
            logger.log('success', `Anzeige ${id} erfolgreich gelöscht.`);
        }
    });

    // ALLE INAKTIVEN LÖSCHEN
    socket.on('delete-inactive-ads', async () => {
        // Filtere alle inaktiven (active === false)
        const inactiveAds = global.adsDB.filter(ad => ad.active === false);
        
        if (inactiveAds.length === 0) {
            logger.log('info', 'Keine inaktiven Anzeigen zum Löschen gefunden.');
            return;
        }

        logger.log('warning', `Starte Massenlöschung von ${inactiveAds.length} pausierten Anzeigen...`);

        // Wir arbeiten die Liste nacheinander ab (Sicherheit > Geschwindigkeit)
        let deletedCount = 0;

        for (const ad of inactiveAds) {
            const success = await deleter.deleteAd(ad.id);
            if (success) {
                // Sofort aus DB entfernen, damit man Fortschritt sieht
                global.adsDB = global.adsDB.filter(item => item.id !== ad.id);
                storage.saveDB(global.adsDB);
                io.emit('update-db', global.adsDB); // Live Update
                deletedCount++;
            }
            // Kurze Pause zwischen den Löschungen (Sicherheitssperre vermeiden)
            await new Promise(r => setTimeout(r, 2000));
        }

        logger.log('success', `Massenlöschung fertig. ${deletedCount} Anzeigen entfernt.`);
    });

};