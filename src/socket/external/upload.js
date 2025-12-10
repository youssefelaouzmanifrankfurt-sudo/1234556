// src/socket/external/upload.js
const poster = require('../../scrapers/poster');
const stockService = require('../../services/stockService'); // Zugriff aufs Lager
const logger = require('../../utils/logger');

module.exports = (io, socket) => {

    socket.on('upload-to-kleinanzeigen', (product) => {
        
        // 1. Browser öffnen und Formular ausfüllen (Poster Modul)
        poster.fillAdForm(product);
        
        // 2. LÜCKENSCHLUSS: Lager informieren!
        if (product.stockId) {
            logger.log('info', `🔗 Upload gestartet für Lager-Item: ${product.stockId}`);
            
            // Wir suchen den Artikel im Lager
            const stockItem = stockService.getAll().find(i => i.id === product.stockId);
            
            if(stockItem) {
                // Wir setzen eine Info, dass er gerade hochgeladen wird.
                // Das ist wichtig, damit du im Lager siehst: "Aha, ist in Arbeit"
                // (Später, wenn der Scraper die Ad-ID hat, wird es final verknüpft)
                
                // Optional: Status im Lager aktualisieren, falls gewünscht
                // stockItem.lastUploadAttempt = new Date().toLocaleString();
                // stockService.updateDetails(stockItem.id, stockItem);
            }
        }
    });
};