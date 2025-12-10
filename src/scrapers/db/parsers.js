// src/scrapers/db/parsers.js

/**
 * Liest die Listen-Ansicht (Meine Anzeigen)
 */
function parseListInBrowser() {
    const items = document.querySelectorAll('li[data-testid="ad-card"]');
    const results = [];

    items.forEach(item => {
        try {
            // --- 1. BASIS DATEN ---
            const id = item.getAttribute('data-adid');
            const titleLink = item.querySelector('h3 a');
            const rawTitle = titleLink ? titleLink.innerText.trim() : 'Unbekannt';
            const url = titleLink ? titleLink.href : null;
            
            const imgEl = item.querySelector('img[data-testid="ad-image"]');
            const thumb = imgEl ? (imgEl.currentSrc || imgEl.src) : '';
            
            const priceEl = item.querySelector('.text-title3');
            const price = priceEl ? priceEl.innerText.trim() : 'VB';

            // --- 2. STATISTIKEN ---
            const fullText = item.innerText;
            let views = "0", favs = "0", inquiries = "0";
            const vm = fullText.match(/(\d+)\s*Besucher/); if(vm) views = vm[1];
            const fm = fullText.match(/(\d+)\s*mal gemerkt/); if(fm) favs = fm[1];
            const im = fullText.match(/(\d+)\s*Anfragen/); if(im) inquiries = im[1];

            // --- 3. STATUS CHECK ---
            let status = 'ACTIVE';
            
            const footerItems = Array.from(item.querySelectorAll('footer ul li'));
            let activateButtonVisible = false;
            let deactivateButtonVisible = false;

            footerItems.forEach(li => {
                const txt = li.innerText;
                if (!li.classList.contains('is-hidden')) {
                    if (txt.includes('Aktivieren') && !txt.includes('Deaktivieren')) activateButtonVisible = true;
                    if (txt.includes('Deaktivieren')) deactivateButtonVisible = true;
                }
            });

            if (deactivateButtonVisible) status = 'ACTIVE';
            else if (activateButtonVisible) status = 'PAUSED';

            if (rawTitle.includes('Gelöscht') || fullText.includes('Gelöscht') || fullText.includes('Deaktiviert')) {
                if(rawTitle.includes('Gelöscht')) status = 'DELETED';
                else if(rawTitle.includes('Deaktiviert')) status = 'PAUSED';
            }

            // --- 4. FEATURES ---
            const activeFeatures = [];
            const labels = item.querySelectorAll('label');
            labels.forEach(label => {
                const labelText = label.innerText.trim();
                let type = null;
                if (labelText.includes('Top-Anzeige')) type = 'top';
                else if (labelText.includes('Galerie') || labelText.includes('Highlight')) type = 'gallery';
                else if (labelText.includes('Hochschieben')) type = 'bump';

                if (type) {
                    let row = label.parentElement;
                    let rowText = "";
                    for(let i=0; i<5; i++) {
                        if(!row) break;
                        rowText = row.innerText.replace(/[\n\r]+/g, ' ').trim();
                        if (rowText.includes('€') || rowText.includes('Gebucht') || rowText.includes('noch')) break;
                        row = row.parentElement;
                    }
                    const isBooked = rowText.includes("Gebucht") || rowText.includes("Aktiv") || rowText.includes("läuft") || /noch\s*\d+\s*Tage?/i.test(rowText);
                    if (isBooked) activeFeatures.push({ type: type, text: rowText });
                }
            });

            if (!activeFeatures.some(f => f.type === 'bump') && fullText.includes('Hochschieben Gebucht')) {
                 activeFeatures.push({ type: 'bump', text: 'Gebucht' });
            }

            results.push({ 
                id, 
                title: rawTitle, 
                url, 
                img: thumb,
                images: [], 
                price, 
                views, 
                favorites: favs, 
                inquiries, 
                status: status, 
                active: (status === 'ACTIVE'), 
                features: activeFeatures, 
                uploadDate: null,
                description: "" 
            });
        } catch (e) { }
    });
    return results;
}

/**
 * Liest die DETAIL-Seite (Optimiert für Beschreibung)
 */
function parseDetailInBrowser() {
    const res = { 
        uploadDate: 'Unbekannt', 
        description: '', 
        images: [], 
        cleanTitle: '' 
    };

    try {
        // --- A) Datum aus Text ---
        const txt = document.body.innerText;
        const m = txt.match(/(\d{1,2}\.\d{1,2}\.\d{4})/);
        if(m) res.uploadDate = m[1];

        // --- B) Beschreibung & Bilder (DOM) ---
        // Versuch 1: Klassischer Selektor
        const descEl = document.querySelector('#viewad-description-text');
        if(descEl) res.description = descEl.innerText.trim();

        // Bilder aus Galerie
        const galleryImgs = document.querySelectorAll('.galleryimage-element img');
        galleryImgs.forEach(img => {
            const fullSrc = img.getAttribute('data-imgsrc') || img.src;
            if(fullSrc && !res.images.includes(fullSrc)) res.images.push(fullSrc);
        });

        // --- C) JSON-LD (Die Geheimwaffe für fehlende Daten) ---
        // Oft stehen Beschreibung und Bilder sauber im JSON, auch wenn das DOM zickt.
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        scripts.forEach(s => {
            try {
                const jsonText = s.innerText;
                if (!jsonText) return;
                const data = JSON.parse(jsonText);
                const entries = Array.isArray(data) ? data : [data];
                
                entries.forEach(entry => {
                    if (!entry) return;
                    
                    // 1. Beschreibung nachladen falls leer
                    if ((!res.description || res.description.length < 10) && entry.description) {
                         // HTML Entities decodieren (einfacher Trick)
                         const tempTextArea = document.createElement('textarea');
                         tempTextArea.innerHTML = entry.description;
                         res.description = tempTextArea.value;
                    }

                    // 2. Bilder nachladen
                    if (entry.image) {
                        const imgs = Array.isArray(entry.image) ? entry.image : [entry.image];
                        imgs.forEach(url => {
                            if(url && typeof url === 'string' && !res.images.includes(url)) {
                                res.images.push(url);
                            }
                        });
                    }
                });
            } catch(e){}
        });

        // --- D) Titel bereinigen ---
        const titleEl = document.querySelector('#viewad-title');
        if(titleEl) {
            const clone = titleEl.cloneNode(true);
            const badges = clone.querySelectorAll('.pvap-reserved-title, .is-hidden');
            badges.forEach(b => b.remove());
            
            let clean = clone.innerText.trim();
            clean = clean.replace(/^(Gelöscht|Deaktiviert|Reserviert)\s*[•|-]\s*/i, '');
            res.cleanTitle = clean;
        } else {
             // Fallback falls Titel-Element fehlt (z.B. Mobilansicht anders)
             const ogTitle = document.querySelector('meta[property="og:title"]');
             if(ogTitle) res.cleanTitle = ogTitle.content.replace(/^(Gelöscht|Deaktiviert|Reserviert)\s*[•|-]\s*/i, '');
        }

    } catch(mainError) {
        // Fehler silent schlucken, damit der Worker nicht abstürzt
    }
    return res;
}

module.exports = { parseListInBrowser, parseDetailInBrowser };