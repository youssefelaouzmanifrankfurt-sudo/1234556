// public/js/lager/ui.js
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
        let trafficClass = 'light-grey';
        let statusMsg = 'Inaktiv';
        let actionBtn = '';

        if (item.isLinked) {
            actionBtn = `<button class="btn-mini btn-del" onclick="unlinkItem('${item.id}')" title="Verbindung lösen" style="background:#ef4444; color:white;">Trennen ❌</button>`;
        } else {
            actionBtn = `<button class="btn-mini btn-check" onclick="checkDbMatch('${item.id}')">Verbinden 🔗</button>`;
        }

        switch(item.trafficStatus) {
            case 'green': trafficClass='light-green'; statusMsg='Online'; break;
            case 'yellow': trafficClass='light-yellow'; statusMsg='Offline!'; break;
            case 'red': trafficClass='light-red'; statusMsg='Leer!'; break;
        }

        let imgHtml = '';
        if (item.image) {
            imgHtml = `<img src="${item.image}" style="width:50px; height:50px; object-fit:contain; background:#fff; margin-right:10px;">`;
        }

        const card = document.createElement('div');
        card.className = 'stock-card';
        card.dataset.search = (item.title + " " + (item.sku||"")).toLowerCase();
        
        card.innerHTML = `
            <div style="display:flex; padding:10px;">
                ${imgHtml}
                <div style="flex:1; min-width:0;">
                    <div style="font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.title}</div>
                    <div style="font-size:0.8rem; margin-top:5px; display:flex; align-items:center;">
                        <span class="traffic-light ${trafficClass}"></span>
                        <span>${statusMsg}</span>
                        <span style="background:#334155; margin-left:5px; padding:2px 5px; border-radius:3px;">${item.sku||'-'}</span>
                    </div>
                </div>
            </div>
            <div style="display:flex; justify-content:space-between; padding:10px; border-top:1px solid #334155; background:rgba(0,0,0,0.2);">
                <div style="display:flex; align-items:center;">
                   <button class="btn-mini" onclick="window.updateQty('${item.id}', -1)">-</button>
                   <b style="margin:0 8px; font-size:1.1rem;">${item.quantity}</b>
                   <button class="btn-mini" onclick="window.updateQty('${item.id}', 1)">+</button>
                </div>
                
                <div style="display:flex; gap:5px;">
                   <button class="btn-mini btn-del" onclick="window.deleteItem('${item.id}')" title="Löschen" style="color:#ef4444; border-color:#ef4444;">🗑️</button>
                   ${actionBtn}
                   <button class="btn-mini" onclick="openPrintModal('${item.id}')" title="Drucken">🖨️</button>
                   <button class="btn-mini" onclick="openEditModal('${item.id}')" title="Bearbeiten">✏️</button>
                </div>
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
        list.innerHTML = '<div style="padding:10px; text-align:center;">Nichts gefunden. Manuell eingeben.</div>';
        return;
    }

    results.forEach(res => {
        const div = document.createElement('div');
        div.className = 'price-item';
        div.innerHTML = `
            <img src="${res.image || '/img/placeholder.png'}">
            <div style="flex:1;">
                <div style="font-weight:bold; font-size:0.9rem;">${res.title}</div>
                <div style="display:flex; align-items:center; margin-top:2px;">
                    <span class="price-source src-${res.source.toLowerCase()}">${res.source}</span>
                    <span style="color:#10b981; font-weight:bold;">${typeof res.price === 'number' ? res.price.toFixed(2).replace('.', ',') : res.price} €</span>
                </div>
            </div>
            <button class="btn-mini">Übernehmen</button>
        `;
        div.onclick = () => {
            document.getElementById('inp-title').value = res.title; 
            let priceVal = res.price;
            if(typeof priceVal === 'string') priceVal = parseFloat(priceVal.replace(',', '.'));
            
            const marketInp = document.getElementById('inp-market-price');
            const priceInp = document.getElementById('inp-price');
            if(marketInp) marketInp.value = priceVal.toFixed(2);
            if(priceInp) priceInp.value = (priceVal * 0.45).toFixed(2);
            
            document.getElementById('inp-source-url').value = res.url;
            document.getElementById('inp-source-name').value = res.source;
            list.style.display = 'none';
        };
        list.appendChild(div);
    });
};