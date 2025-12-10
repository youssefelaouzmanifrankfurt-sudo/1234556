// src/utils/formatter.js
/**
 * ARCHITECT NOTE: Zentrale Instanz für Daten-Hygiene.
 * Verhindert Floating-Point-Disaster und vereinheitlicht Parsing.
 */

// Konvertiert String-Preis (z.B. "1.299,99") sicher in Cents (Integer)
// Beispiel: "19,99" -> 1999
const toCents = (input) => {
    if (!input) return 0;
    if (typeof input === 'number') return Math.round(input * 100); // Fallback falls schon Number
    
    // Alles entfernen außer Zahlen und Komma (Deutsches Format Annahme)
    // Amazon/Otto nutzen oft "1.299,00" -> Punkte müssen weg, Komma ist Dezimaltrenner
    let clean = input.toString().replace(/\./g, '').replace(/,/g, '.');
    
    // Sicherheitsextraktion: Nur Zahlen und Punkt behalten
    clean = clean.replace(/[^0-9.]/g, '');
    
    const floatVal = parseFloat(clean);
    return isNaN(floatVal) ? 0 : Math.round(floatVal * 100);
};

// Konvertiert Cents zurück in formatierten String für UI
const fromCentsToEuro = (cents) => {
    if (!cents || isNaN(cents)) return "0,00";
    return (cents / 100).toFixed(2).replace('.', ',');
};

module.exports = { toCents, fromCentsToEuro };