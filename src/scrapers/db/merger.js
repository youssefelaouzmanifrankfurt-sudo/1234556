// src/scrapers/db/merger.js

function mergeData(liveAds, existingAds) {
    return liveAds.map(liveAd => {
        const dbEntry = existingAds.find(dbAd => dbAd.id === liveAd.id);
        if (dbEntry) {
            // Alte Daten retten, falls im Scan nicht vorhanden
            if (dbEntry.description) liveAd.description = dbEntry.description;
            if (dbEntry.images && dbEntry.images.length > 1) liveAd.images = dbEntry.images;
            if (dbEntry.uploadDate) liveAd.uploadDate = dbEntry.uploadDate;
            if (dbEntry.features) liveAd.features = dbEntry.features;
            if (dbEntry.cleanTitle) liveAd.title = dbEntry.cleanTitle;
            
            // Status Historie behalten
            if (dbEntry.status === 'DELETED') liveAd.status = 'DELETED'; 
        }
        return liveAd;
    });
}

function identifyMissingDetails(ads) {
    return ads.filter(ad => {
        // Deep-Scan Bedingungen: Zu wenig Text oder zu wenig Bilder
        const missingData = (!ad.description || ad.description.length < 10 || !ad.images || ad.images.length < 2);
        return missingData && ad.url; 
    });
}

module.exports = { mergeData, identifyMissingDetails };