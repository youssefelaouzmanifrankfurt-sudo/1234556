// src/services/chat/index.js
const store = require('./store');
const provider = require('./provider');
const sender = require('./sender');

console.log("[SERVICE] ChatService (Modular) bereit.");

// Wir exportieren ein Objekt, das genau die Methoden hat, die chatHandler erwartet
module.exports = {
    // Getter für Cache
    getCachedList: store.getConversations,

    // Provider Methoden
    fetchConversations: provider.fetchConversations,
    getMessages: provider.getMessages,

    // Sender Methoden
    sendMessage: sender.sendMessage
};