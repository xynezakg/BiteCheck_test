/**
 * Multi-lingual Profanity Filter Utility (Frontend)
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
export function sanitizeComment(text) {
    if (!text || typeof text !== 'string') return "";
    
    let cleanText = text;
    
    badWords.forEach(word => {
        const escapedWord = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
        cleanText = cleanText.replace(regex, '***');
    });

    return cleanText;
}
