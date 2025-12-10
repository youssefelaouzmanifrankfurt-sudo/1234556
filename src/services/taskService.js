// src/services/taskService.js
const storage = require('../utils/storage');
const logger = require('../utils/logger');

class TaskService {
    constructor() {
        // Wir laden hier nichts mehr in den Speicher (RAM),
        // damit wir immer die aktuelle Datei vom Netzwerklaufwerk holen.
        console.log("[SERVICE] TaskService im Live-Mode gestartet.");
    }

    // Hilfsfunktion: Immer frisch laden
    _load() {
        return storage.loadTasks() || [];
    }

    getAll() {
        return this._load(); // Immer frisch von der Festplatte lesen
    }

    add(text, creator, linkedChatId = null, linkedChatName = null) {
        const tasks = this._load(); // Erst aktuelle Liste holen
        
        const newTask = {
            id: Date.now(),
            text,
            creator: creator || 'System',
            status: 'offen',
            createdAt: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            linkedChatId,
            linkedChatName,
            updates: []
        };
        
        tasks.push(newTask);
        this._save(tasks);
        logger.log('info', 'Neue Aufgabe erstellt (Live-Sync).');
        return tasks;
    }

    addUpdate(id, text, user) {
        const tasks = this._load();
        const task = tasks.find(t => t.id === id);
        if (task) {
            if (!task.updates) task.updates = [];
            task.updates.push({
                text,
                user,
                time: new Date().toLocaleString([], {day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit'})
            });
            this._save(tasks);
        }
        return tasks;
    }

    complete(id, user) {
        const tasks = this._load();
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.status = 'erledigt';
            task.doneBy = user;
            task.doneAt = new Date().toLocaleString();
            this._save(tasks);
        }
        return tasks;
    }

    delete(id) {
        let tasks = this._load();
        tasks = tasks.filter(t => t.id !== id);
        this._save(tasks);
        return tasks;
    }

    cleanup() {
        let tasks = this._load();
        const before = tasks.length;
        tasks = tasks.filter(t => t.status !== 'erledigt');
        if (tasks.length < before) {
            this._save(tasks);
            logger.log('info', `Aufräumen: ${before - tasks.length} Aufgaben gelöscht.`);
        }
        return tasks;
    }

    _save(tasks) {
        storage.saveTasks(tasks);
    }
}

module.exports = new TaskService();