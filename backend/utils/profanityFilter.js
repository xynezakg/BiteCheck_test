/**
 * Multi-lingual Profanity Filter Utility
 * Supports English, Tagalog/Filipino, and common local vulgar terms.
 * Uses word boundary checks to avoid false positives (e.g. "class" will not be censored).
 */

const badWords = [
    // English Swear Words
    "fuck", "shit", "bitch", "asshole", "cunt", "bastard", "dick", "pussy", "faggot", "motherfucker", "whore", "slut",

    // Tagalog Swear Words / Vulgar terms
    "puta", "putangina", "putang ina", "tangina", "tanga", "gago", "tarantado", "kupal", "ulol", "tite", "puki", "pekpek", "kantot", "iyot", "salsal", "bayag", "bilat", "burat", "pakyaw", "hudas",

    // Local Dialect / Regional Vulgar Slang
    "pisting yawa", "yawa", "pesteng yawa", "bilatibay", "mura", "buwisit", "bwisit", "hudas"
];

/**
 * Sanitizes a text string by replacing matching bad words with asterisks (***)
 * @param {string} text - The input comment or text
 * @returns {string} - The sanitized comment
 */
function sanitizeComment(text) {
    if (!text || typeof text !== 'string') return "";
    
    let cleanText = text;
    
    badWords.forEach(word => {
        // Create regex matching whole words case-insensitively
        // Use regex representation of word boundary that works with multi-word expressions as well
        const escapedWord = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
        
        // Replace with asterisks matching the length of the word (or simply "***" for clean visual)
        cleanText = cleanText.replace(regex, '***');
    });

    return cleanText;
}

module.exports = {
    sanitizeComment,
    badWords
};
