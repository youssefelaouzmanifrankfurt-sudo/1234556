// public/js/lager/ui.js

// [JEFF HELPER] Zentrale Formatierung für Client
const formatPriceDE = (val) => {
    if (val === undefined || val === null) return "0,00";
    // Versucht zu parsen, egal ob String mit Komma oder Punkt
    let str = val.toString().replace(',', '.');
    let num = parseFloat(str);
    if (isNaN(num)) return "0,00";
    return num.toFixed(2).replace('.', ',');
};

// Sicherer Parser für Berechnungen
const parsePriceClient = (val) => {
    if (!val) return 0;
    let str = val.toString().replace(',', '.');
    return parseFloat(str) || 0;
};

window.showLoading = (title, text, loading, success = false) => {
    window.closeAllModals();
    const modal = document.getElementById('loading-modal');
    if(!modal) return;
    document.getElementById('loading-title').innerText = title;
    document.getElementById('loading-text').innerText = text;
    document.getElementById('loading-spinner').innerText = loading ? "⏳" : (success ? "✅" : "❌");
    
    const btn = document.getElementById('btn-loading-ok');
    btn.style.display = loading ? 'none' : 'block';
    btn.innerText = success ? "OK" : "Schließen";
    btn.onclick = () => window.closeAllModals();
    modal.classList.add('open');
};

window.closeAllModals = () => document.querySelectorAll('.modal-overlay').forEach(e => e.classList.remove('open'));

window.renderStock = (items) => {
    const grid = document.getElementById('stock-grid');
    if(!grid) return;
    grid.innerHTML = '';
    
    const priority = { 'red': 4, 'yellow': 3, 'green': 2, 'grey': 1 };
    items.sort((a,b) => priority[b.trafficStatus] - priority[a.trafficStatus]);
    
    const statEl = document.getElementById('stat-total');
    if(statEl) statEl.innerText = items.reduce((acc, i) => acc + (parseInt(i.quantity)||0), 0);

    items.forEach(item => {
        let statusColor = '#9ca3af'; 
        if(item.trafficStatus === 'red') statusColor = '#ef4444';
        if(item.trafficStatus === 'yellow') statusColor = '#eab308';
        if(item.trafficStatus === 'green') statusColor = '#10b981';

        const card = document.createElement('div');
        card.className = 'stock-card';
        
        // [JEFF FIX] Saubere Anzeige
        const displayPrice = formatPriceDE(item.purchasePrice);

        card.innerHTML = `
            <div class="card-header">
                <span class="sku-badge">${item.sku || 'N/A'}</span>
                <div class="status-dot" style="background-color: ${statusColor};"></div>
            </div>
            <div class="card-img-container">
                <img src="${item.image || '/img/placeholder.png'}" alt="${item.title}">
            </div>
            <div class="card-body">
                <div class="card-title">${item.title}</div>
                <div class="card-info">
                    <div>Lager: <strong>${item.location || '-'}</strong></div>
                    <div>Menge: <strong>${item.quantity || 0}</strong></div>
                </div>
                <div class="card-price">EK: ${displayPrice} €</div>
                <div class="card-actions">
                    <button class="btn-icon" onclick="window.openEdit('${item.id}')">✏️</button>
                    <button class="btn-icon delete" onclick="window.deleteItem('${item.id}')">🗑️</button>
                    <button class="btn-icon" onclick="window.checkDbMatch('${item.id}')">🔗</button>
                </div>
                ${item.linkedAdId ? '<div style="margin-top:5px; font-size:0.7rem; color:#10b981;">✅ Im Inventar</div>' : ''}
            </div>
        `;
        grid.appendChild(card);
    });
};

window.renderPriceResults = (results) => {
    const list = document.getElementById('price-results');
    if(!list) return;
    list.innerHTML = '';
    
    if(!results || results.length === 0) {
        list.innerHTML = '<div style="padding:10px; color:#aaa;">Keine Ergebnisse.</div>';
        return;
    }

    results.forEach(res => {
        const div = document.createElement('div');
        div.className = 'price-item';
        
        // [JEFF FIX] Sicher formatieren
        const priceStr = formatPriceDE(res.price);

        div.innerHTML = `
            <img src="${res.image || '/img/placeholder.png'}">
            <div style="flex:1;">
                <div style="font-weight:bold; font-size:0.9rem;">${res.title}</div>
                <div style="display:flex; align-items:center; margin-top:2px;">
                    <span class="price-source src-${(res.source||'').toLowerCase()}">${res.source}</span>
                    <span style="color:#10b981; font-weight:bold;">${priceStr} €</span>
                </div>
            </div>
            <button class="btn-mini">Übernehmen</button>
        `;
        
        div.onclick = () => {
            document.getElementById('inp-title').value = res.title; 
            
            // [JEFF FIX] Sicher parsen für Input Feld
            const priceVal = parsePriceClient(res.price);
            
            const marketInp = document.getElementById('inp-market-price');
            const priceInp = document.getElementById('inp-price');
            
            // Input type="number" braucht "8.99", nicht "8,99"
            if(marketInp) marketInp.value = priceVal.toFixed(2);
            if(priceInp) priceInp.value = (priceVal * 0.45).toFixed(2);
            
            document.getElementById('inp-source-url').value = res.url || "";
            document.getElementById('inp-source-name').value = res.source || "";
            
            document.getElementById('price-results').style.display = 'none';
        };
        list.appendChild(div);
    });
};