// public/js/datenbank.js
const socket = io();
let allItems = [];

// [JEFF HELPER] 
const formatPriceDE = (val) => {
    if (val === undefined || val === null) return "-";
    // Entfernt " €" falls schon vorhanden, parst float, formatiert neu
    let clean = val.toString().replace(' €', '').replace(',', '.');
    let num = parseFloat(clean);
    if(isNaN(num)) return val;
    return num.toFixed(2).replace('.', ',') + " €";
};

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
    
    // Sortierung
    const sortMode = document.getElementById('sort-order').value;
    items.sort((a,b) => {
        if(sortMode === 'views_desc') return (b.views||0) - (a.views||0);
        if(sortMode === 'date_asc') return new Date(a.uploadDate) - new Date(b.uploadDate);
        return new Date(b.uploadDate) - new Date(a.uploadDate); // Default: Newest first
    });

    items.forEach(item => {
        let statusColor = '#94a3b8';
        let statusLabel = 'Inaktiv';
        
        if (item.status === 'ACTIVE') { statusColor = '#10b981'; statusLabel = 'Aktiv'; }
        if (item.status === 'PAUSED') { statusColor = '#f59e0b'; statusLabel = 'Pausiert'; }
        if (item.status === 'DRAFT') { statusColor = '#eab308'; statusLabel = 'Entwurf'; }
        
        if (item.inStock) {
            statusLabel += ' <span style="color:#3b82f6; font-size:0.8rem;">[LAGER]</span>';
        }

        const imgSrc = (item.images && item.images.length > 0) ? item.images[0] : '/img/placeholder.png';
        
        // [JEFF FIX] Preis Anzeige
        const priceDisplay = formatPriceDE(item.price);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><img src="${imgSrc}" class="thumb"></td>
            <td>
                <div style="font-weight:bold;">${item.title}</div>
                <div style="font-size:0.8rem; color:#888;">${item.id}</div>
            </td>
            <td style="font-weight:bold; color:#e2e8f0;">${priceDisplay}</td>
            <td><span style="color:${statusColor}; font-weight:bold;">${statusLabel}</span></td>
            <td>
                <button class="btn btn-mini" onclick="editItem('${item.id}')">✏️</button>
                <button class="btn btn-mini" onclick="showQR('${item.id}', '${item.title}')">📱</button>
            </td>
        `;
        grid.appendChild(row);
    });
}

function updateStats(items) {
    document.getElementById('stat-total').innerText = items.length;
    document.getElementById('stat-active').innerText = items.filter(i => i.status === 'ACTIVE').length;
}

// FILTER & SORT
window.filterAds = () => {
    const search = document.getElementById('inp-search').value.toLowerCase();
    const status = document.getElementById('filter-status').value;
    const time = document.getElementById('filter-time').value;

    let filtered = allItems.filter(i => {
        if (search && !i.title.toLowerCase().includes(search)) return false;
        
        if (status === 'active' && i.status !== 'ACTIVE') return false;
        if (status === 'paused' && i.status !== 'PAUSED') return false;
        if (status === 'draft' && i.status !== 'DRAFT') return false;
        if (status === 'deleted' && i.status !== 'DELETED') return false;
        if (status === 'stock' && !i.inStock) return false;

        if (time !== 'all') {
            const date = new Date(i.uploadDate);
            const now = new Date();
            const diffMonths = (now - date) / (1000 * 60 * 60 * 24 * 30);
            if (time === '1m' && diffMonths < 1) return false;
            if (time === '2m' && diffMonths < 2) return false;
            if (time === '3m' && diffMonths < 3) return false;
        }
        return true;
    });
    renderGrid(filtered);
};

window.sortAds = () => filterAds(); // Trigger re-render with current filter

// ACTIONS
window.startScrape = () => {
    if(confirm("Kompletten Scan starten? (Dauert einige Minuten)")) {
        socket.emit('start-manual-scan');
    }
};

window.deleteInactiveAds = () => {
    if(confirm("Alle gelöschten/inaktiven Anzeigen entfernen?")) {
        socket.emit('cleanup-db');
    }
};

window.closeModal = (id) => { document.getElementById(id).style.display = 'none'; };

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

window.showQR = (id, title) => {
    const item = allItems.find(i => i.id === id);
    if(!item) return;
    const container = document.getElementById('qr-container');
    container.innerHTML = '';
    // Falls keine URL da ist, generieren wir eine Fake-URL oder nutzen die ID
    const url = item.url || `https://www.kleinanzeigen.de/s-anzeige/${id}`;
    
    const qrImg = document.createElement('img');
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;
    container.appendChild(qrImg);
    
    document.getElementById('qr-text').innerText = title;
    document.getElementById('qr-modal').style.display = 'flex';
};