// public/js/tracking.js

// WICHTIG: Wir nutzen den globalen Socket, falls vorhanden
const socket = window.socket || io();

const pWrapper = document.getElementById('progress-wrapper');
const pBar = document.getElementById('progress-bar');
const pText = document.getElementById('progress-text');

// Daten sofort anfordern
socket.emit('get-tracking-data');

// --- UPDATE EVENT ---
socket.on('update-tracking', (ads) => {
    const loader = document.getElementById('app-loader');
    // Loader sofort ausblenden, egal ob Daten da sind oder nicht
    if(loader) loader.classList.add('fade-out');

    const grid = document.getElementById('grid');
    grid.innerHTML = '';

    if(!ads || ads.length === 0) {
        grid.innerHTML = `
            <div style="color:#666; grid-column: 1/-1; text-align:center; padding:80px; border: 2px dashed #222; border-radius: 20px;">
                <div style="font-size:3rem; margin-bottom:10px; opacity:0.5;">🤷‍♂️</div>
                Keine aktiven Werbeaktionen oder Favoriten.<br>
                <span style="font-size:0.8rem; opacity:0.6;">(Markiere Favoriten in der Datenbank oder starte einen Scan)</span>
            </div>`;
        return;
    }

    // Sortieren
    ads.sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return a.minDays - b.minDays;
    });

    ads.forEach(ad => {
        const card = document.createElement('div');
        const isCritical = ad.minDays <= 2;
        const isFav = ad.isFavorite;
        
        let classes = 'card';
        if (isFav) classes += ' favorite';
        else if (isCritical) classes += ' critical';
        card.className = classes;

        let featuresHtml = '';
        if (ad.features) {
            ad.features.forEach(f => {
                let dayClass = 'days-ok';
                let rowStyle = '';
                let statusText = '';
                let progressPercent = 100;

                if (f.daysLeft === -999) {
                    statusText = 'Aktiv'; 
                } else if (f.daysLeft <= 0) {
                     statusText = (f.daysLeft === 0) ? 'HEUTE ENDE' : 'ABGELAUFEN';
                     dayClass = 'days-crit';
                     rowStyle = 'border-color: rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.05);';
                     progressPercent = 0;
                } else {
                    statusText = `noch ${f.daysLeft} Tage`;
                    progressPercent = Math.min(100, (f.daysLeft / 7) * 100);
                    if (f.daysLeft <= 2) { dayClass = 'days-crit'; rowStyle = 'border-color: rgba(239, 68, 68, 0.3);'; } 
                    else if (f.daysLeft <= 4) { dayClass = 'days-warn'; }
                }

                let icon = '🔹';
                let label = f.type;
                if(f.type === 'top') { icon = '⭐'; label = 'Top-Anzeige'; }
                if(f.type === 'gallery') { icon = '🖼️'; label = 'Galerie'; }
                if(f.type === 'bump') { icon = '⬆️'; label = 'Hochschieben'; }
                if(f.type === 'manual') { icon = '📌'; label = 'Manuell'; }

                featuresHtml += `
                    <div class="feat-row" style="${rowStyle}">
                        <div class="progress-bg" style="width:${progressPercent}%; background-color: ${dayClass === 'days-crit' ? 'var(--urgent)' : (dayClass === 'days-warn' ? 'var(--warn)' : 'var(--accent)')};"></div>
                        <div style="display:flex; align-items:center; gap:8px; z-index:1;">
                            <span style="opacity:0.7;">${icon}</span>
                            <span style="font-weight:600; color:#ddd;">${label}</span>
                        </div>
                        <span class="days-badge ${dayClass}">${statusText}</span>
                    </div>
                `;
            });
        }

        card.innerHTML = `
            <div class="fav-indicator">⭐</div>
            <div class="card-header">
                <img src="${ad.img || 'https://via.placeholder.com/70'}" class="thumb">
                <div class="info">
                    <h3>${ad.title}</h3>
                    <div class="price">${ad.price}</div>
                    <div class="id">ID: ${ad.id}</div>
                </div>
            </div>
            <div class="features">${featuresHtml}</div>
            
            <div class="action-bar">
                <button class="icon-btn btn-check" onclick="scanSingle('${ad.id}')" title="Live Prüfen">⚡</button>
                <button class="icon-btn btn-refresh" onclick="manualRefresh('${ad.id}')" title="Verlängern">🔄</button>
                <button class="icon-btn btn-fav ${isFav ? 'active' : ''}" onclick="toggleFav('${ad.id}')" title="Favorit">⭐</button>
                <button class="icon-btn btn-del" onclick="removeLocal('${ad.id}')" title="Entfernen">🗑️</button>
            </div>
        `;
        grid.appendChild(card);
    });
});

// --- ACTIONS ---
function startFullScan() {
    pWrapper.style.display = 'block';
    pBar.style.width = '0%';
    pText.innerText = "Starte Scan...";
    socket.emit('start-db-scrape');
}
socket.on('scrape-progress', (data) => {
    pWrapper.style.display = 'block';
    const percent = Math.round((data.current / data.total) * 100);
    pBar.style.width = percent + '%';
    pText.innerText = `${data.current} / ${data.total} gescannt (${percent}%)`;
});
socket.on('update-db', () => {
    if(pWrapper.style.display === 'block') {
        pBar.style.width = '100%';
        pText.innerText = "FERTIG!";
        setTimeout(() => { pWrapper.style.display = 'none'; socket.emit('get-tracking-data'); }, 1500);
    }
});

function scanSingle(id) {
    const btn = event.target; btn.style.opacity = "0.5";
    socket.emit('scan-single-ad', id);
    setTimeout(() => btn.style.opacity = "1", 2000);
}
function toggleFav(id) { socket.emit('toggle-favorite', id); }
function manualRefresh(id) { if(confirm("Manuell auf 'Aktiv' setzen (7 Tage)?")) socket.emit('manual-refresh', id); }
function removeLocal(id) { if(confirm("Aus Tracking entfernen?")) socket.emit('remove-local-ad', id); }