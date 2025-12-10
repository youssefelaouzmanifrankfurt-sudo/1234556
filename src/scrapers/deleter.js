// src/scrapers/deleter.js
const { getDbPage } = require('./chat/connection');
const logger = require('../utils/logger');

/**
 * Löscht eine Anzeige durch Simulation von Klicks:
 * 1. Öffne Detailseite
 * 2. Klicke "Löschen"
 * 3. Klicke "Ja, bestätigen"
 */
async function deleteAd(adId) {
    const page = await getDbPage();
    if (!page) return false;

    // 1. Wir brauchen die URL der Anzeige. Wir suchen sie in der globalen DB.
    const adEntry = global.adsDB.find(ad => ad.id === String(adId));
    
    if (!adEntry || !adEntry.url) {
        logger.log('error', `Löschen nicht möglich: URL für ID ${adId} fehlt in Datenbank.`);
        return false;
    }

    logger.log('info', `🗑️ Öffne Anzeige "${adEntry.title}" zum Löschen...`);

    try {
        // SCHRITT A: Seite öffnen
        await page.goto(adEntry.url, { waitUntil: 'domcontentloaded' });
        await new Promise(r => setTimeout(r, 1500)); // Kurz warten, bis Buttons da sind

        // SCHRITT B: "Löschen"-Link klicken
        // Selektor aus deinem Code: <a id="pvap-mngad-dltad">
        const deleteLinkSelector = '#pvap-mngad-dltad';
        
        const deleteLinkFound = await page.$(deleteLinkSelector);
        if (!deleteLinkFound) {
            logger.log('error', 'Löschen-Button auf der Seite nicht gefunden. (Evtl. nicht eingeloggt?)');
            return false;
        }

        await page.click(deleteLinkSelector);
        logger.log('info', 'Löschen-Button geklickt. Warte auf Bestätigung...');
        
        // SCHRITT C: Warten auf Modal/Bestätigungsseite
        await new Promise(r => setTimeout(r, 1500));

        // SCHRITT D: Bestätigung klicken ("Ja, Anzeige löschen")
        // Selektor aus deinem Code: <button id="delete-celebration-sbmt">
        const confirmBtnSelector = '#delete-celebration-sbmt';
        
        // Wir warten bis der Button wirklich sichtbar ist (max 5 Sekunden)
        try {
            await page.waitForSelector(confirmBtnSelector, { visible: true, timeout: 5000 });
            await page.click(confirmBtnSelector);
            logger.log('success', '✅ "Ja, löschen" geklickt.');
        } catch (e) {
            logger.log('error', 'Bestätigungs-Button nicht erschienen.');
            return false;
        }

        // Kurz warten, damit der Request durchgeht
        await new Promise(r => setTimeout(r, 2000));
        
        return true;

    } catch (e) {
        logger.log('error', `Lösch-Fehler (Browser): ${e.message}`);
        return false;
    }
}

module.exports = { deleteAd };