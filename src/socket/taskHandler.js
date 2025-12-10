// src/socket/taskHandler.js
const taskService = require('../services/taskService');

module.exports = (io, socket) => {
    // Initiale Daten senden
    socket.emit('update-tasks', taskService.getAll());

    // Erstellen
    socket.on('add-task', (data) => {
        const list = taskService.add(data.text, data.creator, data.linkedChatId, data.linkedChatName);
        io.emit('update-tasks', list);
    });

    // Kommentar (Update)
    socket.on('add-task-update', (data) => {
        const list = taskService.addUpdate(data.id, data.text, data.user);
        io.emit('update-tasks', list);
    });

    // Erledigen
    socket.on('complete-task', (data) => {
        const list = taskService.complete(data.id, data.user);
        io.emit('update-tasks', list);
    });

    // Löschen
    socket.on('delete-task', (id) => {
        const list = taskService.delete(id);
        io.emit('update-tasks', list);
    });

    // Aufräumen
    socket.on('delete-completed-tasks', () => {
        const list = taskService.cleanup();
        io.emit('update-tasks', list);
    });
};