// src/utils/JsonStore.js
const fs = require('fs');
const path = require('path');
// Falls du logger.js hast, binden wir es ein, sonst nutzen wir console
const logger = require('./logger'); 

class JsonStore {
    constructor(filePath, defaultData = []) {
        this.filePath = filePath;
        this.data = defaultData;
        this.isLoaded = false;
        
        // Initial laden
        this.load();
    }

    load() {
        try {
            if (fs.existsSync(this.filePath)) {
                const raw = fs.readFileSync(this.filePath, 'utf-8');
                // Schutz gegen leere Dateien
                this.data = raw ? JSON.parse(raw) : [];
            } else {
                this.data = [];
            }
            this.isLoaded = true;
            // console.log(`[STORE] Geladen: ${path.basename(this.filePath)} (${this.data.length} Items)`);
        } catch (e) {
            console.error(`[STORE] Fehler beim Laden von ${this.filePath}: ${e.message}`);
            this.data = [];
        }
        return this.data;
    }

    getAll() {
        if (!this.isLoaded) this.load();
        return this.data;
    }

    save() {
        try {
            // Schreiboperation: Synchron, um Race Conditions auf File-Level zu minimieren
            // (Da wir Node.js Single Threaded sind, blockiert dies kurz, aber verhindert
            // das Überschreiben durch parallele Schreibvorgänge, da wir 'this.data' als Source of Truth nutzen)
            fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
            return true;
        } catch (e) {
            console.error(`[STORE] Speicherfehler in ${this.filePath}: ${e.message}`);
            return false;
        }
    }

    // --- Generische CRUD Operationen ---

    add(item) {
        this.data.push(item);
        this.save();
        return this.data;
    }

    update(id, updateFn) {
        const index = this.data.findIndex(i => i.id === id);
        if (index !== -1) {
            // Wir übergeben eine KOPIE des Items an die Update-Funktion
            const itemCopy = { ...this.data[index] };
            const updatedItem = updateFn(itemCopy);
            
            // Zurückschreiben
            this.data[index] = updatedItem || itemCopy;
            this.save();
            return this.data[index];
        }
        return null;
    }

    delete(id) {
        const initialLen = this.data.length;
        this.data = this.data.filter(i => i.id !== id);
        if (this.data.length !== initialLen) {
            this.save();
            return true;
        }
        return false;
    }
}

module.exports = JsonStore;