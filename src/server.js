// src/server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const os = require('os');

// Core Module
const configureExpress = require('./config/express');
const bootService = require('./services/bootService');

// Socket Manager & Utils
const socketManager = require('./socket/index');
const logger = require('./utils/logger');

// --- INIT ---
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// --- SETUP ---
// 1. Logger mit IO verbinden
logger.init(io);

// 2. Globale Variablen Init
global.adsDB = []; 

// 3. Express Konfiguration laden (Middleware & Routes)
configureExpress(app);

// 4. Socket Manager starten
socketManager(io);

// --- SERVER START ---
const PORT = process.env.PORT || 3000;

// Helper: Lokale IP finden
const getLocalIP = () => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) return iface.address;
        }
    }
    return 'localhost';
};

server.listen(PORT, '0.0.0.0', () => {
    console.clear();
    console.log('--------------------------------------------------');
    console.log(`🚀 SERVER GESTARTET: http://${getLocalIP()}:${PORT}`);
    console.log('--------------------------------------------------');
    
    // Boot-Prozess anstoßen (DB laden, Browser, etc.)
    bootService.startSystem(io, PORT);
});