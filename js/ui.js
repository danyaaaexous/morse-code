// ============================================================
//  SIGNAL — UI Controller
//  Telegraph key logic, timing, sequence buffer, rendering
// ============================================================

import { startTone, stopTone, playClick } from './audio.js';
import { decodeMorseSymbol, MORSE_MAP } from './translator.js';

// ── Timing thresholds (ms) ──────────────────────────────────
const DOT_MAX_DURATION   = 250;  // tap ≤ this → dot
const SYMBOL_GAP_MS      = 600;  // silence after a symbol → commit letter
const WORD_GAP_MS        = 1400; // silence after letter  → commit space

// ── State ───────────────────────────────────────────────────
let pressStart      = 0;
let symbolTimeout   = null;
let wordTimeout     = null;
let currentSymbol   = '';  // dots/dashes being built for the current letter
let decodedText     = '';  // full translated text so far
let tapSequence     = [];  // raw stream of '.' and '-' tokens
let isKeyDown       = false;

// ── DOM references (resolved after DOMContentLoaded) ────────
let keyBtn, sequenceDisplay, translationDisplay, resetBtn, copyBtn, shareBtn;
let keyRing, keyInner, audioToggle;

// ── Audio enabled flag ──────────────────────────────────────
let audioEnabled = true;

// ────────────────────────────────────────────────────────────
//  Init
// ────────────────────────────────────────────────────────────
function init() {
  keyBtn             = document.getElementById('telegraph-key');
  keyRing            = document.getElementById('key-ring');
  keyInner           = document.getElementById('key-inner');
  sequenceDisplay    = document.getElementById('sequence-display');
  translationDisplay = document.getElementById('translation-display');
  resetBtn           = document.getElementById('btn-reset');
  copyBtn            = document.getElementById('btn-copy');
  shareBtn           = document.getElementById('btn-share');
  audioToggle        = document.getElementById('audio-toggle');

  bindKeyEvents();
  bindButtons();
  bindKeyboardInput();
  renderReference();
  bindSearch();
  updateSequenceDisplay();
  updateTranslationDisplay();
}

// ────────────────────────────────────────────────────────────
//  Key Press Handling
// ────────────────────────────────────────────────────────────
function bindKeyEvents() {
  // Mouse / Touch
  keyBtn.addEventListener('mousedown',  onKeyDown);
  keyBtn.addEventListener('mouseup',    onKeyUp);
  keyBtn.addEventListener('mouseleave', onKeyUp);
  keyBtn.addEventListener('touchstart', e => { e.preventDefault(); onKeyDown(); }, { passive: false });
  keyBtn.addEventListener('touchend',   e => { e.preventDefault(); onKeyUp();   }, { passive: false });
}

function bindKeyboardInput() {
  document.addEventListener('keydown', e => {
    if (e.code === 'Space' && !e.repeat) { e.preventDefault(); onKeyDown(); }
  });
  document.addEventListener('keyup', e => {
    if (e.code === 'Space') { e.preventDefault(); onKeyUp(); }
  });
}

function onKeyDown() {
  if (isKeyDown) return;
  isKeyDown  = true;
  pressStart = Date.now();

  // Visual feedback
  keyBtn.classList.add('active');
  keyRing.classList.add('pulse');

  // Clear pending timers
  clearTimeout(symbolTimeout);
  clearTimeout(wordTimeout);

  if (audioEnabled) startTone();
}

function onKeyUp() {
  if (!isKeyDown) return;
  isKeyDown = false;

  const duration = Date.now() - pressStart;
  const token    = duration <= DOT_MAX_DURATION ? '.' : '-';

  // Visual feedback
  keyBtn.classList.remove('active');
  keyRing.classList.remove('pulse');
  showTokenFlash(token);

  if (audioEnabled) stopTone();

  // Accumulate
  currentSymbol  += token;
  tapSequence.push(token);
  updateSequenceDisplay();

  // After SYMBOL_GAP_MS of silence → commit this letter
  symbolTimeout = setTimeout(commitLetter, SYMBOL_GAP_MS);
}

// Commit the current dot-dash symbol as a decoded character
function commitLetter() {
  if (!currentSymbol) return;
  const ch = decodeMorseSymbol(currentSymbol);
  decodedText   += ch;
  currentSymbol  = '';
  updateTranslationDisplay();
  addSymbolDivider();

  // After WORD_GAP_MS more silence → commit a space
  wordTimeout = setTimeout(commitSpace, WORD_GAP_MS - SYMBOL_GAP_MS);
}

function commitSpace() {
  if (decodedText.endsWith(' ') || decodedText === '') return;
  decodedText += ' ';
  tapSequence.push('/');
  updateTranslationDisplay();
  updateSequenceDisplay();
}

// ────────────────────────────────────────────────────────────
//  Display Updates
// ────────────────────────────────────────────────────────────
function updateSequenceDisplay() {
  // Show the committed stream + current in-progress symbol
  const stream = [...tapSequence];
  if (currentSymbol) {
    stream.push(currentSymbol); // preview
  }

  if (stream.length === 0) {
    sequenceDisplay.innerHTML = '<span class="placeholder">—</span>';
    return;
  }

  sequenceDisplay.innerHTML = stream
    .map((tok, i) => {
      if (tok === '/') {
        return '<span class="word-sep">/</span>';
      }
      const isPreview = i === stream.length - 1 && !!currentSymbol;
      return tok
        .split('')
        .map(ch => `<span class="token ${ch === '.' ? 'dot' : 'dash'}${isPreview ? ' preview' : ''}">${ch === '.' ? '·' : '—'}</span>`)
        .join('');
    })
    .join('');
}

function addSymbolDivider() {
  tapSequence.push('|');
  updateSequenceDisplay();
}

function updateTranslationDisplay() {
  if (!decodedText && !currentSymbol) {
    translationDisplay.innerHTML = '<span class="waiting">WAITING_FOR_SIGNAL...</span>';
    return;
  }
  // Show decoded text + live preview of current symbol
  let preview = '';
  if (currentSymbol) {
    preview = `<span class="live-preview">${decodeMorseSymbol(currentSymbol)}</span>`;
  }
  translationDisplay.textContent = decodedText;
  if (preview) translationDisplay.innerHTML += preview;
}

function showTokenFlash(token) {
  const flash = document.getElementById('token-flash');
  if (!flash) return;
  flash.textContent = token === '.' ? '·' : '—';
  flash.className   = 'token-flash ' + (token === '.' ? 'dot' : 'dash');
  flash.classList.add('visible');
  setTimeout(() => flash.classList.remove('visible'), 350);
}

// ────────────────────────────────────────────────────────────
//  Buttons
// ────────────────────────────────────────────────────────────
function bindButtons() {
  resetBtn.addEventListener('click', () => {
    clearTimeout(symbolTimeout);
    clearTimeout(wordTimeout);
    currentSymbol = '';
    decodedText   = '';
    tapSequence   = [];
    isKeyDown     = false;
    updateSequenceDisplay();
    updateTranslationDisplay();
    playClick();
  });

  copyBtn.addEventListener('click', () => {
    if (!decodedText.trim()) return;
    navigator.clipboard.writeText(decodedText.trim()).then(() => {
      showToast('Copied to clipboard');
    });
    playClick();
  });

  shareBtn.addEventListener('click', () => {
    const text = decodedText.trim();
    if (!text) return;
    if (navigator.share) {
      navigator.share({ title: 'SIGNAL — Morse Decoded', text });
    } else {
      showToast('Share not supported — text copied');
      navigator.clipboard.writeText(text);
    }
    playClick();
  });

  audioToggle.addEventListener('click', () => {
    audioEnabled = !audioEnabled;
    audioToggle.classList.toggle('muted', !audioEnabled);
    audioToggle.title = audioEnabled ? 'Mute audio' : 'Unmute audio';
    playClick();
  });

  // Settings / theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('light-theme');
      playClick();
    });
  }
}

// ────────────────────────────────────────────────────────────
//  Reference Table Rendering
// ────────────────────────────────────────────────────────────
function renderReference() {
  const grid = document.getElementById('reference-grid');
  if (!grid) return;

  const entries = Object.entries(MORSE_MAP);
  grid.innerHTML = entries.map(([morse, ch]) => `
    <div class="ref-card" data-char="${ch}" data-morse="${morse}">
      <span class="ref-char">${ch}</span>
      <span class="ref-morse">${morse.split('').map(t =>
        `<span class="${t === '.' ? 'dot' : 'dash'}">${t === '.' ? '·' : '—'}</span>`
      ).join('')}</span>
    </div>
  `).join('');
}

function bindSearch() {
  const searchInput = document.getElementById('ref-search');
  if (!searchInput) return;
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toUpperCase().trim();
    document.querySelectorAll('.ref-card').forEach(card => {
      const ch    = card.dataset.char;
      const morse = card.dataset.morse;
      card.style.display = (!q || ch.includes(q) || morse.includes(q)) ? '' : 'none';
    });
  });
}

// ────────────────────────────────────────────────────────────
//  Toast notification
// ────────────────────────────────────────────────────────────
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

// ────────────────────────────────────────────────────────────
//  Boot
// ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
