// public/js/aufgaben.js
const socket = io();

// Name speichern/laden
const nameInput = document.getElementById('user-name');
if(localStorage.getItem('username')) nameInput.value = localStorage.getItem('username');
function saveName() { localStorage.setItem('username', nameInput.value); }

// --- TAB SYSTEM ---
let currentTab = 'open';

function switchTab(tab) {
    currentTab = tab;
    
    // Buttons umschalten
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');

    // Views umschalten
    document.getElementById('view-open').style.display = tab === 'open' ? 'block' : 'none';
    document.getElementById('view-archive').style.display = tab === 'archive' ? 'block' : 'none';
}

// --- AKTIONEN ---

function addTask() {
    const text = document.getElementById('task-text').value;
    const user = nameInput.value;
    if(!text || !user) { alert("Bitte Namen und Aufgabe eingeben!"); return; }
    
    socket.emit('add-task', { text: text, creator: user });
    document.getElementById('task-text').value = ''; 
    
    // Automatisch zum offenen Tab wechseln
    if(currentTab !== 'open') switchTab('open');
}

function completeTask(id) {
    const user = nameInput.value;
    if(!user) { alert("Wer bist du? Bitte Namen links eingeben!"); nameInput.focus(); return; }
    socket.emit('complete-task', { id: id, user: user });
}

function deleteTask(id) {
    if(confirm("Aufgabe wirklich endgültig löschen?")) socket.emit('delete-task', id);
}

function deleteCompleted() {
    if(confirm("Wirklich ALLES im Archiv endgültig löschen?")) {
        socket.emit('delete-completed-tasks');
    }
}

function addUpdate(taskId) {
    const user = nameInput.value;
    if(!user) { alert("Bitte erst Namen eingeben!"); nameInput.focus(); return; }
    
    const input = document.getElementById(`update-input-${taskId}`);
    const text = input.value.trim();
    
    if(text) {
        socket.emit('add-task-update', { id: taskId, text: text, user: user });
        input.value = '';
    }
}

// --- RENDER LOGIK (Hautpfunktion) ---
socket.on('update-tasks', (tasks) => {
    const gridOpen = document.getElementById('grid-open');
    const gridArchive = document.getElementById('grid-archive');
    
    // Zähler Elemente
    const countOpenEl = document.getElementById('count-open');
    const countArchiveEl = document.getElementById('count-archive');

    // Container leeren
    gridOpen.innerHTML = '';
    gridArchive.innerHTML = '';
    
    // Sortieren: Neueste zuerst
    tasks.sort((a, b) => b.id - a.id);

    let countOpen = 0;
    let countArchive = 0;

    tasks.forEach(task => {
        const isDone = task.status === 'erledigt';
        
        // Karte erstellen
        const card = document.createElement('div');
        card.className = `task-card ${isDone ? 'done' : ''}`;
        
        // --- INHALT ZUSAMMENBAUEN ---
        
        // 1. Chat Link
        let chatLinkHtml = '';
        if(task.linkedChatId) {
            const safeId = encodeURIComponent(task.linkedChatId);
            chatLinkHtml = `
            <div style="margin-top:10px;">
                <span style="font-size:0.8rem; color:#666;">Aus Chat: ${task.linkedChatName || ''}</span><br>
                <a href="/chat?chatId=${safeId}" class="chat-link">💬 Zum Chat</a>
            </div>`;
        }

        // 2. Notizen (Updates)
        let updatesHtml = '';
        if (task.updates && task.updates.length > 0) {
            updatesHtml = '<div class="task-updates">';
            task.updates.forEach(u => {
                updatesHtml += `
                    <div class="task-update-item">
                        <span style="color:#10b981; font-weight:bold;">${u.user}:</span> ${u.text}
                    </div>`;
            });
            updatesHtml += '</div>';
        }

        // 3. Input für neue Notiz (Nur bei offenen)
        let updateInputHtml = '';
        if (!isDone) {
            updateInputHtml = `
                <div class="update-form">
                    <input type="text" id="update-input-${task.id}" class="update-input" placeholder="Notiz..." onkeypress="if(event.key==='Enter') addUpdate(${task.id})">
                    <button class="btn-update" onclick="addUpdate(${task.id})">➕</button>
                </div>
            `;
        }

        // 4. Footer (Aktionen)
        let footerContent = '';
        if (isDone) {
            footerContent = `
                <div class="done-info">
                    ✅ Erledigt von <b style="color:#eee;">${task.doneBy || '?'}</b><br>
                    <span style="font-size:0.7rem; opacity:0.7;">${task.doneAt || ''}</span>
                </div>
                <button class="btn-delete" onclick="deleteTask(${task.id})" title="Endgültig löschen">🗑</button>
            `;
        } else {
            footerContent = `
                <div class="status-badge status-open">Offen</div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <button class="btn-delete" onclick="deleteTask(${task.id})" title="Löschen">🗑</button>
                    <button class="btn-complete" onclick="completeTask(${task.id})">Fertig ✅</button>
                </div>
            `;
        }

        // HTML setzen
        card.innerHTML = `
            <div class="task-header">
                <span>Von: <b>${task.creator}</b></span>
                <span>${task.createdAt}</span>
            </div>
            <div class="task-body">
                <div style="font-size:1.1rem; margin-bottom:10px; white-space: pre-wrap;">${task.text}</div>
                ${chatLinkHtml}
                ${updatesHtml}
                ${updateInputHtml}
            </div>
            <div class="task-footer">
                ${footerContent}
            </div>
        `;

        // Einsortieren
        if (isDone) {
            gridArchive.appendChild(card);
            countArchive++;
        } else {
            gridOpen.appendChild(card);
            countOpen++;
        }
    });
    
    // Zähler aktualisieren
    if(countOpenEl) countOpenEl.innerText = countOpen;
    if(countArchiveEl) countArchiveEl.innerText = countArchive;
    
    // Leere Listen Hinweis
    if(countOpen === 0) gridOpen.innerHTML = '<div style="text-align:center; padding:40px; color:#444;">Keine offenen Aufgaben 🎉</div>';
    if(countArchive === 0) gridArchive.innerHTML = '<div style="text-align:center; padding:40px; color:#444;">Archiv leer.</div>';
});