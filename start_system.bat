@echo off
title [JEFF] System Launcher
color 0A

echo ===================================================
echo      JEFF'S CLEAN INVENTORY SYSTEM v2.0
echo ===================================================
echo.

:: 1. Check: Existieren die Data-Ordner?
if not exist "data" mkdir data
if not exist "data_storage" mkdir data_storage
if not exist "logs" mkdir logs

:: 2. Check: Ist Node modules da?
if not exist "node_modules" (
    color 0C
    echo [ACHTUNG] node_modules fehlt! Starte Installation...
    call npm install
    color 0A
)

:: 3. Bereinigung (Optional: Temp files löschen)
if exist "data\*.tmp" del "data\*.tmp"
if exist "data_storage\*.tmp" del "data_storage\*.tmp"

echo.
echo [SYSTEM] Backend Services starten...
echo [INFO]  Logs findest du im /logs Ordner.
echo.

:: Starte Server in neuem Fenster, damit dieses Fenster offen bleibt
start "LAN Server" cmd /k "npm start"

echo [SUCCESS] Server ist gestartet!
echo.
echo Oeffne Chrome und gehe zu: http://localhost:3000
echo.
pause