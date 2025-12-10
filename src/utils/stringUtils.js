// src/utils/stringUtils.js

function cleanString(str) {
    if (!str) return "";
    return str.toLowerCase()
        .replace(/[^a-z0-9äöüß ]/g, '') // Sonderzeichen weg
        .replace(/\s+/g, ' ')           // Doppelte Leerzeichen weg
        .trim();
}

// Berechnet Ähnlichkeit zweier Wörter (Fuzzy)
function getSimilarity(s1, s2) {
    let longer = s1;
    let shorter = s2;
    if (s1.length < s2.length) {
        longer = s2;
        shorter = s1;
    }
    let longerLength = longer.length;
    if (longerLength === 0) {
        return 1.0;
    }
    return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

function editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
    let costs = new Array();
    for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
            if (i == 0) costs[j] = j;
            else {
                if (j > 0) {
                    let newValue = costs[j - 1];
                    if (s1.charAt(i - 1) != s2.charAt(j - 1))
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
        }
        if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

// Die Haupt-Funktion für dich
function findBestMatch(query, items) {
    let bestMatch = null;
    let bestScore = 0;
    
    const cleanQuery = cleanString(query);
    if (cleanQuery.length < 2) return { item: null, score: 0 };

    const queryWords = cleanQuery.split(' ');

    items.forEach(item => {
        const cleanTitle = cleanString(item.title);
        let currentScore = 0;

        // 1. ENTHÄLT-CHECK (Sehr stark)
        // Wenn der Scan exakt im Titel vorkommt (z.B. "Bauknecht" in "Bauknecht Waschmaschine")
        if (cleanTitle.includes(cleanQuery)) {
            currentScore = 0.95; 
        } 
        // 2. WORT-TREFFER (Gut für verdrehte Wörter)
        else {
            let hitCount = 0;
            queryWords.forEach(word => {
                if (cleanTitle.includes(word)) hitCount++;
            });
            // Score basierend auf Anzahl der gefundenen Wörter
            const wordScore = hitCount / queryWords.length;
            
            // 3. FUZZY CHECK (Für Tippfehler)
            const fuzzyScore = getSimilarity(cleanQuery, cleanTitle);

            // Wir nehmen den besseren Wert
            currentScore = Math.max(wordScore, fuzzyScore);
        }

        if (currentScore > bestScore) {
            bestScore = currentScore;
            bestMatch = item;
        }
    });

    return { item: bestMatch, score: bestScore };
}

module.exports = { findBestMatch };