// src/scrapers/chat/connection.js
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const os = require('os');
const logger = require('../../utils/logger');

// Tarnkappe aktivieren!
puppeteer.use(StealthPlugin());

let browser = null;
let launchPromise = null; 
let chatPage = null;
let dbPage = null;
let isHeadless = true; // STANDARD: UNSICHTBAR

const USER_DATA_DIR = 'C:\\weeeeeee_data\\chrome_profile'; 

function getSystemChromePath() {
    const commonPaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe')
    ];
    for (const p of commonPaths) {
        if (fs.existsSync(p)) return p;
    }
    return null;
}

async function forceVisibility(page) {
    try {
        await page.evaluate(() => {
            Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
            Object.defineProperty(document, 'hidden', { value: false, writable: true });
            window.dispatchEvent(new Event('visibilitychange'));
        });
    } catch(e) {}
}

async function _launchBrowserInternal() {
    console.log(`[Browser] Starte Chrome... (Modus: ${isHeadless ? '👻 Geister-Modus' : '🖥️ Experten-Modus'})`);
    
    if (!fs.existsSync(USER_DATA_DIR)) {
        try { fs.mkdirSync(USER_DATA_DIR, { recursive: true }); } catch(e) {}
    }

    const baseArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--window-position=0,0',
        '--ignore-certificate-errors',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--window-size=1280,800',
        '--disable-blink-features=AutomationControlled'
    ];

    const launchOptions = {
        headless: isHeadless ? "new" : false,
        userDataDir: USER_DATA_DIR,
        defaultViewport: null,
        ignoreDefaultArgs: ['--enable-automation'],
        args: baseArgs
    };

    let newBrowser = null;
    try {
        newBrowser = await puppeteer.launch(launchOptions);
    } catch (error) {
        console.warn("[Browser] Standard-Start fehlgeschlagen. Versuche System-Chrome...", error.message);
        const systemChrome = getSystemChromePath();
        if (systemChrome) {
            launchOptions.executablePath = systemChrome;
            newBrowser = await puppeteer.launch(launchOptions);
        } else {
            throw error;
        }
    }

    // --- AUTOMATISCHER RESET ---
    newBrowser.on('disconnected', () => {
        console.log('[Browser] Wurde geschlossen. Reset auf STEALTH-MODUS für nächsten Start.');
        browser = null;
        chatPage = null;
        dbPage = null;
        launchPromise = null;
        
        // HIER IST DIE MAGIE: 
        // Sobald das Fenster zu ist, wird der nächste Start wieder unsichtbar sein.
        isHeadless = true; 
    });

    return newBrowser;
}

async function getBrowser() {
    if (browser && browser.isConnected()) return browser;
    if (launchPromise) return await launchPromise;

    launchPromise = _launchBrowserInternal().then(b => {
        browser = b;
        launchPromise = null; 
        return b;
    }).catch(e => {
        launchPromise = null; 
        throw e;
    });

    return await launchPromise;
}

async function toggleDebugMode(shouldBeVisible) {
    console.log(`[Browser] Schalte um auf: ${shouldBeVisible ? 'SICHTBAR' : 'UNSICHTBAR'}`);
    isHeadless = !shouldBeVisible;
    
    if (browser) {
        // Wir schließen den aktuellen Browser, damit er mit neuen Einstellungen starten kann
        await browser.close();
        
        // Hack: browser.close() triggert das 'disconnected' Event, welches isHeadless auf true setzt.
        // Das wollen wir hier aber gerade NICHT, weil wir ja explizit umschalten.
        // Also warten wir kurz und erzwingen dann unsere Einstellung.
        await new Promise(r => setTimeout(r, 500));
        isHeadless = !shouldBeVisible; 
    }
    
    launchPromise = null; 
    await getBrowser();
    return { success: true, mode: isHeadless ? 'headless' : 'visible' };
}

function getStatus() {
    return { 
        isRunning: !!(browser && browser.isConnected()), 
        mode: isHeadless ? 'Geister-Modus (Unsichtbar)' : 'Experten-Modus (Sichtbar)' 
    };
}

async function getChatPage() {
    const b = await getBrowser();
    if (!b) return null;
    try { if (chatPage && chatPage.isClosed()) chatPage = null; } catch(e) { chatPage = null; }
    if (chatPage) { await forceVisibility(chatPage); return chatPage; }
    
    const pages = await b.pages();
    chatPage = pages.find(p => p.url().includes('kleinanzeigen.de/m-nachrichten'));
    if (!chatPage) {
        chatPage = await b.newPage();
        await chatPage.goto('https://www.kleinanzeigen.de/m-nachrichten.html');
    }
    await forceVisibility(chatPage);
    return chatPage;
}

async function getDbPage() {
    const b = await getBrowser();
    if (!b) return null;
    try { if (dbPage && dbPage.isClosed()) dbPage = null; } catch(e) { dbPage = null; }
    if (dbPage) { await forceVisibility(dbPage); return dbPage; }
    
    const pages = await b.pages();
    dbPage = pages.find(p => p.url().includes('kleinanzeigen.de/m-meine-anzeigen'));
    if (!dbPage) {
        dbPage = await b.newPage();
        await dbPage.goto('https://www.kleinanzeigen.de/m-meine-anzeigen.html');
    }
    await forceVisibility(dbPage);
    return dbPage;
}

module.exports = { 
    getBrowser, getChatPage, getDbPage, 
    connectToBrowser: getChatPage, 
    toggleDebugMode, getStatus 
};