// debug.js - Systemdiagnose
const fs = require('fs');
const path = require('path');

console.log("=== NEONLINK SYSTEM DIAGNOSE ===");

function checkFile(p) {
    const exists = fs.existsSync(p);
    console.log(`[${exists ? 'OK' : 'FEHLT'}] ${p}`);
    return exists;
}

function tryRequire(p) {
    try {
        require(p);
        console.log(`[LÄDT]  ${p}`);
        return true;
    } catch (e) {
        console.error(`[CRASH] ${p} -> ${e.message}`);
        return false;
    }
}

// 1. Wichtige Dateien prüfen
console.log("\n--- DATEI CHECK ---");
checkFile('./src/socket/index.js');
checkFile('./src/socket/stockHandler.js'); // Die neue Datei
checkFile('./src/services/stockService.js');
checkFile('./src/utils/storage.js');

// 2. Konflikt Check
console.log("\n--- KONFLIKT CHECK ---");
if (fs.existsSync('./src/socket/stock') && fs.lstatSync('./src/socket/stock').isDirectory()) {
    console.log("⚠️  WARNUNG: Ordner './src/socket/stock' existiert noch!");
    console.log("    Das verursacht den Konflikt, wenn index.js falsch konfiguriert ist.");
} else {
    console.log("✅  Ordner './src/socket/stock' ist weg (Gut).");
}

// 3. Lade-Test (Simulation)
console.log("\n--- LADE TEST ---");
tryRequire('./src/utils/storage.js');
tryRequire('./src/services/stockService.js');

console.log("\n=== DIAGNOSE ENDE ===");
console.log("Wenn oben 'CRASH' steht, ist das der Grund für den Loop.");