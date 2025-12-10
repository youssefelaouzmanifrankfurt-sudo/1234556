// src/routes/views.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => res.render('dashboard', { title: 'Dashboard' }));
router.get('/chat', (req, res) => res.render('chat', { title: 'Messenger' }));
router.get('/aufgaben', (req, res) => res.render('aufgaben', { title: 'Tasks' }));
router.get('/lager', (req, res) => res.render('lager', { title: 'Lagerbestand' }));
router.get('/datenbank', (req, res) => res.render('datenbank', { title: 'Datenbank' })); 
router.get('/tracking', (req, res) => res.render('tracking', { title: 'Tracking' }));
router.get('/scraper', (req, res) => res.render('scraper', { title: 'Scraper' }));
router.get('/imported', (req, res) => res.render('imported', { title: 'Ablage' }));
router.get('/lieferliste', (req, res) => res.render('lieferliste', { title: 'Lieferliste' }));
router.get('/settings', (req, res) => res.render('settings', { title: 'Einstellungen' }));

module.exports = router;