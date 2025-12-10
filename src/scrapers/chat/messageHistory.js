const { getChatPage } = require('./connection'); // Import ändern
const logger = require('../../utils/logger');

async function loadChatMessages(partnerName, loadMore = false) {
    const p = await getChatPage(); // Funktion ändern
    if (!p) return { chatId: partnerName, messages: [] };
    
    // ... (Restlicher Code exakt wie vorher) ...
    // Kopiere hier einfach den Inhalt deiner alten messageHistory.js rein, 
    // aber behalte oben den neuen Import und den Aufruf 'getChatPage()'
    
    // Hier der Kern-Code zur Sicherheit:
    const result = await p.evaluate(async (targetName, forceLoadMore) => {
        const items = document.querySelectorAll('article.ConversationListItem');
        let foundItem = null;
        for (const item of items) {
            const nameEl = item.querySelector('header .truncate');
            const nameText = nameEl ? nameEl.innerText.trim() : '';
            if (nameText === targetName) { foundItem = item; break; }
        }
        if (!foundItem) return null;
        if (!foundItem.classList.contains('is-highlighted')) { foundItem.click(); await new Promise(r => setTimeout(r, 800)); }
        const msgList = document.querySelector('ul.MessageList');
        if (!msgList) return []; 
        const scrollContainer = msgList.parentElement;
        if (forceLoadMore) { scrollContainer.scrollTop = 0; await new Promise(r => setTimeout(r, 1500)); } 
        else { if(scrollContainer.scrollTop === 0) scrollContainer.scrollTop = 10; }
        const listItems = document.querySelectorAll('ul.MessageList li');
        const msgs = [];
        listItems.forEach(li => {
            const textEl = li.querySelector('.Message--Text');
            const imgEls = li.querySelectorAll('img[data-testid="attachment-image"]');
            const images = Array.from(imgEls).map(img => img.src);
            if (!textEl && images.length === 0) return;
            const isMe = li.querySelector('.MessageListItem-outbound') !== null;
            const timeInfo = li.querySelector('.Message-meta') || li.querySelector('time');
            msgs.push({ text: textEl ? textEl.innerText.trim() : '', images: images, sender: isMe ? 'Me' : 'Partner', time: timeInfo ? timeInfo.innerText : '' });
        });
        return msgs;
    }, partnerName, loadMore);

    if (!result) return { chatId: partnerName, messages: [] };
    return { chatId: partnerName, messages: result };
}
module.exports = { loadChatMessages };