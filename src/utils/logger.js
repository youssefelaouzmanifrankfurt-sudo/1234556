// src/utils/logger.js
let ioRef = null;

// Diese Funktion wird einmal beim Start aufgerufen, um die Verbindung zu speichern
function init(io) {
    ioRef = io;
}

/**
 * Sendet eine Nachricht an das Frontend und die Konsole
 * @param {string} type - Art der Nachricht: 'info', 'success', 'error', 'warning'
 * @param {string} message - Der Text
 */
function log(type, message) {
    const timestamp = new Date().toLocaleTimeString();
    const fullMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;

    // 1. In die schwarze Server-Konsole schreiben
    console.log(fullMessage);

    // 2. An alle Browser im LAN senden (Echtzeit!)
    if (ioRef) {
        ioRef.emit('server-log', {
            time: timestamp,
            type: type,
            msg: message
        });
    }
}

module.exports = { init, log };