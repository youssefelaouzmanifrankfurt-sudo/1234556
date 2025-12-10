// src/socket/trackingHandler.js
const dateParser = require('../utils/dateParser');
const logger = require('../utils/logger');
const featureScraper = require('../scrapers/featureScraper');
const storage = require('../utils/storage');
const analytics = require('../utils/analytics'); // NEU IMPORTIEREN

module.exports = (io, socket) => {
    
    // --- NEU: CHART DATA ---
    socket.on('get-analytics-chart', () => {
        const data = analytics.getChartData();
        socket.emit('update-analytics-chart', data);
    });

    // Bestehende Tracking Logik
    socket.on('get-tracking-data', () => {
        if (!global.adsDB) {
            socket.emit('update-tracking', []);
            return;
        }

        const trackedAds = global.adsDB
            .filter(ad => (ad.features && ad.features.length > 0) || ad.isFavorite)
            .map(ad => {
                const enrichedFeatures = (ad.features || []).map(f => {
                    const txt = f.text || "";
                    const date = dateParser.parseFeatureDate(txt);
                    const daysLeft = dateParser.getDaysLeft(date);
                    const dateStr = date ? date.toLocaleDateString('de-DE') : '?';
                    return { ...f, daysLeft, dateStr };
                });
                
                let minDays = 999;
                if (enrichedFeatures.length > 0) {
                    minDays = Math.min(...enrichedFeatures.map(f => f.daysLeft));
                }

                return { ...ad, features: enrichedFeatures, minDays };
            });
            
        socket.emit('update-tracking', trackedAds);
    });

    socket.on('toggle-favorite', (id) => {
        const ad = global.adsDB.find(a => a.id === id);
        if (ad) {
            ad.isFavorite = !ad.isFavorite; 
            storage.saveDB(global.adsDB);
            io.emit('get-tracking-data');
            socket.emit('get-tracking-data');
        }
    });

    socket.on('remove-local-ad', (id) => {
        global.adsDB = global.adsDB.filter(ad => ad.id !== String(id));
        storage.saveDB(global.adsDB);
        socket.emit('get-tracking-data');
    });

    socket.on('manual-refresh', (id) => {
        const ad = global.adsDB.find(a => a.id === id);
        if (ad) {
            if (!ad.features) ad.features = [];
            const now = new Date();
            const nextWeek = new Date();
            nextWeek.setDate(now.getDate() + 7);
            const day = String(nextWeek.getDate()).padStart(2, '0');
            const month = String(nextWeek.getMonth() + 1).padStart(2, '0');
            const year = nextWeek.getFullYear();
            
            ad.features.push({
                type: 'manual',
                text: `Aufgefrischt bis ${day}.${month}.${year}`
            });
            storage.saveDB(global.adsDB);
            socket.emit('get-tracking-data');
        }
    });

    socket.on('scan-single-ad', async (id) => {
        try {
            const ad = await featureScraper.refreshSingleAd(id);
            if (ad) {
                const index = global.adsDB.findIndex(a => a.id === id);
                if (index !== -1) {
                    const oldAd = global.adsDB[index];
                    if (!ad.uploadDate) ad.uploadDate = oldAd.uploadDate;
                    ad.isFavorite = oldAd.isFavorite; 
                    global.adsDB[index] = ad;
                } else {
                    global.adsDB.push(ad);
                }
                storage.saveDB(global.adsDB);
                socket.emit('get-tracking-data');
                logger.log('success', `Anzeige ${id} aktualisiert.`);
            }
        } catch (e) { logger.log('error', e.message); }
    });
};