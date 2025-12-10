// src/services/bootService.js
const fs = require('fs');
const path = require('path');
const storage = require('../utils/storage'); // Pfad prüfen
const logger = require('../utils/logger');
const systemState = require('../utils/state');
const chatMonitor = require('../scrapers/chat/monitor');
const { connectToBrowser } = require('../scrapers/chat/connection');
const startAutoScan = require('../jobs/scheduler');

// NEU: Import des StockService
const stockService = require('./stockService');

async function startSystem(io, port) {
    const IS_MAIN_SERVER = (String(port) === '3000');

    logger.log('info', '🚀 System-Boot eingeleitet...');

    // 1. Ordner Struktur sicherstellen
    if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

    if (IS_MAIN_SERVER) {
        const serverPath = 'C:\\weeeeeee_data';
        if (!fs.existsSync(serverPath)) {
            try { fs.mkdirSync(serverPath, { recursive: true }); } catch(e) {}
        }
    }
    
    // 2. Datenbank Initialisieren
    // Wir behalten global.adsDB vorerst für die Kompatibilität
    global.adsDB = storage.loadDB() || [];
    logger.log('success', `📦 Legacy-DB geladen: ${global.adsDB.length} Einträge.`);

    // NEU: Check des neuen StockService
    try {
        const stockCount = stockService.getAll().length;
        logger.log('success', `📦 Neuer StockService aktiv: ${stockCount} Items im RAM.`);
    } catch (e) {
        logger.log('error', `Fehler beim Laden von StockService: ${e.message}`);
    }

    // 3. Datei-Überwachung (Watcher) starten
    setupFileWatcher(io);

    // 4. Externe Dienste starten
    try { 
        logger.log('info', '🌍 Verbinde mit Browser...');
        await connectToBrowser(); 
    } catch(e) {
        logger.log('warning', 'Browser-Verbindung fehlgeschlagen (nicht kritisch).');
    }
    
    // Chat Monitor
    chatMonitor.startChatMonitor(io);
    logger.log('info', '👀 Chat-Monitor aktiv (Hintergrund-Modus).');

    // 5. System freigeben
    systemState.isReady = true;
    logger.log('success', `✅ SYSTEM BEREIT auf Port ${port}`);

    // 6. Auto-Scan starten (Nur Main Server)
    if (IS_MAIN_SERVER) {
        startAutoScan(io);
    }
}

function setupFileWatcher(io) {
    const dbPath = storage.getDbPath();
    if (dbPath && fs.existsSync(path.dirname(dbPath))) {
        let fsWait = false;
        fs.watch(path.dirname(dbPath), (event, filename) => {
            if (filename === 'inventory.json' && event === 'change') {
                if (fsWait) return;
                fsWait = true;
                setTimeout(() => fsWait = false, 500); // Debounce
                
                const newData = storage.loadDB();
                if(newData) { 
                    global.adsDB = newData; 
                    io.emit('update-db-list', global.adsDB); 
                }
            }
        });
    }
}

// --- WICHTIG: DIESE ZEILE MUSS AM ENDE STEHEN ---
module.exports = { startSystem };