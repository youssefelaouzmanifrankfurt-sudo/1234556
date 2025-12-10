// src/utils/imageDownloader.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

async function downloadImage(url, filename) {
    try {
        if (!url) return null;
        if (url.startsWith('//')) url = 'https:' + url;
        if (!url.startsWith('http')) return null;

        // FORCE JPG via URL Parameter (falls vom Scraper nicht schon gesetzt)
        if (url.includes('baur.de') && !url.includes('format=jpg')) {
            url += (url.includes('?') ? '&' : '?') + 'format=jpg';
        }

        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
            timeout: 20000,
            headers: {
                // WICHTIG: Täusche einen normalen Browser vor
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'image/jpeg, image/png, image/*;q=0.8', // Kein AVIF!
                'Accept-Encoding': 'gzip, deflate, br',
                'Referer': 'https://www.baur.de/',
                'Origin': 'https://www.baur.de'
            }
        });

        // Prüfen was wir bekommen haben
        const contentType = response.headers['content-type'];
        let finalFilename = filename;

        // Dateiendung anpassen falls Server uns doch was anderes gibt
        if (contentType) {
            if (contentType.includes('webp')) finalFilename = filename.replace(/\.(jpg|jpeg|png)$/i, '.webp');
            else if (contentType.includes('avif')) finalFilename = filename.replace(/\.(jpg|jpeg|png)$/i, '.avif');
        }

        const filePath = path.join(uploadDir, finalFilename);
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                // Prüfen auf "Leere Datei" oder "Fehlerseite als Bild"
                const stats = fs.statSync(filePath);
                if (stats.size < 2000) { // Kleiner als 2KB ist meist Müll
                    fs.unlinkSync(filePath);
                    logger.log('warning', `Bild zu klein (Blockiert?): ${filename}`);
                    resolve(null);
                } else {
                    resolve(filePath);
                }
            });
            writer.on('error', (err) => {
                fs.unlink(filePath, () => {});
                resolve(null);
            });
        });

    } catch (error) {
        logger.log('error', `DL Fehler: ${error.message}`);
        return null;
    }
}

function clearTempFolder() {
    fs.readdir(uploadDir, (err, files) => {
        if (err) return;
        for (const file of files) {
            if (file.startsWith('upload_')) fs.unlink(path.join(uploadDir, file), () => {});
        }
    });
}

module.exports = { downloadImage, clearTempFolder };