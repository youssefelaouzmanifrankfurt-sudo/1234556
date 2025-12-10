// src/services/ocrService.js
const Tesseract = require('tesseract.js');
const fs = require('fs');
const sharp = require('sharp'); 

async function createBuffers(inputPath) {
    try {
        const base = sharp(inputPath)
            .resize({ width: 1500, fit: 'inside' }) 
            .grayscale();

        const bufferStandard = await base.clone()
            .normalize()
            .sharpen()
            .toBuffer();

        const bufferInverted = await base.clone()
            .negate()
            .normalize()
            .sharpen()
            .toBuffer();

        // Soft-Strategie: Wichtig für Handy-Fotos
        const bufferSoft = await base.clone().toBuffer();

        return { standard: bufferStandard, inverted: bufferInverted, soft: bufferSoft };
    } catch (error) {
        console.error("[OCR] Bild-Fehler:", error);
        return null;
    }
}

function parseTextResult(text) {
    if (!text || text.length < 2) return { score: 0, text: null };

    // Wir zerlegen den Text in echte Zeilen
    const lines = text.split(/\r?\n/);
    
    let bestLine = null;
    let maxScore = 0;

    lines.forEach(rawLine => {
        let line = rawLine.trim();
        if (line.length < 3) return;

        // STRATEGIE A: Label Suche (Model: Heko Tango) -> Volltreffer
        const labelRegex = /(?:Model|Modell|Type|Typ|Ref|Art\.?-?Nr\.?|P\/N|S\/N)\s*[:.]?\s*([A-Z0-9\-\/ ]{3,})/i;
        const match = line.match(labelRegex);
        if (match && match[1]) {
            const res = match[1].trim();
            if (res.length >= 3 && res.length <= 30) {
                // Sofort zurückgeben, besser geht's nicht
                // Wir tricksen hier und geben einen gigantischen Score zurück
                if (maxScore < 100) { maxScore = 100; bestLine = res; }
            }
        }

        // STRATEGIE B: Die ganze Zeile bewerten (für "Heko Tango")
        // Bereinigen: Wir erlauben Buchstaben, Zahlen, Bindestriche und Leerzeichen
        const clean = line.replace(/[^a-zA-Z0-9\-\/ ]/g, '').trim();
        
        // Zu kurz oder zu lang für einen Modellnamen?
        if (clean.length < 3 || clean.length > 35) return;

        let score = 0;
        const digits = clean.replace(/[^0-9]/g, "").length;
        const uppers = clean.replace(/[^A-Z]/g, "").length;
        const spaces = clean.split(' ').length - 1;
        const letters = clean.length - digits - spaces;

        // --- PUNKTE VERTEILUNG ---
        
        // 1. Substanz: Hat es überhaupt Inhalt?
        if (clean.length > 4) score += 5;

        // 2. Großbuchstaben sind sehr gut (HEKO TANGO)
        // Auch "Heko Tango" hat 2 Uppers.
        if (uppers > 0) score += (uppers * 1.5);

        // 3. Zahlen sind immer noch ein starkes Indiz (aber kein Muss mehr)
        if (digits > 0) score += (digits * 3);

        // 4. Mix-Bonus: Wenn Zahlen UND Buchstaben da sind -> Super
        if (digits > 0 && letters > 0) score += 15;

        // 5. "Text-Only" Rettung (für Heko Tango)
        // Wenn keine Zahlen da sind, aber es sieht "wichtig" aus (kurz, knackig, Großbuchstaben)
        if (digits === 0 && uppers >= 2 && clean.length < 20) {
            score += 10; 
        }

        // --- ABZÜGE ---
        
        // Zu viele Wörter? Ein Modell heißt selten "Das ist ein sehr schönes Gerät"
        if (spaces > 3) score -= 10;

        // Böse Wörter (Ausschlussliste)
        if (/Germany|China|Made|Volt|Watt|230V|50Hz|Class|Type|Model|Nr\.|WEEE|Warning/i.test(clean)) {
            score -= 50;
        }

        if (score > maxScore) {
            maxScore = score;
            bestLine = clean;
        }
    });

    return { score: maxScore, text: bestLine };
}

async function recognizeBuffer(buffer, name) {
    try {
        const { data: { text } } = await Tesseract.recognize(buffer, 'eng', {
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-./: ', // Jetzt auch Kleinbuchstaben erlaubt!
            tessedit_pageseg_mode: '7' // Single Line Mode
        });
        
        const preview = text.replace(/[\r\n]/g, ' ').substring(0, 50);
        const result = parseTextResult(text);
        
        console.log(`[OCR] Thread '${name}': "${preview}..." (Score: ${result.score})`);
        return result;
    } catch (e) {
        return { score: 0, text: null };
    }
}

async function processImage(filePath) {
    try {
        console.log("[OCR] 🚀 Starte Zeilen-Scan...");
        const buffers = await createBuffers(filePath);
        if (!buffers) return "Unbekannt";

        if (fs.existsSync(filePath)) fs.unlink(filePath, () => {});

        const results = await Promise.all([
            recognizeBuffer(buffers.standard, "Standard"),
            recognizeBuffer(buffers.inverted, "Invertiert"),
            recognizeBuffer(buffers.soft, "Soft")
        ]);

        const winner = results.reduce((prev, current) => (prev.score > current.score) ? prev : current);

        // Score Limit leicht gesenkt, damit Text-Modelle durchkommen
        if (winner.score >= 12 && winner.text) { 
            console.log(`[OCR] 🏆 GEWINNER: ${winner.text}`);
            return winner.text;
        }

        console.log("[OCR] ❌ Kein eindeutiges Modell gefunden.");
        return "Unbekannt";

    } catch (error) {
        console.error("[OCR] Fehler:", error);
        if (fs.existsSync(filePath)) try { fs.unlinkSync(filePath); } catch(e){}
        return "Unbekannt";
    }
}

module.exports = { processImage };