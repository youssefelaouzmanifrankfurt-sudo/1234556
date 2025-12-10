@echo off
setlocal
title NEONLINK HAUPTSERVER (Master)
color 0A

:: --- 0. CLEANUP (WICHTIG!) ---
:: Beendet alle alten Chrome- und Node-Prozesse, damit der Port/Profil frei ist.
echo [SYSTEM] Raeume alte Prozesse auf...
taskkill /F /IM chrome.exe /T >nul 2>&1
taskkill /F /IM node.exe /T >nul 2>&1

:: --- 1. SETUP ---
if not exist "node_modules" call npm install

:: --- 2. INFO ---
echo ==========================================
echo      NEONLINK SERVER (MASTER PC 1)
echo ==========================================
echo [INFO] Datenbank: C:\weeeeeee_data
echo [INFO] Browser:   Wird vom Server gesteuert (Ghost-Mode)
echo [INFO] Handy Port: 3000  (http://IP-ADRESSE:3000)
echo.

:: --- 3. START ---
echo [NODE] Starte System...
set PORT=3000
node src/server.js

if %errorlevel% neq 0 pause