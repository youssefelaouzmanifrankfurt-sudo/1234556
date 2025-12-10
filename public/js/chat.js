// public/js/chat.js
const socket = io();

let currentChatId = null;
let currentChatName = null;
let chatTemplates = {};
let loadedChatCount = 20;

const msgArea = document.getElementById('msg-area');
const searchInput = document.getElementById('search-input');

// SETUP
socket.emit('get-settings');
socket.on('update-settings', (s) => { if(s && s.chat) chatTemplates = s.chat; });

// TEMPLATES
function insertTemplate(type) {
    if (chatTemplates[type]) {
        const input = document.getElementById('msg-input');
        input.value = chatTemplates[type];
        input.focus();
    }
}

// CHAT LADEN
function loadChat(chat) {
    if (currentChatId === chat.id) return;

    currentChatId = chat.id;
    currentChatName = chat.partnerName;
    
    document.getElementById('chat-header').style.opacity = '1';
    document.getElementById('input-area').style.display = 'flex';
    document.getElementById('active-name').innerText = chat.partnerName;
    document.getElementById('active-status').innerText = chat.adTitle || '';
    msgArea.innerHTML = '<div style="text-align:center; padding:50px; color:#666;">Lade Nachrichten...</div>';
    
    socket.emit('request-messages', { chatId: chat.id });

    document.querySelectorAll('.conv-item').forEach(el => el.classList.remove('active'));
    const items = document.querySelectorAll('.conv-item');
    items.forEach(item => {
        if(item.dataset.id === chat.id) item.classList.add('active');
    });
}

// NACHRICHTEN UPDATE
socket.on('update-messages', (data) => {
    if (currentChatId !== data.chatId) return;
    msgArea.innerHTML = '';
    
    const histBtn = document.createElement('button');
    histBtn.className = 'load-history-btn';
    histBtn.innerText = '⬆ Ältere Nachrichten';
    histBtn.onclick = () => socket.emit('load-more-history', { chatId: currentChatId });
    msgArea.appendChild(histBtn);

    data.messages.forEach(msg => {
        renderMessage(msg);
    });

    if (!data.isHistoryLoad) msgArea.scrollTop = msgArea.scrollHeight;
});

function renderMessage(msg) {
    const row = document.createElement('div');
    const isMe = msg.sender === 'Me';
    row.className = `msg-row ${isMe ? 'me' : 'partner'}`;

    let content = '';
    if (msg.images && msg.images.length > 0) {
        msg.images.forEach(s => content += `<a href="${s}" target="_blank"><img src="${s}" class="msg-img"></a>`);
    }
    if (msg.text) content += `<div>${msg.text.replace(/\n/g, '<br>')}</div>`;

    // FIX: Zeit oder Status anzeigen
    const isSending = msg.time === 'Wird gesendet...';
    const timeStyle = isSending ? 'color:#10b981; font-style:italic; font-weight:bold; font-size:0.7rem;' : 'font-size:0.7rem; opacity:0.5;';
    
    content += `<div class="msg-meta" style="${timeStyle}">${msg.time || ''}</div>`;

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.innerHTML = content;

    row.appendChild(bubble);
    msgArea.appendChild(row);
}

function sendMessage() {
    const input = document.getElementById('msg-input');
    const text = input.value.trim();
    if(text && currentChatId) {
        // OPTIMISTIC UI: Sofort anzeigen mit Status "Wird gesendet..."
        renderMessage({
            text: text,
            sender: 'Me',
            time: 'Wird gesendet...',
            images: []
        });
        msgArea.scrollTop = msgArea.scrollHeight;

        socket.emit('send-message', { chatId: currentChatId, text });
        input.value = '';
        input.focus();
    }
}
document.getElementById('msg-input').addEventListener('keypress', (e) => { if(e.key==='Enter') sendMessage(); });

// LISTE & DEEP LINK LOGIK
socket.on('update-conversations', (data) => {
    const chats = Array.isArray(data) ? data : data.chats;
    const list = document.getElementById('conv-list');
    list.innerHTML = '';

    chats.forEach(chat => {
        const item = document.createElement('div');
        item.className = `conv-item ${currentChatId === chat.id ? 'active' : ''} ${chat.hasNewMessage ? 'new' : ''}`;
        item.dataset.id = chat.id;
        item.onclick = () => loadChat(chat);
        item.innerHTML = `
            <div class="conv-img-wrap"><img src="${chat.img || 'https://via.placeholder.com/50'}" class="conv-img"></div>
            <div class="conv-content">
                <div class="conv-header"><span class="conv-name">${chat.partnerName}</span><span class="conv-time">${chat.time}</span></div>
                <div class="conv-msg">${chat.lastMessage || ''}</div>
            </div>`;
        list.appendChild(item);
    });

    const params = new URLSearchParams(window.location.search);
    const targetId = params.get('chatId');

    if (targetId && !currentChatId) {
        let targetChat = chats.find(c => c.id === targetId || c.partnerName === targetId);
        if (!targetChat) {
            console.log("Chat nicht in Liste, erzwinge Laden:", targetId);
            targetChat = { id: targetId, partnerName: targetId, adTitle: 'Lade Chat...', img: '' };
        }
        loadChat(targetChat);
        window.history.replaceState({}, document.title, "/chat");
    }
});

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        document.querySelectorAll('.conv-item').forEach(item => {
            item.style.display = item.innerText.toLowerCase().includes(val) ? 'flex' : 'none';
        });
    });
}
function refreshAll() { if(searchInput) searchInput.value=''; socket.emit('refresh-chats'); }
function loadMoreConversations() { socket.emit('load-more-chats', { currentCount: loadedChatCount }); loadedChatCount += 20; }

function openTaskModal() { document.getElementById('task-modal').classList.add('open'); }
function closeTaskModal() { document.getElementById('task-modal').classList.remove('open'); }
function saveTaskFromChat() {
    const text = document.getElementById('modal-task-text').value;
    if(text) {
        socket.emit('add-task', { text, creator: 'Chat', linkedChatId: currentChatId, linkedChatName: currentChatName });
        closeTaskModal();
    }
}