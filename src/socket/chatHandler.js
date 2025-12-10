// src/socket/chatHandler.js
const chatService = require('../services/chatService');
const logger = require('../utils/logger');

module.exports = (io, socket) => {
    
    // --- 1. LISTE SENDEN ---
    
    // A) Sofort Cache senden (schnell für die UI)
    const cached = chatService.getCachedList();
    if (cached.length > 0) {
        socket.emit('update-conversations', { chats: cached });
    }
    
    // B) Im Hintergrund frisch laden (aktualisiert die UI später)
    chatService.fetchConversations(20).then(chats => {
        socket.emit('update-conversations', { chats });
    });

    // --- 2. CHAT ÖFFNEN ---
    socket.on('request-messages', async (data) => {
        // Erst Cache probieren (für Speed)
        const cachedData = await chatService.getMessages(data.chatId, false);
        if (cachedData && cachedData.fromCache) {
            socket.emit('update-messages', { 
                chatId: cachedData.chatId, 
                messages: cachedData.messages, 
                isHistoryLoad: false 
            });
        }

        // Dann frisch laden (für Sicherheit/Aktualität)
        const freshData = await chatService.getMessages(data.chatId, true);
        if (freshData) {
            socket.emit('update-messages', { 
                chatId: freshData.chatId, 
                messages: freshData.messages, 
                isHistoryLoad: false 
            });
        }
    });

    // --- 3. NACHRICHT SENDEN ---
    socket.on('send-message', async (data) => {
        logger.log('info', `Sende an ${data.chatId}...`);
        
        const result = await chatService.sendMessage(data.chatId, data.text);
        
        if (result) {
            // Wenn erfolgreich gesendet und neu geladen, Update an Frontend
            socket.emit('update-messages', { 
                chatId: result.chatId, 
                messages: result.messages, 
                isHistoryLoad: false 
            });
        }
    });

    // --- 4. MEHR LADEN (Historie & Liste) ---
    
    socket.on('load-more-history', async (data) => {
        const result = await chatService.getMessages(data.chatId, true, true);
        if (result) {
            socket.emit('update-messages', { 
                chatId: result.chatId, 
                messages: result.messages, 
                isHistoryLoad: true 
            });
        }
    });

    socket.on('load-more-chats', async (data) => {
        const currentCount = data.currentCount || 20;
        const chats = await chatService.fetchConversations(currentCount + 20);
        socket.emit('update-conversations', { chats });
    });

    socket.on('refresh-chats', async () => {
        const chats = await chatService.fetchConversations(20);
        socket.emit('update-conversations', { chats });
    });
};