// src/utils/analytics.js
const storage = require('./storage');

/**
 * Vergleicht aktuelle Anzeigen mit der Historie und berechnet Zuwachs.
 * Speichert den neuen Stand in history.json.
 */
function processAnalytics(currentAds) {
    const history = storage.loadHistory(); 
    // Struktur sicherstellen: { "global": { dates: [], views: [], favs: [] }, "ads": {...} }
    
    if (!history.global) {
        history.global = { dates: [], views: [], favs: [] };
    }

    let totalViews = 0;
    let totalFavs = 0;

    const today = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

    currentAds.forEach(ad => {
        const id = ad.id;
        
        // Werte sicher parsen
        const views = parseInt(ad.views) || 0;
        const favs = parseInt(ad.favorites) || 0;

        totalViews += views;
        totalFavs += favs;

        // Default Werte für Zuwachs (Delta) initialisieren
        ad.statsDiff = { views: 0, favs: 0 };

        // Alte Logik für einzelne Anzeigen beibehalten
        if (history[id]) {
            const last = history[id];
            const vDiff = views - last.lastViews;
            const fDiff = favs - last.lastFavs;

            if (vDiff > 0) ad.statsDiff.views = vDiff;
            if (fDiff > 0) ad.statsDiff.favs = fDiff;
        }

        // Historie pro Anzeige aktualisieren
        history[id] = {
            lastViews: views,
            lastFavs: favs,
            lastUpdated: today
        };
    });

    // --- GLOBALE HISTORIE UPDATE ---
    const dates = history.global.dates;
    const lastDate = dates.length > 0 ? dates[dates.length - 1] : null;

    if (lastDate === today) {
        // Update für heute (überschreiben)
        history.global.views[history.global.views.length - 1] = totalViews;
        history.global.favs[history.global.favs.length - 1] = totalFavs;
    } else {
        // Neuer Tag anfügen
        history.global.dates.push(today);
        history.global.views.push(totalViews);
        history.global.favs.push(totalFavs);
    }

    // Begrenzen auf 14 Tage (damit die Datei nicht explodiert)
    if (history.global.dates.length > 14) {
        history.global.dates.shift();
        history.global.views.shift();
        history.global.favs.shift();
    }

    // Speichern
    storage.saveHistory(history);
    
    return currentAds; 
}

function getChartData() {
    const history = storage.loadHistory();
    return history.global || { dates: [], views: [], favs: [] };
}

module.exports = { processAnalytics, getChartData };