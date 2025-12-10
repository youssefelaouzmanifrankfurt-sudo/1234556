// src/scrapers/db/navigation.js
const logger = require('../../utils/logger');
const config = require('./config');

async function forceVisibility(page) {
    try {
        await page.evaluate(() => {
            Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
            Object.defineProperty(document, 'hidden', { value: false, writable: true });
            window.dispatchEvent(new Event('visibilitychange'));
        });
    } catch(e) {}
}

async function initPage(page) {
    try {
        if (!page.url().includes('m-meine-anzeigen')) {
            await page.goto(config.URL_MY_ADS, { waitUntil: 'domcontentloaded' });
        } else {
            await page.reload({ waitUntil: 'domcontentloaded' });
        }
        await forceVisibility(page);
        await new Promise(r => setTimeout(r, 1500));

        // SAFETY 2: Login Check
        const content = await page.content();
        if (content.includes('Einloggen') || content.includes('Registrieren')) {
            logger.log('error', '❌ Scan abgebrochen: Nicht eingeloggt!');
            return false;
        }
        return true;
    } catch (e) {
        logger.log('error', 'Navigations-Fehler: ' + e.message);
        return false;
    }
}

async function goToNextPage(page) {
    try {
        const nextBtn = await page.$('button[aria-label="Nächste"]');
        if (nextBtn && !(await page.evaluate(el => el.disabled, nextBtn))) {
            await page.evaluate(el => el.scrollIntoView(), nextBtn);
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(()=>{}),
                nextBtn.click()
            ]);
            return true;
        }
    } catch(e) {
        // Pagination-Fehler sind am Ende normal, daher nur Warnung
        logger.log('warn', 'Pagination Info: ' + e.message);
    }
    return false;
}

module.exports = { forceVisibility, initPage, goToNextPage };