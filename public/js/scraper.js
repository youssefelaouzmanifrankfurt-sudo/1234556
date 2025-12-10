// public/js/scraper.js
const socket = io();
let currentPage = 1;
let currentQuery = "";
let currentSource = "Otto"; // Standard

// 1. SUCHE AUSFÜHREN
function searchProduct() {
    const query = document.getElementById('search-input').value;
    const source = document.getElementById('source-select').value;
    
    if(!query) return;
    
    currentQuery = query;
    currentSource = source;
    currentPage = 1; 
    
    document.getElementById('results-grid').innerHTML = '';
    document.getElementById('loader').classList.add('active');
    document.getElementById('btn-load-more').style.display = 'none';
    
    // Anfrage an Server
    socket.emit('search-external', { query, source });
}

document.getElementById('search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchProduct();
});

// 2. ERGEBNISSE EMPFANGEN
socket.on('external-search-results', (data) => {
    document.getElementById('loader').classList.remove('active');
    renderResults(data.results);
    
    // Load More Button anzeigen wenn viele Ergebnisse
    if (data.results.length >= 15) {
        document.getElementById('btn-load-more').style.display = 'block';
    }
});

// 3. MEHR LADEN (Pagination)
socket.on('external-search-more-results', (data) => {
    currentPage = data.page;
    document.getElementById('btn-load-more').innerText = "⬇ Mehr laden";
    renderResults(data.results); 
    
    if (data.results.length < 1) {
        document.getElementById('btn-load-more').style.display = 'none';
    }
});

function loadMore() {
    const btn = document.getElementById('btn-load-more');
    btn.innerText = "Lade...";
    socket.emit('search-more-external', { query: currentQuery, page: currentPage, source: currentSource });
}

// 4. RENDER HELPER
function renderResults(items) {
    const grid = document.getElementById('results-grid');
    if(items.length === 0 && currentPage === 1) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:#444;">Keine Ergebnisse gefunden.</div>';
        return;
    }

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        let imgUrl = item.img || 'https://via.placeholder.com/200?text=No+Img';

        card.innerHTML = `
            <div class="p-img-wrap">
                <img src="${imgUrl}" class="p-img">
            </div>
            <div class="p-body">
                <div class="p-source" style="color:${item.source === 'Idealo' ? '#f59e0b' : '#ef4444'}">${item.source}</div>
                <div class="p-title">${item.title}</div>
                <div class="p-price">${item.price}</div>
                <button class="btn-compare" onclick="selectProduct('${item.url}')">🔍 Vergleichen</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- MODAL LOGIK (Vergleich) ---
let currentExternalProduct = null;

function selectProduct(url) {
    document.getElementById('compare-modal').classList.add('open');
    document.getElementById('modal-content').innerHTML = '<div class="loader active">Lade Details...</div>';
    document.getElementById('btn-save').style.display = 'none';
    socket.emit('select-external-product', url);
}

socket.on('comparison-result', (data) => {
    currentExternalProduct = data.external;
    const local = data.localMatch;
    const score = data.score;
    let scoreColor = score > 80 ? '#10b981' : (score > 50 ? '#f59e0b' : '#ef4444');

    let techHtml = "";
    if(data.external.techData) {
        let content = Array.isArray(data.external.techData) ? data.external.techData.join('<br>') : data.external.techData;
        techHtml = `<div style="margin-top:10px; font-size:0.8rem; color:#888; max-height:100px; overflow:auto;">${content}</div>`;
    }
    
    let mainImg = (data.external.images && data.external.images.length) ? data.external.images[0] : '';

    const html = `
        <div class="c-col">
            <div style="color:#888; font-weight:bold;">EXTERN</div>
            <img src="${mainImg}" class="c-img">
            <div class="c-title">${data.external.title}</div>
            
            <label style="font-size:0.8rem; color:#666;">Verkaufspreis festlegen:</label>
            <input type="text" id="custom-price-input" value="${data.external.price}" 
                   style="width:100%; padding:8px; font-weight:bold; font-size:1.1rem; border:2px solid #ddd; border-radius:6px; margin-bottom:10px;">
            
            ${techHtml}
        </div>

        <div class="score-circle" style="border-color:${scoreColor}">
            <div class="score-val" style="color:${scoreColor}">${score}%</div>
            <div class="score-label">Match</div>
        </div>

        <div class="c-col">
            <div style="color:#888; font-weight:bold;">DEINE DB</div>
            ${local ? `
                <img src="${local.img}" class="c-img">
                <div class="c-title">${local.title}</div>
                <div class="c-price">${local.price}</div>
            ` : '<div style="padding:20px; border:2px dashed #333; color:#666;">Kein Match</div>'}
        </div>
    `;
    
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('btn-save').style.display = 'block';
});

function closeModal() { document.getElementById('compare-modal').classList.remove('open'); }

function saveProduct() {
    if(currentExternalProduct) {
        // 1. Hole den (vielleicht geänderten) Preis aus dem Input-Feld
        const newPrice = document.getElementById('custom-price-input').value;
        
        // 2. Überschreibe den Preis im Objekt
        if (newPrice) {
            currentExternalProduct.price = newPrice;
        }

        // 3. Jetzt erst senden wir es zum Speichern
        socket.emit('save-external-product', currentExternalProduct);
    }
}

socket.on('import-success', () => { closeModal(); alert("✅ Produkt importiert (Preis gespeichert)!"); });
socket.on('scrape-error', (msg) => { closeModal(); alert("❌ Fehler: " + msg); });


// --- AUTO START (DEEP LINK) ---
document.addEventListener("DOMContentLoaded", () => {
    // Prüfen ob URL Parameter ?q=... existiert
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');

    if (query) {
        const input = document.getElementById('search-input');
        input.value = query;
        
        // Kurze Verzögerung damit Socket sicher bereit ist
        setTimeout(() => {
            console.log("Auto-Suche gestartet:", query);
            searchProduct();
        }, 500);
        
        // URL bereinigen (damit beim Reload nicht nochmal gesucht wird)
        window.history.replaceState({}, document.title, "/scraper");
    }
});