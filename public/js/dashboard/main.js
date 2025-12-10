// public/js/dashboard/main.js
const socket = io();

// Globaler State für die Suche
let allAdsData = [];

// --- SOCKET EVENTS ---

socket.on('connect', () => {
    // Initialdaten abrufen
    socket.emit('get-db-products'); 
    socket.emit('get-tracking-data'); 
    socket.emit('get-analytics-chart'); 
});

// Chart Update
socket.on('update-analytics-chart', (data) => {
    if (window.renderPerformanceChart) window.renderPerformanceChart(data);
});

// Inventory Updates (Liste & Stats)
socket.on('update-db-list', processAds);
socket.on('update-db', processAds);

function processAds(ads) {
    if (!ads) return;
    allAdsData = ads; // Speichern für Suche

    // UI Updates via ui.js Helper
    if (window.ui) {
        window.ui.updateAdsStats(ads);
        window.ui.updateViewStats(ads);
        
        // Liste rendern (unter Berücksichtigung aktueller Suche)
        applySearchFilter();
    }
}

// Tasks & Chats
socket.on('update-tasks', (tasks) => {
    if (window.ui) window.ui.updateTaskStats(tasks);
});

socket.on('update-conversations', (data) => {
    if (window.ui) window.ui.updateChatStats(data);
});


// --- INTERAKTIONEN ---

// 1. Suche
const inpSearch = document.getElementById('inp-search');
if (inpSearch) {
    inpSearch.addEventListener('input', applySearchFilter);
}

function applySearchFilter() {
    const term = inpSearch ? inpSearch.value.toLowerCase() : "";
    
    if (!term) {
        window.ui.renderTopAds(allAdsData);
        return;
    }

    const filtered = allAdsData.filter(ad => {
        const title = (ad.title || "").toLowerCase();
        const id = (ad.id || "").toLowerCase();
        const status = (ad.status || "").toLowerCase();
        
        // Suche auch nach "gelöscht", wenn der Status so ist
        return title.includes(term) || id.includes(term) || status.includes(term);
    });
    
    window.ui.renderTopAds(filtered);
}

// 2. Scan Button
window.triggerScan = () => {
    if (window.ui) window.ui.setScanLoading();
    socket.emit('start-db-scrape');
    setTimeout(() => { window.location.href = '/datenbank'; }, 1000);
};

// 3. Re-Upload (Global verfügbar machen für HTML onclick)
window.reuploadItem = (id) => {
    if (confirm('Diesen gelöschten Artikel wirklich neu hochladen?')) {
        // Hier feuern wir das Re-Upload Event an den Server
        socket.emit('re-up-item', { id: id });
    }
};