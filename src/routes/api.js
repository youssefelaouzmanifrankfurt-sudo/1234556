// src/routes/api.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs').promises; // Hinzugefügt für Cleanup
const QRCode = require('qrcode');
const upload = multer({ dest: 'uploads/' });

// ... Imports bleiben gleich ...

// Bild-Scan (OCR)
router.post('/scan-image', upload.single('image'), async (req, res) => {
    // Definieren von filePath außerhalb des try-blocks für Zugriff im finally
    let filePath = null;
    
    try {
        if (!req.file) return res.status(400).json({ error: 'Kein Bild' });
        filePath = req.file.path;
        
        // Text erkennen
        const modelName = await ocrService.processImage(filePath);

        if(modelName === "Unbekannt" || modelName.length < 2) {
             return res.json({ success: false, error: "Kein Text erkannt. Bitte Bild drehen oder näher ran." });
        }

        res.json({ success: true, model: modelName });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: e.message }); 
    } finally {
        // CLEANUP: Datei immer löschen, egal ob Erfolg oder Fehler
        if (filePath) {
            try {
                await fs.unlink(filePath);
                // Optional: logger.log('debug', 'Temp file deleted');
            } catch (err) {
                console.error("Fehler beim Löschen der Temp-Datei:", err);
            }
        }
    }
});

module.exports = router;