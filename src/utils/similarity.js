// src/utils/similarity.js

// Levenshtein Distanz (Wie viele Zeichen müssen geändert werden?)
function levenshtein(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // Ersetzung
                    Math.min(
                        matrix[i][j - 1] + 1, // Einfügung
                        matrix[i - 1][j] + 1  // Löschung
                    )
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

/**
 * Kombinierte Ähnlichkeit: Wort-Treffer + Schreibweise
 * 0.0 = Komplett anders
 * 1.0 = Identisch
 */
function compareStrings(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1.0;
    if (s1.includes(s2) || s2.includes(s1)) return 0.9; // Starker Teil-Treffer

    // 1. Wort-Check (Jaccard)
    const words1 = s1.split(/\s+/).filter(w => w.length > 2);
    const words2 = s2.split(/\s+/).filter(w => w.length > 2);
    
    let matches = 0;
    words1.forEach(w1 => {
        if (words2.some(w2 => w2.includes(w1) || w1.includes(w2) || levenshtein(w1, w2) <= 1)) {
            matches++;
        }
    });
    
    const wordScore = (matches * 2) / (words1.length + words2.length);

    // 2. Levenshtein auf den ganzen String (für Tippfehler)
    const dist = levenshtein(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);
    const charScore = 1 - (dist / maxLength);

    // Mix: Worte sind wichtiger als exakte Zeichen
    return (wordScore * 0.7) + (charScore * 0.3);
}

function findBestMatch(targetTitle, list) {
    let bestScore = 0;
    let bestItem = null;

    list.forEach(item => {
        const score = compareStrings(targetTitle, item.title);
        if (score > bestScore) {
            bestScore = score;
            bestItem = item;
        }
    });

    return { item: bestItem, score: bestScore };
}

module.exports = { compareStrings, findBestMatch };