// src/socket/external/search.js
const ottoScraper = require('../../scrapers/ottoScraper');
const idealoScraper = require('../../scrapers/idealoScraper');
const amazonScraper = require('../../scrapers/amazonScraper');
const baurScraper = require('../../scrapers/baurScraper');
const expertScraper = require('../../scrapers/expertScraper');

module.exports = (io, socket) => {
    
    // 1. Suche starten
    socket.on('search-external', async (data) => {
        let query = data;
        let source = 'Otto'; // Default
        
        if (typeof data === 'object') {
            query = data.query;
            source = data.source;
        }

        let results = [];
        
        try {
            switch(source) {
                case 'Idealo':
                    results = await idealoScraper.searchIdealo(query, 1);
                    break;
                case 'Amazon':
                    results = await amazonScraper.searchAmazon(query, 1);
                    break;
                case 'Baur':
                    results = await baurScraper.searchBaur(query, 1);
                    break;
                case 'Expert':
                    results = await expertScraper.searchExpert(query, 1);
                    break;
                default: // Otto
                    results = await ottoScraper.searchOtto(query, 1);
                    break;
            }
        } catch (e) {
            console.error("Such-Fehler:", e);
        }
        
        socket.emit('external-search-results', { results, page: 1, query });
    });

    // 2. Mehr laden (Pagination)
    socket.on('search-more-external', async (data) => {
        const { query, page, source } = data;
        const nextPage = page + 1;
        let results = [];

        try {
            switch(source) {
                case 'Idealo': results = await idealoScraper.searchIdealo(query, nextPage); break;
                case 'Amazon': results = await amazonScraper.searchAmazon(query, nextPage); break;
                case 'Baur':   results = await baurScraper.searchBaur(query, nextPage); break;
                case 'Expert': results = await expertScraper.searchExpert(query, nextPage); break;
                default:       results = await ottoScraper.searchOtto(query, nextPage); break;
            }
        } catch (e) {
            console.error("Pagination-Fehler:", e);
        }
        
        socket.emit('external-search-more-results', { results, page: nextPage });
    });
};