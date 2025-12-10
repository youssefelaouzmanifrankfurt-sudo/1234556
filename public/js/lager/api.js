// public/js/lager/api.js
const socket = io();

const API = {
    // --- LAGER ---
    loadStock: () => socket.emit('get-stock'),
    
    createItem: (data) => socket.emit('create-new-stock', data),
    updateItem: (data) => socket.emit('update-stock-details', data),
    deleteItem: (id) => socket.emit('delete-stock-item', id),
    updateQty: (id, delta) => socket.emit('update-stock-qty', { id, delta }),
    
    // --- FEATURES ---
    searchPrices: (query) => socket.emit('search-price-sources', query),
    checkMatch: (id) => socket.emit('request-db-match', id),
    confirmLink: (data) => socket.emit('confirm-link', data),
    unlink: (id) => socket.emit('unlink-stock-item', id),
    
    // --- IMPORT ---
    autoCreateAd: (id) => socket.emit('auto-create-ad', id),
    
    // --- SCANNER ---
    sendScan: (code) => socket.emit('check-scan', code),

    // --- EVENTS (Callback registrieren) ---
    on: (event, callback) => socket.on(event, callback)
};

// Global verfügbar machen
window.AppAPI = API;