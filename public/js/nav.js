// public/js/nav.js

(function() {
    // 1. Active State für Links
    const path = window.location.pathname;
    document.querySelectorAll('.g-link').forEach(link => {
        const href = link.getAttribute('href');
        if (path === href || (href !== '/' && path.startsWith(href))) {
            link.classList.add('active');
        }
    });

    // 2. Robustere Socket Verbindung
    // Wir nutzen window.location.host, damit es egal ist, ob localhost oder IP (192.168...)
    let navSocket = window.socket;
    
    if (!navSocket) {
        navSocket = io(window.location.host, {
            reconnection: true,           // Automatisch neu verbinden
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            transports: ['websocket']     // Schneller als Polling
        });
        window.socket = navSocket;
    }

    // SOUND
    const notifSound = new Audio("/sounds/notification.mp3");
    notifSound.volume = 0.5; 

    let lastCounts = { chat: 0, tasks: 0 };

    // EVENTS
    navSocket.on('connect', () => {
        console.log("🟢 Verbunden mit Server!");
    });

    navSocket.on('disconnect', () => {
        console.log("🔴 Verbindung verloren... suche...");
    });

    navSocket.on('update-conversations', (data) => {
        const chats = Array.isArray(data) ? data : data.chats;
        let newMsg = 0;
        if (chats) {
            chats.forEach(c => { if(c.hasNewMessage) newMsg++; });
        }
        updateBadge('chat', newMsg);
    });

    navSocket.on('update-tasks', (tasks) => {
        if (tasks) {
            const open = tasks.filter(t => t.status === 'offen').length;
            updateBadge('tasks', open);
        }
    });

    function updateBadge(type, count) {
        const badge = document.getElementById(`badge-${type}`);
        if(badge) {
            if(count > 0) {
                badge.innerText = count;
                badge.classList.add('visible');
                
                if(count > lastCounts[type]) {
                    notifSound.currentTime = 0;
                    notifSound.play().catch(() => {}); // Fehler ignorieren
                }
            } else {
                badge.classList.remove('visible');
            }
            lastCounts[type] = count;
        }
    }
    
    // Sound-Engine Unlock
    document.body.addEventListener('click', () => {
        notifSound.play().then(() => {
            notifSound.pause();
            notifSound.currentTime = 0;
        }).catch(() => {});
    }, { once: true });

})();