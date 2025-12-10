// src/services/chat/provider.js
const chatController = require('../../scrapers/chatController');
const logger = require('../../utils/logger');
const store = require('./store');

// Liste der Chats laden
async function fetchConversations(count = 20) {
    try {
        const chats = await chatController.getConversations(count);
        // Cache aktualisieren
        store.setConversations(chats);
        return chats;
    } catch (e) {
        logger.log('error', 'Chat-Liste Fehler: ' + e.message);
        // Bei Fehler: Cache zurückgeben
        return store.getConversations(); 
    }
}

// Nachrichten eines Chats holen
async function getMessages(chatId, forceLoad = false, loadHistory = false) {
    const cached = store.getMessages(chatId);

    // 1. Cache zurückgeben, wenn vorhanden & nicht erzwungen
    if (!forceLoad && !loadHistory && cached) {
        return { 
            chatId, 
            messages: cached, 
            fromCache: true 
        };
    }

    // 2. Frisch laden via Controller
    try {
        const result = await chatController.loadChatMessages(chatId, loadHistory);
        if (result && result.messages) {
            store.setMessages(chatId, result.messages); // Cache update
            return { 
                chatId, 
                messages: result.messages, 
                fromCache: false,
                isHistory: loadHistory 
            };
        }
    } catch (e) {
        logger.log('error', 'Nachrichten Fehler: ' + e.message);
    }
    
    return null;
}

module.exports = { fetchConversations, getMessages };