// public/js/lager/printer.js
window.openPrintModal = async (id) => {
    const item = window.lastStockItems ? window.lastStockItems.find(i => i.id === id) : null;
    if(!item) return;
    
    const codeContent = item.sku || item.id; 
    try {
        const res = await fetch(`/api/qr/${encodeURIComponent(codeContent)}`);
        const data = await res.json();
        if(data.url) {
            document.getElementById('print-qr').src = data.url;
            document.getElementById('print-title').innerText = item.title.substring(0, 30);
            document.getElementById('print-sku').innerText = item.sku || "Keine SKU";
            document.getElementById('print-modal').classList.add('open');
        }
    } catch(e) { alert("Fehler beim QR Generieren"); }
};

window.printLabel = () => {
    const content = document.getElementById('print-area').innerHTML;
    const win = window.open('', '', 'height=400,width=400');
    win.document.write('<html><head><title>Label</title><style>body{font-family:sans-serif;text-align:center;}img{width:100%;max-width:200px;}</style></head><body>' + content + '</body></html>');
    win.document.close();
    win.print();
};