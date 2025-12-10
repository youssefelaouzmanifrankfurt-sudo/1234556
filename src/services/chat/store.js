// src/services/chat/store.js

// Einfacher In-Memory Speicher für den Chat-Cache
const state = {
    conversations: [], // Liste der Chats
    messages: {}       // Nachrichten pro Chat-ID
};

module.exports = {
    getConversations: () => state.conversations,
    setConversations: (list) => { state.conversations = list; },
    
    getMessages: (id) => state.messages[id],
    setMessages: (id, msgs) => { state.messages[id] = msgs; }
};