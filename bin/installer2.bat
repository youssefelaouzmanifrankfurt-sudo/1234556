@echo off
title NeonLink Installer
color 0B

:: --- PFAD FINDEN ---
cd /d "%~dp0"
:: Falls wir im 'bin' Ordner sind, eins hoch
if exist "..\package.json" cd ..

echo ==========================================
echo      NEONLINK INSTALLATION
echo ==========================================
echo.

:: --- CHECK NODE.JS ---
node -v >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [FEHLER] Node.js ist nicht installiert!
    echo Bitte installiere es von: https://nodejs.org/
    echo.
    pause
    exit
)

:: --- INSTALLATION ---
echo [INFO] Installiere Pakete...
call npm install
echo.

:: --- PRÜFUNG ---
if exist "node_modules" (
    color 0A
    echo [ERFOLG] Installation fertig!
    echo Du kannst jetzt 'start.bat' ausfuehren.
) else (
    color 0C
    echo [FEHLER] Irgendwas ist schief gelaufen.
)

echo.
pause