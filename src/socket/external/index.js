// src/socket/external/index.js
const search = require('./search');
const details = require('./details');
const imp = require('./import'); // "import" ist ein reserviertes Wort, daher "imp"
const upload = require('./upload');

module.exports = (io, socket) => {
    // Alle Module mit io und socket initialisieren
    search(io, socket);
    details(io, socket);
    imp(io, socket);
    upload(io, socket);
};