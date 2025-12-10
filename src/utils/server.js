// src/server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const os = require('os');

const logger = require('./utils/logger');
const storage = require('./utils/storage'); // Wichtig!
const socketManager = require('./socket/index');
const { connectToBrowser } = require('./scrapers/chat/connection');
const chatMonitor = require('./scrapers/chat/monitor');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

logger.init(io);
const PORT = 3000;

let systemState = { isReady: false, step: 'Start...', progress: 0 };

// Globale Variablen
global.adsDB = [];
global.tasks = []; // Startet leer, wird gleich gefüllt

// Middleware
app.use(express.static(path.join(__dirname, '../public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

app.use((req, res, next) => {
    if (req.path.startsWith('/public') || req.path.includes('boot')) return next();
    if (systemState.isReady) next();
    else res.render('loading');
});

// Routen
app.get('/', (req, res) => res.render('dashboard'));
app.get('/chat', (req, res) => res.render('chat'));
app.get('/aufgaben', (req, res) => res.render('aufgaben'));
app.get('/datenbank', (req, res) => res.render('datenbank'));
app.get('/tracking', (req, res) => res.render('tracking'));
app.get('/kleinanzeigen', (req, res) => res.render('kleinanzeigen'));
app.get('/api/boot-status', (req, res) => res.json(systemState));

socketManager(io);

// --- BOOT ---
async function bootSystem() {
    // 1. DATEN LADEN
    systemState.step = "Lade Daten...";
    systemState.progress = 30;
    
    // Hier laden wir die Aufgaben aus der Datei in den RAM
    global.adsDB = storage.loadDB() || [];
    global.tasks = storage.loadTasks() || [];
    
    console.log(`[BOOT] ${global.tasks.length} Aufgaben geladen.`);
    logger.log('success', `System geladen: ${global.adsDB.length} Anzeigen, ${global.tasks.length} Aufgaben.`);

    // 2. BROWSER
    systemState.step = "Verbinde Chrome...";
    systemState.progress = 60;
    await connectToBrowser();

    // 3. MONITOR
    systemState.step = "Starte Monitor...";
    systemState.progress = 90;
    chatMonitor.startChatMonitor(io);

    // FERTIG
    systemState.progress = 100;
    systemState.isReady = true;
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server läuft auf Port ${PORT}`);
    bootSystem();
});