// src/utils/storage.js
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;
const IS_MASTER = (String(PORT) === '3000');

// [ARCHITECT NOTE] Dynamische Pfade statt Hardcoding
// Wir nutzen process.cwd() (Projektordner) oder eine Environment Variable.
// Fallback: Ein Ordner 'data_storage' im Projektverzeichnis.
const BASE_DIR = process.env.DATA_PATH || path.join(process.cwd(), 'data_storage');

// Im Client-Modus (Worker) nutzen wir ein Netzlaufwerk oder Shared Folder
// Wenn Z: nicht existiert, fallen wir auf lokal zurück, um Abstürze zu verhindern.
const CLIENT_MOUNT = 'Z:\\'; 
const CLIENT_DIR = fs.existsSync(CLIENT_MOUNT) ? CLIENT_MOUNT : path.join(os.tmpdir(), 'client_data_fallback');

const ACTIVE_PATH = IS_MASTER ? BASE_DIR : CLIENT_DIR;
const MODE = IS_MASTER ? "SERVER (Master)" : "CLIENT (Worker)";

console.log("------------------------------------------------");
console.log(`[STORAGE] Modus:       ${MODE}`);
console.log(`[STORAGE] Speicherort: ${ACTIVE_PATH}`);
console.log("------------------------------------------------");

// Stelle sicher, dass der Ordner existiert (nur Master)
if (IS_MASTER && !fs.existsSync(ACTIVE_PATH)) {
    try { 
        fs.mkdirSync(ACTIVE_PATH, { recursive: true }); 
        console.log(`[STORAGE] Verzeichnis erstellt: ${ACTIVE_PATH}`);
    } catch(e) {
        console.error(`[STORAGE] FATAL: Konnte Verzeichnis nicht erstellen: ${e.message}`);
    }
}

// Dateinamen definieren
const DB_PATH = path.join(ACTIVE_PATH, 'inventory.json');
const HISTORY_PATH = path.join(ACTIVE_PATH, 'history.json');
const STOCK_PATH = path.join(ACTIVE_PATH, 'stock.json');
const TASKS_PATH = path.join(ACTIVE_PATH, 'tasks.json');
const SETTINGS_PATH = path.join(ACTIVE_PATH, 'settings.json');
const IMPORTS_PATH = path.join(ACTIVE_PATH, 'imported.json');

// Helper: Initiale Datei erstellen
function ensureFile(filePath, defaultData = []) {
    if (!fs.existsSync(filePath)) {
        if (IS_MASTER) {
            try {
                fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
            } catch (e) {
                console.error("[STORAGE] Fehler beim Init von " + filePath, e.message);
            }
        } else {
            // Client wartet stillschweigend oder nutzt Default RAM Werte
            return defaultData; 
        }
    }
    
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        // [FIX] Schutz gegen leere/korrupte Dateien
        if (!data || data.trim() === '') return defaultData;
        return JSON.parse(data);
    } catch (e) {
        console.error(`[STORAGE] JSON Parse Error in ${filePath}:`, e.message);
        // Wir geben leere Daten zurück, ÜBERSCHREIBEN ABER NICHT SOFORT die Datei,
        // um Datenverlust bei Syntaxfehlern zu verhindern.
        return defaultData;
    }
}

function saveFile(filePath, data) {
    try {
        // [ARCHITECT NOTE] Atomic Write Simulation
        // Wir schreiben erst in .tmp und benennen dann um, um Korruption bei Absturz zu verhindern.
        const tempPath = `${filePath}.tmp`;
        fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
        fs.renameSync(tempPath, filePath);
        return true;
    } catch (e) {
        console.error("[STORAGE] Schreibfehler: " + filePath, e.message);
        return false;
    }
}

// [NEU] Explizite Backup Funktion (statt Random)
function createBackup(filePath) {
    if (!IS_MASTER) return false;
    try {
        const backupPath = `${filePath}.${new Date().toISOString().replace(/[:.]/g, '-')}.bak`;
        fs.copyFileSync(filePath, backupPath);
        return true;
    } catch (e) {
        console.error("[STORAGE] Backup Fehler:", e.message);
        return false;
    }
}

// --- PUBLIC API ---

module.exports = {
    getDataDir: () => ACTIVE_PATH,
    getDbPath: () => DB_PATH,
    getStockPath: () => STOCK_PATH,
    getTasksPath: () => TASKS_PATH,
    getSettingsPath: () => SETTINGS_PATH,
    getImportsPath: () => IMPORTS_PATH,

    // Legacy Support + Neue Features
    loadDB: () => ensureFile(DB_PATH),
    saveDB: (data) => saveFile(DB_PATH, data),
    
    // Generische Methoden für saubereren Code in Zukunft
    load: (type) => {
        switch(type) {
            case 'history': return ensureFile(HISTORY_PATH);
            case 'stock': return ensureFile(STOCK_PATH);
            // ... weitere
            default: return [];
        }
    },
    
    // Backup explizit auslösbar machen (z.B. durch Scheduler)
    backupInventory: () => createBackup(DB_PATH),

    // Alte Methoden behalten für Kompatibilität
    loadHistory: () => ensureFile(HISTORY_PATH),
    saveHistory: (data) => saveFile(HISTORY_PATH, data),
    loadStock: () => ensureFile(STOCK_PATH),
    saveStock: (data) => saveFile(STOCK_PATH, data),
    loadTasks: () => ensureFile(TASKS_PATH),
    saveTasks: (data) => saveFile(TASKS_PATH, data),
    loadSettings: () => ensureFile(SETTINGS_PATH, {}),
    saveSettings: (data) => saveFile(SETTINGS_PATH, data),
    loadExternal: () => ensureFile(IMPORTS_PATH),
    saveExternal: (data) => saveFile(IMPORTS_PATH, data)
};