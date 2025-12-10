// src/utils/JsonStore.js
const fs = require('fs');
const path = require('path');
const logger = require('./logger'); // Logger eingebunden!

class JsonStore {
    constructor(filePath, defaultData = []) {
        this.filePath = filePath;
        // Temp Datei im gleichen Ordner für atomares Rename
        this.tempFilePath = `${filePath}.tmp`;
        this.data = defaultData;
        this.isLoaded = false;
        
        this.load();
    }

    load() {
        try {
            if (fs.existsSync(this.filePath)) {
                const raw = fs.readFileSync(this.filePath, 'utf-8');
                this.data = raw ? JSON.parse(raw) : [];
            } else {
                this.data = [];
            }
            this.isLoaded = true;
        } catch (e) {
            logger.log('error', `[STORE] CRITICAL: Konnte ${this.filePath} nicht lesen: ${e.message}`);
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
            const jsonString = JSON.stringify(this.data, null, 2);
            
            // [ARCHITECT FIX] Atomic Write Pattern
            // 1. Schreibe in temporäre Datei (blockierend ist hier OK für Datensicherheit)
            fs.writeFileSync(this.tempFilePath, jsonString);
            
            // 2. Atomares Umbenennen (POSIX Standard)
            // Wenn der Server hier crasht, ist entweder die alte ODER die neue Datei da. Nie eine halbe.
            fs.renameSync(this.tempFilePath, this.filePath);
            
            return true;
        } catch (e) {
            logger.log('error', `[STORE] Speicherfehler (Atomic) in ${this.filePath}: ${e.message}`);
            // Versuch Cleanup bei Fehler
            try { if(fs.existsSync(this.tempFilePath)) fs.unlinkSync(this.tempFilePath); } catch(ex){}
            return false;
        }
    }

    add(item) {
        this.data.push(item);
        this.save();
        return this.data;
    }

    update(id, updateFn) {
        const index = this.data.findIndex(i => i.id === id);
        if (index !== -1) {
            const itemCopy = { ...this.data[index] };
            const updatedItem = updateFn(itemCopy);
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