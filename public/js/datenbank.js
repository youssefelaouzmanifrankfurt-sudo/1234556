// public/js/datenbank.js
const socket = io();
let allItems = [];

// --- INIT ---
socket.on('connect', () => {
    socket.emit('get-db-products');
});

socket.on('update-db-list', (data) => {
    allItems = data || [];
    document.getElementById('progress-container').style.display = 'none';
    const btn = document.getElementById('btn-scan');
    if(btn) { btn.innerText = "🔄 Scan Starten"; btn.disabled = false; }
    
    updateStats(allItems);
    filterAds();
});

socket.on('scrape-progress', (data) => {
    const container = document.getElementById('progress-container');
    const bar = document.getElementById('progress-bar');
    const text = document.getElementById('progress-text');
    
    if(data.error) { if(text) text.innerText = "Fehler!"; return; }

    if(container) container.style.display = 'block';
    const btn = document.getElementById('btn-scan');
    if(btn) { btn.innerText = "⏳ Scan läuft..."; btn.disabled = true; }

    if(bar && data.total > 0) {
        const p = Math.round((data.current / data.total) * 100);
        bar.style.width = p + '%';
        if(text) text.innerText = `Scanne: ${p}% (${data.current}/${data.total})`;
    }
});

// --- RENDER ---
function renderGrid(items) {
    const grid = document.getElementById('db-grid');
    grid.innerHTML = '';

    if (!items || items.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:50px; opacity:0.5;">Keine Daten gefunden.</div>';
        return;
    }

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'db-card';
        
        let statusBadge = '';
        if (item.status === 'ACTIVE') statusBadge = '<span class="badge badge-active">🟢 Aktiv</span>';
        else if (item.status === 'DRAFT') statusBadge = '<span class="badge badge-draft">🟡 Entwurf</span>';
        else if (item.status === 'PAUSED') statusBadge = '<span class="badge badge-draft" style="color:#fbbf24; border-color:#fbbf24;">🟠 Pausiert</span>';
        else statusBadge = '<span class="badge badge-deleted">🔴 Gelöscht</span>';

        let stockBadge = '';
        if (item.inStock) {
            stockBadge = `<span class="badge badge-stock">🏠 Im Lager</span>`;
        }

        let imgUrl = '/img/placeholder.png';
        if (item.images && item.images.length > 0) imgUrl = item.images[0];
        else if (item.img) imgUrl = item.img;

        card.innerHTML = `
            <div class="card-top">
                <img src="${imgUrl}" class="card-img" onerror="this.src='/img/placeholder.png'">
                <div class="card-info">
                    <div class="card-title" title="${item.title}">${item.title}</div>
                    <div class="card-meta">
                        ${statusBadge}
                        ${stockBadge}
                        <span style="margin-left:auto; color:#94a3b8;">${item.price || 'VB'}</span>
                    </div>
                    <div style="font-size:0.75rem; color:#666; margin-top:5px;">ID: ${item.id}</div>
                </div>
            </div>
            <div class="card-stats">
                <span>👁️ ${item.views || 0}</span>
                <span>❤️ ${item.favorites || 0}</span>
                <span style="margin-left:auto;">📅 ${item.uploadDate || '-'}</span>
            </div>
            <div class="card-actions">
                <button class="btn-icon" onclick="reUpItem('${item.id}')" title="Re-Upload (Duplizieren)">🚀</button>
                
                <button class="btn-icon" onclick="showQR('${item.id}', '${item.title}')" title="QR Code">📱</button>
                <button class="btn-icon" onclick="openLink('${item.url}')" title="Öffnen">🌍</button>
                <button class="btn-icon" onclick="editItem('${item.id}')" title="Bearbeiten">✏️</button>
                <button class="btn-icon btn-del" onclick="deleteItem('${item.id}')" title="Löschen">🗑</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- FILTER LOGIK ---
function filterAds() {
    const term = document.getElementById('inp-search').value.toLowerCase();
    const status = document.getElementById('filter-status').value;
    const timeFilter = document.getElementById('filter-time').value;
    
    // Datum Berechnung (Heute)
    const now = new Date();
    const oneMonth = 30 * 24 * 60 * 60 * 1000;

    let filtered = allItems.filter(item => {
        // 1. Text Suche
        const matchText = (item.title||"").toLowerCase().includes(term) || 
                          (item.id||"").includes(term) || 
                          (item.internalNote||"").toLowerCase().includes(term);
        
        // 2. Status Filter
        let matchStatus = true;
        if(status === 'active') matchStatus = (item.status === 'ACTIVE');
        if(status === 'paused') matchStatus = (item.status === 'PAUSED');
        if(status === 'draft') matchStatus = (item.status === 'DRAFT');
        if(status === 'deleted') matchStatus = (item.status === 'DELETED');
        if(status === 'stock') matchStatus = (item.inStock === true);

        // 3. Zeit Filter
        let matchTime = true;
        if (timeFilter !== 'all') {
            const itemDate = parseDate(item.uploadDate);
            if (itemDate === 0) {
                matchTime = false;
            } else {
                const diff = now.getTime() - itemDate;
                if (timeFilter === '1m') matchTime = diff > oneMonth;
                if (timeFilter === '2m') matchTime = diff > (oneMonth * 2);
                if (timeFilter === '3m') matchTime = diff > (oneMonth * 3);
            }
        }

        return matchText && matchStatus && matchTime;
    });

    sortAds(filtered);
}

function sortAds(items = []) {
    const sortVal = document.getElementById('sort-order').value;
    items.sort((a, b) => {
        if(sortVal === 'views_desc') return (parseInt(b.views)||0) - (parseInt(a.views)||0);
        const dateA = parseDate(a.uploadDate);
        const dateB = parseDate(b.uploadDate);
        if(sortVal === 'date_asc') return dateA - dateB;
        return dateB - dateA;
    });
    renderGrid(items);
}

function parseDate(dateStr) {
    if(!dateStr || typeof dateStr !== 'string') return 0;
    const parts = dateStr.split('.');
    if(parts.length === 3) return new Date(parts[2], parts[1]-1, parts[0]).getTime();
    return 0;
}

function updateStats(items) {
    const total = items.length;
    const active = items.filter(i => i.status === 'ACTIVE').length;
    if(document.getElementById('stat-total')) document.getElementById('stat-total').innerText = total;
    if(document.getElementById('stat-active')) document.getElementById('stat-active').innerText = active;
}

// --- ACTIONS ---
window.startScrape = () => { if(confirm('Scan starten?')) socket.emit('start-db-scrape'); };
window.deleteInactiveAds = () => { if(confirm('Alle inaktiven löschen?')) socket.emit('delete-inactive-ads'); };
window.deleteItem = (id) => { if(confirm('Löschen?')) socket.emit('delete-db-item', id); };

// RE-UPLOAD (Duplizieren)
window.reUpItem = (id) => { 
    if(confirm('Anzeige als neuen Entwurf duplizieren?')) {
        const ip = prompt("Proxy IP (optional, sonst leer lassen):", ""); 
        socket.emit('re-up-item', { id, targetIp: ip }); 
    }
};

window.openLink = (url) => { if(url && url.startsWith('http')) window.open(url, '_blank'); else alert("Kein Link."); };

// EDIT MODAL
window.editItem = (id) => {
    const item = allItems.find(i => i.id === id);
    if(!item) return;
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-title').value = item.title;
    document.getElementById('edit-price').value = item.price;
    document.getElementById('edit-note').value = item.internalNote || "";
    document.getElementById('edit-modal').style.display = 'flex';
};
window.saveEdit = () => {
    const id = document.getElementById('edit-id').value;
    socket.emit('update-item-details', {
        id,
        title: document.getElementById('edit-title').value,
        price: document.getElementById('edit-price').value,
        internalNote: document.getElementById('edit-note').value
    });
    closeModal('edit-modal');
};

// QR
window.showQR = (id, title) => {
    const item = allItems.find(i => i.id === id);
    if(!item) return;
    const container = document.getElementById('qr-container');
    container.innerHTML = '';
    const url = item.url || `https://www.kleinanzeigen.de/s-anzeige/${id}`;
    const qrImg = document.createElement('img');
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;
    container.appendChild(qrImg);
    document.getElementById('qr-text').innerText = title;
    document.getElementById('qr-modal').style.display = 'flex';
};
window.closeModal = (id) => { document.getElementById(id).style.display = 'none'; };