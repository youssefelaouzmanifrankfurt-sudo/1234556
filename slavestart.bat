@echo off
setlocal
title NEONLINK WORKER (Client)
color 0B

:: --- 0. CLEANUP (WICHTIG!) ---
:: Beendet alle alten Chrome- und Node-Prozesse, damit der Port/Profil frei ist.
echo [SYSTEM] Raeume alte Prozesse auf...
taskkill /F /IM chrome.exe /T >nul 2>&1
taskkill /F /IM node.exe /T >nul 2>&1

:: --- 1. SETUP PRÜFEN ---
if not exist "node_modules" (
    echo [SYSTEM] Erster Start. Installiere Module...
    call npm install
)

:: --- 2. Z: LAUFWERK PRÜFEN ---
if not exist "Z:\" (
    color 0C
    echo ===================================================
    echo [FEHLER] Laufwerk Z: wurde nicht gefunden!
    echo ===================================================
    echo Der Client findet die Datenbank nicht, weil Z: fehlt.
    echo Bitte verbinde das Netzlaufwerk Z: mit \\MASTER-PC\weeeeeee_data
    echo.
    pause
    exit
)

:: --- 3. EINSTELLUNGEN ---
echo ==========================================
echo      NEONLINK CLIENT (WORKER PC)
echo ==========================================
echo.
set /p PORT="Bitte Port eingeben (z.B. 3001, 3002): " || set PORT=3001
title NEONLINK WORKER (Port %PORT%)

echo.
echo [INFO] Datenquelle: Laufwerk Z: (Server)
echo [INFO] Browser:     Wird vom Server gesteuert
echo [INFO] Handy URL:   http://IP-ADRESSE:%PORT%
echo.

:: --- 4. SERVER STARTEN ---
:: Wir starten nur Node. Node startet dann Chrome unsichtbar.
node src/server.js

if %errorlevel% neq 0 pause