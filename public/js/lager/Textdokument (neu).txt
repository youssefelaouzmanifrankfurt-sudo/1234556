// public/js/lager/printer.js

// Funktion: Druck-Modal öffnen und QR-Code laden
window.openPrintModal = async (id) => {
    // Zugriff auf die globale Artikelliste (wird in main.js gepflegt)
    const item = window.lastStockItems.find(i => i.id === id);
    if (!item) return;

    // Wir nutzen die SKU oder ID für den QR Code
    const codeContent = item.sku || item.id; 
    
    try {
        const res = await fetch(`/api/qr/${encodeURIComponent(codeContent)}`);
        const data = await res.json();
        
        if (data.url) {
            document.getElementById('print-qr').src = data.url;
            document.getElementById('print-title').innerText = item.title.substring(0, 30);
            document.getElementById('print-sku').innerText = item.sku || "Keine SKU";
            
            document.getElementById('print-modal').classList.add('open');
        }
    } catch (e) {
        alert("Fehler beim QR-Code Generieren");
    }
};

// Funktion: Echtes Druck-Fenster öffnen
window.printLabel = () => {
    const content = document.getElementById('print-area').innerHTML;
    const win = window.open('', '', 'height=400,width=400');
    win.document.write('<html><head><title>Label</title>');
    win.document.write('<style>body { font-family: sans-serif; text-align: center; } img { width: 100%; max-width: 200px; }</style>');
    win.document.write('</head><body>');
    win.document.write(content);
    win.document.write('</body></html>');
    win.document.close();
    win.print();
};