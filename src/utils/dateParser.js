// src/utils/dateParser.js

/**
 * Parst Texte wie "bis 15.03.", "noch 7 Tage" oder "Gebucht".
 */
function parseFeatureDate(text) {
    const now = new Date();
    let targetDate = new Date();
    
    // Alles klein schreiben und säubern
    text = text.toLowerCase().replace(/[\n\r]+/g, ' ').trim();

    try {
        // FALL 1: "noch X Tage" (Das hast du in deinem HTML)
        // Sucht nach Zahlen, die vor dem Wort "tage" oder "tag" stehen
        const daysMatch = text.match(/noch\s*(\d+)\s*tag/);
        if (daysMatch) {
            const daysLeft = parseInt(daysMatch[1], 10);
            targetDate.setDate(now.getDate() + daysLeft);
            return targetDate;
        }

        // FALL 2: "Gebucht" oder "Aktiv" (Ohne konkretes Datum)
        // Das geben wir als "null" zurück, aber das System erkennt es später als "Aktiv"
        if (text.includes('gebucht') || text.includes('aktiv') || text.includes('läuft')) {
            // Wir setzen ein Datum weit in der Zukunft (999 Tage), damit es grün angezeigt wird
            targetDate.setDate(now.getDate() + 999);
            return targetDate;
        }

        // FALL 3: "morgen" / "heute"
        if (text.includes('morgen')) {
            targetDate.setDate(now.getDate() + 1);
            return targetDate;
        } else if (text.includes('heute')) {
            return targetDate; 
        }

        // FALL 4: Datum "bis 12.04." oder "12.04.2025"
        const dateMatch = text.match(/(\d{1,2})\.(\d{1,2})/);
        if (dateMatch) {
            const day = parseInt(dateMatch[1], 10);
            const month = parseInt(dateMatch[2], 10) - 1; 
            
            targetDate.setDate(day);
            targetDate.setMonth(month);
            
            // Wenn Datum im Text ein Jahr hat
            const yearMatch = text.match(/\.(\d{4})/);
            if(yearMatch) {
                targetDate.setFullYear(parseInt(yearMatch[1], 10));
            } else {
                // Jahreswechsel Logik (wenn heute Dez und Datum Jan ist -> nächstes Jahr)
                if (targetDate < now && (now.getMonth() - month) > 6) {
                    targetDate.setFullYear(now.getFullYear() + 1);
                } else {
                    targetDate.setFullYear(now.getFullYear());
                }
            }
            return targetDate;
        }
        
        return null;
    } catch (e) {
        return null;
    }
}

/**
 * Berechnet die Tage bis zum Datum (negativ = abgelaufen)
 */
function getDaysLeft(targetDate) {
    // Wenn Datum > 700 Tage in der Zukunft liegt, ist es ein "Dauer-Status" (Gebucht)
    // Wir geben -999 zurück, das Frontend erkennt das als "Aktiv" ohne Ablaufdatum.
    if (!targetDate) return -999;
    
    const today = new Date();
    
    // Wenn das Datum extrem weit in der Zukunft liegt (unser "Gebucht" Hack oben)
    const diffReal = targetDate - today;
    const daysReal = Math.ceil(diffReal / (1000 * 60 * 60 * 24));
    if (daysReal > 500) return -999; 

    today.setHours(0,0,0,0);
    targetDate.setHours(0,0,0,0);

    const diffTime = targetDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

module.exports = { parseFeatureDate, getDaysLeft };