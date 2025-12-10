// src/jobs/scheduler.js
const inventoryService = require('../services/inventoryService');
const dbScraper = require('../scrapers/dbScraper');
const analytics = require('../utils/analytics');
const logger = require('../utils/logger');

function startAutoScan(io) {
    // Startet alle 2 Stunden (2 * 60 * 60 * 1000 ms)
    setInterval(async () => {
        try {
            const onProgress = (c, t) => io.emit('scrape-progress', { current: c, total: t });
            
            // Lade aktuelle Anzeigen für den Scan
            const currentAds = inventoryService.getAll();
            
            // Führe Scraper aus
            let scrapedAds = await dbScraper.scrapeMyAds(currentAds, onProgress);
            
            if (scrapedAds && scrapedAds.length > 0) {
                // Analysieren und Speichern
                scrapedAds = analytics.processAnalytics(scrapedAds);
                const newList = inventoryService.syncWithScan(scrapedAds);
                
                // Frontend aktualisieren
                io.emit('update-db-list', newList); 
            }
        } catch (e) { 
            logger.log('error', 'Auto-Scan Fehler: ' + e.message); 
        }
    }, 2 * 60 * 60 * 1000);
}

module.exports = startAutoScan;