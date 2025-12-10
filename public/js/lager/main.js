// public/js/lager/main.js
const socket = io();
window.socket = socket; 
window.lastStockItems = [];
window.currentEditId = null;
let currentCheckId = null;

socket.on('connect', () => socket.emit('get-stock'));
socket.on('force-reload-stock', () => socket.emit('get-stock'));

socket.on('update-stock', (items) => {
    window.lastStockItems = items || [];
    if(window.renderStock) window.renderStock(items);
});

// --- LOGIK ---
function generateAutoSKU() { 
    return "LAGER-" + Math.floor(1000 + Math.random() * 9000); 
}

window.startPriceSearch = () => {
    const query = document.getElementById('inp-title').value;
    if(query.length < 3) return alert("Bitte Modellnamen eingeben!");
    
    const list = document.getElementById('price-results');
    if(list) {
        list.style.display = 'block';
        list.innerHTML = '<div style="padding:15px; text-align:center;">⏳ Suche läuft...</div>';
    }
    socket.emit('search-price-sources', query);
};

socket.on('price-search-results', (results) => {
    if(window.renderPriceResults) window.renderPriceResults(results);
});

socket.on('db-match-result', (res) => {
    currentCheckId = res.stockId;
    const listContainer = document.getElementById('match-candidates-list');
    if(listContainer) {
        listContainer.innerHTML = ''; 
        if (res.candidates && res.candidates.length > 0) {
            res.candidates.forEach(cand => {
                const score = Math.round(cand.score * 100);
                const color = score > 80 ? '#10b981' : '#f59e0b';
                
                const el = document.createElement('div');
                el.className = 'match-candidate';
                el.style = "display:flex; align-items:center; padding:10px; border-bottom:1px solid #334155; cursor:pointer;";
                el.innerHTML = `
                    <img src="${cand.image || '/img/placeholder.png'}" style="width:40px; height:40px; object-fit:cover; margin-right:10px; border-radius:4px; background:#fff;">
                    <div style="flex:1;">
                        <div style="font-weight:bold; font-size:0.95rem; color:#fff;">${cand.title}</div>
                        <div style="font-size:0.8rem; color:#94a3b8;">${cand.status} • ${cand.price || 'VB'}</div>
                    </div>
                    <div style="background:${color}; color:white; padding:2px 8px; border-radius:12px; font-size:0.8rem; font-weight:bold;">${score}%</div>
                `;
                el.onclick = () => {
                    if(confirm(`Mit "${cand.title}" verbinden?`)) {
                        socket.emit('confirm-link', { stockId: currentCheckId, adId: cand.id, adImage: cand.image });
                        window.closeAllModals();
                    }
                };
                listContainer.appendChild(el);
            });
        } else {
            listContainer.innerHTML = '<div style="padding:30px; text-align:center; color:#64748b;">Keine ähnliche Anzeige gefunden.</div>';
        }
    }
    
    // Auto Create Event
    const btnCreate = document.getElementById('btn-auto-create-ad');
    if(btnCreate) {
        btnCreate.onclick = () => {
            if(confirm("Soll ein Entwurf automatisch erstellt werden?")) {
                socket.emit('auto-create-ad', currentCheckId);
            }
        };
    }

    const modal = document.getElementById('match-modal');
    if(modal) modal.classList.add('open');
});

// --- FEEDBACK ---
socket.on('export-progress', (msg) => window.showLoading("Verarbeite...", msg, true));
socket.on('export-success', (msg) => window.showLoading("Erfolg!", msg, false, true));
socket.on('export-error', (msg) => window.showLoading("Fehler", msg, false, false));

// --- CRUD ---
window.unlinkItem = (id) => { if(confirm("Verbindung lösen?")) socket.emit('unlink-stock-item', id); };

window.openCreateModal = () => {
    window.currentEditId = null;
    document.getElementById('modal-title').innerText = "Artikel anlegen";
    document.getElementById('inp-title').value = "";
    document.getElementById('inp-sku').value = generateAutoSKU();
    document.getElementById('inp-location').value = "";
    document.getElementById('inp-price').value = "";
    document.getElementById('inp-market-price').value = "";
    document.getElementById('inp-qty').value = "1";
    document.getElementById('price-results').style.display = 'none';
    document.getElementById('item-modal').classList.add('open');
};

window.openEditModal = (id) => {
    const item = window.lastStockItems.find(i => i.id === id);
    if(!item) return;
    window.currentEditId = id; 
    document.getElementById('modal-title').innerText = "Bearbeiten";
    document.getElementById('inp-title').value = item.title;
    document.getElementById('inp-sku').value = item.sku || generateAutoSKU();
    document.getElementById('inp-location').value = item.location || "";
    document.getElementById('inp-price').value = item.purchasePrice;
    document.getElementById('inp-market-price').value = item.marketPrice || "";
    document.getElementById('inp-qty').value = item.quantity;
    document.getElementById('inp-source-url').value = item.sourceUrl || "";
    document.getElementById('inp-source-name').value = item.sourceName || "";
    document.getElementById('item-modal').classList.add('open');
};

window.saveItem = () => {
    const data = {
        id: window.currentEditId,
        title: document.getElementById('inp-title').value,
        sku: document.getElementById('inp-sku').value,
        location: document.getElementById('inp-location').value,
        purchasePrice: document.getElementById('inp-price').value,
        quantity: document.getElementById('inp-qty').value,
        marketPrice: document.getElementById('inp-market-price').value,
        sourceUrl: document.getElementById('inp-source-url').value,
        sourceName: document.getElementById('inp-source-name').value
    };
    if(!data.title) return alert("Titel fehlt");
    if(window.currentEditId) socket.emit('update-stock-details', data);
    else socket.emit('create-new-stock', data);
    window.closeAllModals();
};

window.updateQty = (id, d) => socket.emit('update-stock-qty', { id, delta: d });

window.deleteItem = (id) => {
    if(!id && window.currentEditId) id = window.currentEditId;
    if(id && confirm("Wirklich löschen?")) {
        socket.emit('delete-stock-item', id);
        window.closeAllModals();
    }
};

window.checkDbMatch = (id) => socket.emit('request-db-match', id);

window.filterStock = () => {
    const term = document.getElementById('inp-search').value.toLowerCase();
    document.querySelectorAll('.stock-card').forEach(el => el.style.display = el.dataset.search.includes(term) ? 'flex' : 'none');
};