// src/config/express.js
const express = require('express');
const path = require('path');
const systemState = require('../utils/state');

// Routen Importe
const viewRoutes = require('../routes/views');
const apiRoutes = require('../routes/api');

module.exports = (app) => {
    // 1. View Engine Setup (Pfade relativ zu src/config/...)
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '../../views'));

    // 2. Standard Middleware
    app.use(express.static(path.join(__dirname, '../../public')));
    app.use(express.json());

    // 3. Lade-Bildschirm Middleware
    app.use((req, res, next) => {
        // Ausnahmen für Assets, API und Boot-Checks
        if (req.path.startsWith('/public') || 
            req.path.includes('boot') || 
            req.path.startsWith('/api') ||
            req.path.includes('favicon')) {
            return next();
        }
        
        // Wenn System bereit -> Weiter, sonst Lade-Seite
        if (systemState.isReady) {
            next();
        } else {
            res.render('loading');
        }
    });

    // 4. Routen verknüpfen
    app.use('/', viewRoutes);   // Dashboard, Lager, etc.
    app.use('/api', apiRoutes); // API Funktionen
    
    return app;
};