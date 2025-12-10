// src/socket/external/details.js
const ottoScraper = require('../../scrapers/ottoScraper');
const idealoScraper = require('../../scrapers/idealoScraper');
const amazonScraper = require('../../scrapers/amazonScraper');
const baurScraper = require('../../scrapers/baurScraper');
const expertScraper = require('../../scrapers/expertScraper');
const similarity = require('../../utils/similarity');

module.exports = (io, socket) => {

    socket.on('select-external-product', async (url) => {
        let details = null;

        try {
            // Automatische Erkennung der Quelle anhand der URL
            if (url.includes('idealo.de')) {
                details = await idealoScraper.scrapeIdealoDetails(url);
            } else if (url.includes('otto.de')) {
                details = await ottoScraper.scrapeOttoDetails(url);
            } else if (url.includes('amazon.de') || url.includes('amzn.to')) {
                details = await amazonScraper.scrapeAmazonDetails(url);
            } else if (url.includes('baur.de')) {
                details = await baurScraper.scrapeBaurDetails(url);
            } else if (url.includes('expert.de')) {
                details = await expertScraper.scrapeExpertDetails(url);
            } else {
                socket.emit('scrape-error', "Unbekannte URL Quelle.");
                return;
            }
            
            if (!details) {
                socket.emit('scrape-error', "Konnte Details nicht laden (Blockiert oder Fehler).");
                return;
            }

            // Vergleich mit lokaler DB (Globaler Zugriff auf adsDB)
            const match = similarity.findBestMatch(details.title, global.adsDB || []);
            
            socket.emit('comparison-result', {
                external: details,
                localMatch: match.item,
                score: Math.round(match.score * 100)
            });

        } catch (e) {
            console.error("Details-Fehler:", e);
            socket.emit('scrape-error', "Fehler beim Laden der Details: " + e.message);
        }
    });
};