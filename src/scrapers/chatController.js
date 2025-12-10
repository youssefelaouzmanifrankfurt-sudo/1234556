// src/scrapers/chatController.js

// Wir importieren die Funktionen aus den einzelnen Modulen im 'chat'-Ordner
const { connectToBrowser } = require('./chat/connection');
const { getConversations } = require('./chat/conversationList');
const { loadChatMessages } = require('./chat/messageHistory');
const { sendMessage } = require('./chat/messageSender');

// Wir exportieren alles gebündelt, damit server.js es einfach nutzen kann
module.exports = {
    connectToBrowser,
    getConversations,
    loadChatMessages,
    sendMessage
};