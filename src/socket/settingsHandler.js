// src/socket/settingsHandler.js
const storage = require('../utils/storage');
const logger = require('../utils/logger');

module.exports = (io, socket) => {

    // Senden beim Start
    socket.on('get-settings', () => {
        const settings = storage.loadSettings();
        socket.emit('update-settings', settings);
    });

    // Speichern
    socket.on('save-settings', (newSettings) => {
        // 1. Auf Festplatte schreiben
        storage.saveSettings(newSettings);
        
        // 2. An ALLE anderen Tabs verteilen (Sync)
        socket.broadcast.emit('update-settings', newSettings);
        
        // 3. Log nur bei manueller Speicherung (um Spam zu vermeiden)
        // Wir können hier unterscheiden, aber für jetzt reicht einfaches Speichern.
    });
};