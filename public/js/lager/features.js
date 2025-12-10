// public/js/lager/features.js
let html5QrcodeScanner = null;

const Features = {
    // --- PREIS SUCHE ---
    startPriceSearch: () => {
        const query = document.getElementById('inp-title').value;
        if(query.length < 3) return alert("Bitte Modellnamen eingeben!");
        
        const list = document.getElementById('price-results');
        list.style.display = 'block';
        list.innerHTML = '<div style="padding:15px; text-align:center;">⏳ Suche läuft...</div>';
        
        AppAPI.searchPrices(query);
    },

    renderPriceResults: (results) => {
        const list = document.getElementById('price-results');
        list.innerHTML = '';
        
        if(!results || results.length === 0) {
            list.innerHTML = '<div style="padding:10px; text-align:center;">Nichts gefunden.</div>';
            return;
        }
    
        results.forEach(res => {
            const div = document.createElement('div');
            div.className = 'price-item';
            div.innerHTML = `
                <img src="${res.image || '/img/placeholder.png'}">
                <div style="flex:1;">
                    <div style="font-weight:bold; font-size:0.9rem;">${res.title}</div>
                    <div style="display:flex; align-items:center;">
                        <span class="price-source src-${res.source.toLowerCase()}">${res.source}</span>
                        <span style="color:#10b981; font-weight:bold;">${typeof res.price === 'number' ? res.price.toFixed(2) : res.price} €</span>
                    </div>
                </div>
                <button class="btn-mini">Wählen</button>
            `;
            div.onclick = () => {
                document.getElementById('inp-title').value = res.title; 
                document.getElementById('inp-market-price').value = res.price;
                // 45% Regel
                document.getElementById('inp-price').value = (res.price * 0.45).toFixed(2);
                document.getElementById('inp-source-url').value = res.url || "";
                document.getElementById('inp-source-name').value = res.source;
                list.style.display = 'none';
            };
            list.appendChild(div);
        });
    },

    // --- DRUCKEN ---
    openPrintModal: async (id) => {
        const item = window.AppState.items.find(i => i.id === id);
        if(!item) return;
        try {
            const res = await fetch(`/api/qr/${encodeURIComponent(item.sku || item.id)}`);
            const data = await res.json();
            if(data.url) {
                document.getElementById('print-qr').src = data.url;
                document.getElementById('print-title').innerText = item.title.substring(0, 30);
                document.getElementById('print-sku').innerText = item.sku || "Keine SKU";
                AppUI.showModal('print-modal');
            }
        } catch(e) { alert("QR Fehler"); }
    },

    printLabel: () => {
        const content = document.getElementById('print-area').innerHTML;
        const win = window.open('', '', 'height=400,width=400');
        win.document.write('<html><body style="font-family:sans-serif;text-align:center;">' + content + '</body></html>');
        win.document.close();
        win.print();
    },

    // --- QR CODE SCANNER (zum Suchen) ---
    startQRScanner: () => {
        AppUI.showModal('qr-scanner-modal');
        
        // Prüfen ob Lib geladen ist
        if(!window.Html5QrcodeScanner) return alert("Scanner Bibliothek nicht geladen!");

        // Scanner starten
        html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
        
        html5QrcodeScanner.render((decodedText) => {
            // Erfolg!
            console.log("Scan:", decodedText);
            Features.stopQRScanner(); // Kamera aus
            AppAPI.sendScan(decodedText); // An Server senden
        }, (error) => {
            // Fehler oder noch nichts erkannt (ignorieren)
        });
    },

    stopQRScanner: () => {
        if(html5QrcodeScanner) {
            html5QrcodeScanner.clear().catch(e => console.error(e));
            html5QrcodeScanner = null;
        }
        AppUI.closeAllModals();
    },

    // --- FOTO SCANNER (OCR) ---
    triggerCamera: () => document.getElementById('cam-input').click(),
    
    handleImageCrop: (inp) => {
        if(inp.files[0]) {
            const r = new FileReader();
            r.onload = (e) => {
                document.getElementById('image-to-crop').src = e.target.result;
                AppUI.showModal('crop-modal');
                if(window.cropper) window.cropper.destroy();
                window.cropper = new Cropper(document.getElementById('image-to-crop'), {viewMode:1});
            };
            r.readAsDataURL(inp.files[0]);
        }
        inp.value='';
    },

    performOCR: () => {
        if(!window.cropper) return;
        const btn = document.getElementById('btn-ocr'); 
        btn.innerText="...";
        
        window.cropper.getCroppedCanvas().toBlob(async(b) => {
            const fd = new FormData(); fd.append('image', b, 'scan.jpg');
            try {
                const r = await fetch('/api/scan-image', {method:'POST', body:fd});
                const d = await r.json();
                if(d.success) AppAPI.sendScan(d.model); 
                else alert("Nichts erkannt");
            } catch(e){}
            AppUI.closeAllModals(); 
            btn.innerText="Text scannen";
        }, 'image/jpeg');
    }
};

window.Features = Features;