// src/scrapers/chat/conversationList.js
const { getChatPage } = require('./connection');

async function getConversations(targetCount = 20) {
    const p = await getChatPage();
    if (!p) return [];
    
    try {
        // FIX 1: Wir warten, bis der DOM (die Struktur der Seite) geladen ist
        if (!p.url().includes('m-nachrichten')) {
            await p.goto('https://www.kleinanzeigen.de/m-nachrichten.html', { waitUntil: 'domcontentloaded' });
        } else {
            // Auch wenn wir schon da sind, kurz warten um sicher zu sein, dass nichts lädt
            // await p.waitForSelector('body', { timeout: 1000 }).catch(() => {}); 
        }

        const chats = await p.evaluate(async (minTarget) => {
            const wait = (ms) => new Promise(res => setTimeout(res, ms));
            
            // --- DIE UNFEHLBARE SCROLL-FUNKTION ---
            const scrollDown = async () => {
                // Sicherheitsabfrage für alte Browser / Ladezustände
                const dateList = document.querySelector('.ConversationByDateList');
                
                // Liste aller potenziellen Scroll-Container
                const candidates = [
                    document.querySelector('.infinite-scroll-component'),
                    document.getElementById('conversation-list'),
                    dateList ? dateList.parentElement : null,
                    document.documentElement,
                    document.body
                ];

                let scrolled = false;
                for (let el of candidates) {
                    // FIX 2: Prüfen ob Element existiert UND scrollHeight hat
                    if (el && el.scrollHeight && el.scrollHeight > el.clientHeight) {
                        // Versuchen zu scrollen
                        const oldTop = el.scrollTop;
                        el.scrollTop = el.scrollHeight;
                        if (el.scrollTop > oldTop) {
                            scrolled = true; // Es hat sich bewegt!
                            await wait(100);
                            el.scrollTop -= 50;
                            await wait(100);
                            el.scrollTop = el.scrollHeight;
                        }
                    }
                }
                
                // FIX 3: Fallback nur ausführen, wenn body existiert
                if (!scrolled && document.body) {
                    window.scrollTo(0, document.body.scrollHeight);
                }
            };

            let items = document.querySelectorAll('article.ConversationListItem');
            let attempts = 0;

            while (items.length < minTarget && attempts < 8) {
                await scrollDown();
                await wait(1500); // Warten auf Nachladen
                
                const newItems = document.querySelectorAll('article.ConversationListItem');
                if (newItems.length > items.length) {
                    attempts = 0; 
                } else {
                    attempts++; 
                }
                items = newItems;
            }

            // --- DATEN PARSEN ---
            const data = [];
            items.forEach((item) => {
                try {
                    const nameEl = item.querySelector('header .truncate');
                    const timeEl = item.querySelector('header .text-right');
                    const titleEl = item.querySelector('h3.text-bodyRegularStrong');
                    const imgEl = item.querySelector('.AdImage img');
                    const previewEl = item.querySelector('section div.text-onSurfaceSubdued');
                    const urgentBadge = item.querySelector('.text-urgent');
                    const isNew = (urgentBadge && urgentBadge.innerText.includes('NEU'));

                    let previewText = previewEl ? previewEl.innerText.trim() : '';
                    if (!previewText) { 
                        const btn = item.querySelector('button span'); 
                        if(btn) previewText = `[${btn.innerText}]`; 
                    }

                    let title = titleEl ? titleEl.innerText.trim() : 'Kein Titel';
                    title = title.replace(/^(Reserviert|Verkauft|Gelöscht)\s?[•|-]?\s?/, '');
                    const name = nameEl ? nameEl.innerText.trim() : 'Unbekannt';

                    data.push({ 
                        id: name, 
                        partnerName: name, 
                        adTitle: title, 
                        lastMessage: previewText, 
                        time: timeEl ? timeEl.innerText.trim() : '', 
                        img: imgEl ? imgEl.src : '', 
                        hasNewMessage: isNew 
                    });
                } catch (err) { }
            });
            return data;
        }, targetCount);

        return chats;
    } catch (e) {
        // Fehler fangen, damit der Server nicht crasht, sondern nur loggt
        // Wir werfen ihn weiter, damit das Log "[ERROR] Chat-Liste Fehler" Sinn ergibt,
        // oder geben [] zurück, wenn wir "leise" scheitern wollen.
        // Hier: Fehler werfen für das Log
        throw e;
    }
}

module.exports = { getConversations };