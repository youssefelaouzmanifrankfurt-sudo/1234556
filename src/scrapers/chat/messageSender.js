// src/scrapers/chat/messageSender.js
const { getChatPage } = require('./connection');
const logger = require('../../utils/logger');

/**
 * Sendet eine Nachricht an einen spezifischen Nutzer.
 * Mit Sicherheits-Check: Klickt den Chat erst an, bevor getippt wird.
 */
async function sendMessage(targetName, text) {
    // getChatPage sorgt für das "Aufwachen" (forceVisibility)
    const page = await getChatPage();
    if (!page) return false;

    try {
        // --- 1. SICHERHEITS-CHECK: Sind wir im richtigen Chat? ---
        // Wir suchen in der linken Liste nach dem Namen und klicken ihn sicherheitshalber an.
        // Das stellt sicher, dass der Fokus zu 100% richtig ist und Chrome aktiv wird.
        
        const chatFound = await page.evaluate(async (nameToFind) => {
            const items = document.querySelectorAll('article.ConversationListItem');
            let targetItem = null;

            for (const item of items) {
                const nameEl = item.querySelector('header .truncate');
                if (nameEl && nameEl.innerText.trim() === nameToFind) {
                    targetItem = item;
                    break;
                }
            }

            if (targetItem) {
                // Wir klicken IMMER drauf, um Fokus zu erzwingen
                targetItem.click();
                return true;
            }
            return false;
        }, targetName);

        if (!chatFound) {
            logger.log('error', `Senden abgebrochen: Chat mit '${targetName}' nicht gefunden.`);
            return false;
        }

        // Kurz warten, damit der Chat lädt
        await new Promise(r => setTimeout(r, 800));

        // --- 2. TEXT EINGEBEN ---
        // Sicherstellen, dass das Textfeld da ist
        await page.waitForSelector('textarea#nachricht', { visible: true, timeout: 5000 });
        
        // Textfeld leeren (falls alter Entwurf) und neuen tippen
        await page.click('textarea#nachricht', { clickCount: 3 }); 
        await page.type('textarea#nachricht', text);
        
        await new Promise(r => setTimeout(r, 300));

        // --- 3. SENDEN KLICKEN ---
        const sent = await page.evaluate(() => {
            // Verschiedene Selektoren für den Senden-Button probieren (Desktop vs Mobile Ansicht)
            const btn = document.querySelector('button[aria-label="Senden"]') || 
                        document.querySelector('.Reply--Actions-Send button') ||
                        document.querySelector('#reply-form-submit'); 
            
            if (btn && !btn.disabled) {
                btn.click();
                return true;
            }
            return false;
        });

        if (!sent) {
            logger.log('error', 'Konnte Senden-Button nicht klicken (evtl. deaktiviert?).');
            return false;
        }

        return true;

    } catch (e) {
        logger.log('error', `Sende-Fehler bei '${targetName}': ${e.message}`);
        return false;
    }
}

module.exports = { sendMessage };