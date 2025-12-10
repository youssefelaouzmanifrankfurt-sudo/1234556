// public/js/lager/scanner.js
window.html5QrCode = null;

// --- KAMERA / FOTO SCAN ---
window.triggerCamera = () => document.getElementById('cam-input').click();

window.startCropping = (inp) => {
    if(inp.files[0]) {
        const r = new FileReader();
        r.onload = (e) => {
            document.getElementById('image-to-crop').src = e.target.result;
            document.getElementById('crop-modal').classList.add('open');
            if(window.cropper) window.cropper.destroy();
            window.cropper = new Cropper(document.getElementById('image-to-crop'), {viewMode:1});
        };
        r.readAsDataURL(inp.files[0]);
    }
    inp.value='';
};

window.performOCR = () => {
    if(!window.cropper) return;
    const btn = document.getElementById('btn-ocr'); 
    const originalText = btn.innerText;
    btn.innerText = "...";
    
    window.cropper.getCroppedCanvas().toBlob(async(b) => {
        const fd = new FormData(); 
        fd.append('image', b, 's.jpg');
        try {
            const r = await fetch('/api/scan-image', {method:'POST', body:fd});
            const d = await r.json();
            if(d.success) {
                if(window.socket) window.socket.emit('check-scan', d.model); 
            } else {
                alert("Nichts erkannt");
            }
        } catch(e){ console.error(e); }
        window.closeAllModals(); 
        btn.innerText = originalText;
    }, 'image/jpeg');
};

window.triggerManualScan = () => {
    const val = document.getElementById('manual-code-input').value;
    if(val && window.socket) { 
        window.socket.emit('check-scan', val); 
        document.getElementById('manual-code-input').value = ""; 
    }
};

// --- QR CODE SCANNER (HTML5-QRCODE) ---
window.startQRScanner = () => {
    const modal = document.getElementById('qr-scanner-modal');
    if(modal) modal.classList.add('open');
    
    if(!window.html5QrCode) {
        // ID "reader" muss in der EJS existieren
        window.html5QrCode = new Html5Qrcode("reader");
    }
    
    window.html5QrCode.start(
        { facingMode: "environment" }, 
        { fps: 10, qrbox: 250 },
        (decodedText) => {
            // Erfolg
            if(window.socket) window.socket.emit('check-scan', decodedText);
            window.stopQRScanner();
        },
        (errorMessage) => {
            // Ignorieren, passiert oft beim Scannen
        }
    ).catch(err => {
        alert("Kamera-Fehler: " + err);
        window.stopQRScanner();
    });
};

window.stopQRScanner = () => {
    if(window.html5QrCode) {
        window.html5QrCode.stop().then(() => {
            window.html5QrCode.clear();
        }).catch(err => console.log(err));
    }
    const modal = document.getElementById('qr-scanner-modal');
    if(modal) modal.classList.remove('open');
};