// ============================================================
//  SIGNAL — Morse Code Translator
//  Handles encoding/decoding of morse code sequences
// ============================================================

const MORSE_MAP = {
  '.-':   'A', '-...': 'B', '-.-.': 'C', '-..':  'D',
  '.':    'E', '..-.': 'F', '--.':  'G', '....': 'H',
  '..':   'I', '.---': 'J', '-.-':  'K', '.-..': 'L',
  '--':   'M', '-.':   'N', '---':  'O', '.--.': 'P',
  '--.-': 'Q', '.-.':  'R', '...':  'S', '-':    'T',
  '..-':  'U', '...-': 'V', '.--':  'W', '-..-': 'X',
  '-.--': 'Y', '--..': 'Z',
  '-----': '0', '.----': '1', '..---': '2', '...--': '3',
  '....-': '4', '.....': '5', '-....': '6', '--...': '7',
  '---..': '8', '----.': '9',
  '.-.-.-': '.', '--..--': ',', '..--..': '?', '.----.': "'",
  '-.-.--': '!', '-..-.':  '/', '-.--.':  '(', '-.--.-': ')',
  '.-...':  '&', '---...': ':', '-.-.-.': ';', '-...-':  '=',
  '-....-': '-', '..--.-': '_', '.-..-.': '"', '...-..-': '$',
  '.--.-.': '@', '...---...': 'SOS',
};

// Reverse map: char → morse
const CHAR_TO_MORSE = Object.fromEntries(
  Object.entries(MORSE_MAP).map(([morse, ch]) => [ch, morse])
);

/**
 * Decodes a single morse code symbol (e.g. ".-") to a character.
 * Returns '?' if unknown.
 */
function decodeMorseSymbol(symbol) {
  if (!symbol) return '';
  return MORSE_MAP[symbol] || '?';
}

/**
 * Decodes a full morse sentence where words are separated by '/'
 * and letters by spaces.
 * E.g. ".- -... / .-.." → "AB L"
 */
function decodeMorseSentence(sentence) {
  return sentence
    .trim()
    .split(' / ')
    .map(word =>
      word
        .trim()
        .split(' ')
        .map(sym => MORSE_MAP[sym] || (sym ? '?' : ''))
        .join('')
    )
    .join(' ');
}

/**
 * Encodes plain text to morse code.
 */
function encodeText(text) {
  return text
    .toUpperCase()
    .split(' ')
    .map(word =>
      word
        .split('')
        .map(ch => CHAR_TO_MORSE[ch] || '')
        .filter(Boolean)
        .join(' ')
    )
    .join(' / ');
}

export { MORSE_MAP, CHAR_TO_MORSE, decodeMorseSymbol, decodeMorseSentence, encodeText };
