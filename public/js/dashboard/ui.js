// public/js/dashboard/ui.js

window.ui = {
    // Elemente cachen
    elTotalAds: document.getElementById('stat-total-ads'),
    elTotalViews: document.getElementById('stat-total-views'),
    elOpenTasks: document.getElementById('stat-open-tasks'),
    elTotalMsgs: document.getElementById('stat-total-msgs'),
    elTopList: document.getElementById('top-list'),
    btnScan: document.getElementById('btn-scan'),

    // --- STATISTIKEN UPDATES ---
    
    updateAdsStats: (ads) => {
        if (!window.ui.elTotalAds) return;
        const activeAds = ads.filter(a => a.status === 'ACTIVE' || (!a.status && a.active));
        const deletedAds = ads.filter(a => a.status === 'DELETED');
        
        if (deletedAds.length > 0) {
            window.ui.elTotalAds.innerHTML = `${activeAds.length} <span style="font-size:0.6em; color:#ef4444;">(${deletedAds.length} del)</span>`;
        } else {
            window.ui.elTotalAds.innerText = activeAds.length;
        }
    },

    updateViewStats: (ads) => {
        if (!window.ui.elTotalViews) return;
        let totalViews = 0;
        let viewsDiff = 0;

        ads.forEach(ad => {
            totalViews += (parseInt(ad.views) || 0);
            if (ad.statsDiff && ad.statsDiff.views) {
                viewsDiff += ad.statsDiff.views;
            }
        });

        window.ui.elTotalViews.innerHTML = `
            ${totalViews.toLocaleString()}
            ${viewsDiff > 0 ? `<span style="font-size:0.9rem; color:#10b981; margin-left:5px;">+${viewsDiff}</span>` : ''}
        `;
    },

    updateTaskStats: (tasks) => {
        if (window.ui.elOpenTasks && tasks) {
            const open = tasks.filter(t => t.status === 'offen').length;
            window.ui.elOpenTasks.innerText = open;
        }
    },

    updateChatStats: (data) => {
        if (window.ui.elTotalMsgs) {
            const chats = Array.isArray(data) ? data : (data.chats || []);
            let unread = 0;
            chats.forEach(c => { if(c.hasNewMessage) unread++; });
            
            if (unread > 0) window.ui.elTotalMsgs.innerHTML = `<span style="color:#ef4444;">${unread} NEU</span>`;
            else window.ui.elTotalMsgs.innerText = chats.length;
        }
    },

    // --- LISTE RENDERN ---

    renderTopAds: (ads) => {
        const listEl = window.ui.elTopList;
        if (!listEl) return;
        
        // Sortieren nach Views (absteigend)
        const sorted = [...ads].sort((a, b) => (parseInt(b.views)||0) - (parseInt(a.views)||0));
        const listToRender = sorted.slice(0, 200); 

        listEl.innerHTML = '';
        if (listToRender.length === 0) {
            listEl.innerHTML = '<div style="padding:20px; text-align:center; color:#666;">Keine Anzeigen gefunden.</div>';
            return;
        }

        listToRender.forEach((ad, index) => {
            const div = document.createElement('div');
            div.className = 'top-item';
            
            let imgUrl = 'https://via.placeholder.com/50';
            if (ad.images && ad.images.length > 0) imgUrl = ad.images[0];
            else if (ad.img) imgUrl = ad.img;

            // Visualisierung für gelöschte Items
            let titleClass = "item-title";
            let statusBadge = "";
            let opacity = "1";

            if (ad.status === 'DELETED') {
                titleClass += " text-danger"; 
                statusBadge = '<span style="color:#ef4444; font-size:0.8em; margin-left:5px;">[GELÖSCHT]</span>';
                opacity = "0.6";
            }

            div.style.opacity = opacity;
            div.innerHTML = `
                <div class="item-rank">#${index + 1}</div>
                <img src="${imgUrl}" class="item-img">
                <div class="item-info">
                    <a href="${ad.url || '#'}" target="_blank" class="${titleClass}">${ad.title || 'Unbekannt'}</a>
                    ${statusBadge}
                    <div class="item-meta">ID: ${ad.id} • ${ad.price || ''}</div>
                </div>
                <div class="item-stats">
                    <span class="stat-pill">👁 ${ad.views || 0}</span>
                    ${ad.status === 'DELETED' ? 
                        `<button onclick="window.reuploadItem('${ad.id}')" title="Neu einstellen" style="margin-left:10px; background:#222; border:1px solid #444; color:#fff; cursor:pointer; padding:2px 8px; border-radius:4px;">♻️</button>` 
                        : ''}
                </div>
            `;
            listEl.appendChild(div);
        });
    },

    setScanLoading: () => {
        if(window.ui.btnScan) window.ui.btnScan.innerHTML = "⏳ Starte...";
    }
};