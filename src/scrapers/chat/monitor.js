// src/scrapers/chat/monitor.js
const { getChatPage } = require('./connection');
const { getConversations } = require('./conversationList');
const logger = require('../../utils/logger');

let isMonitoring = false;
let lastStateJSON = ''; 
let errorCount = 0;

async function startChatMonitor(io) {
    if (isMonitoring) {
        console.log("Chat-Monitor läuft bereits.");
        return;
    }
    isMonitoring = true;

    logger.log('info', '👀 Chat-Monitor: Aktiviert (Selbstheilender Modus)');

    // Endlosschleife (alle 4 Sekunden)
    setInterval(async () => {
        try {
            // 1. Seite JEDES MAL prüfen/holen
            // Wenn der Browser zwischendurch neu gestartet wurde (z.B. durch Toggle),
            // holt sich diese Funktion automatisch die neue Seite.
            const page = await getChatPage();
            
            if (!page || page.isClosed()) {
                // Browser ist wohl gerade aus oder startet neu -> Warten
                return;
            }

            // 2. Chats laden (nur die obersten 5 für Speed)
            const chats = await getConversations(5);
            
            // Fehlerzähler resetten, wenn es geklappt hat
            errorCount = 0; 

            // 3. Status prüfen
            const currentStateJSON = JSON.stringify(chats);
            
            if (currentStateJSON !== lastStateJSON) {
                // Änderung erkannt!
                const hasNew = chats.some(c => c.hasNewMessage);
                
                if (hasNew) {
                    logger.log('success', '📩 NEUE NACHRICHT EMPFANGEN!');
                    io.emit('update-conversations', chats);
                } else if (lastStateJSON !== '') {
                    // Update auch bei gesendeten Nachrichten (leise)
                    io.emit('update-conversations', chats);
                }

                lastStateJSON = currentStateJSON;
            }

        } catch (e) {
            // Fehler im Loop ignorieren wir meistens, damit er weiterläuft
            errorCount++;
            if (errorCount % 20 === 0) {
                 // Nur ab und zu loggen, damit die Konsole nicht vollgespammt wird
                 // logger.log('warning', `Monitor Loop Fehler: ${e.message}`);
            }
        }
    }, 4000); 
}

module.exports = { startChatMonitor };