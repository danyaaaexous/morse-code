// ============================================================
//  SIGNAL — All-in-one script (no ES modules, works on file://)
//  Morse translator + Audio + UI Controller
// ============================================================

// ── Morse Code Map ───────────────────────────────────────────
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
  '.-.-.-': '.', '--..--': ',', '..--..': '?',
  '.----.': "'", '-.-.--': '!', '-..-.':  '/',
  '-.--.':  '(', '-.--.-': ')', '.-...':  '&',
  '---...': ':', '-.-.-.': ';', '-...-':  '=',
  '-....-': '-', '..--.-': '_', '.-..-.': '"',
  '.--.-.': '@'
};

function decodeMorseSymbol(symbol) {
  return MORSE_MAP[symbol] || (symbol ? '?' : '');
}

// ── Audio Engine ─────────────────────────────────────────────
let audioCtx    = null;
let gainNode    = null;
let oscillator  = null;
let toneActive  = false;

const FREQ   = 650;
const VOL    = 0.18;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.connect(audioCtx.destination);
  }
  return audioCtx;
}

function startTone() {
  if (toneActive) return;
  const ctx = getCtx();
  oscillator = ctx.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(FREQ, ctx.currentTime);
  oscillator.connect(gainNode);
  oscillator.start();
  gainNode.gain.cancelScheduledValues(ctx.currentTime);
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(VOL, ctx.currentTime + 0.005);
  toneActive = true;
}

function stopTone() {
  if (!toneActive || !gainNode) return;
  const ctx = audioCtx;
  gainNode.gain.cancelScheduledValues(ctx.currentTime);
  gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.01);
  oscillator.stop(ctx.currentTime + 0.02);
  oscillator = null;
  toneActive = false;
}

function playClick() {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    env.gain.setValueAtTime(0.06, ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.connect(env);
    env.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
  } catch (e) { /* ignore audio errors */ }
}

// ── Timing ───────────────────────────────────────────────────
const DOT_MAX    = 250;   // ms — tap ≤ this = dot
const LETTER_GAP = 600;   // ms — silence → commit letter
const WORD_GAP   = 1400;  // ms — silence → commit space

// ── State ────────────────────────────────────────────────────
let pressStart    = 0;
let letterTimer   = null;
let wordTimer     = null;
let currentSymbol = '';
let decodedText   = '';
let tapSequence   = [];
let isKeyDown     = false;
let audioEnabled  = true;

// ── DOM ──────────────────────────────────────────────────────
let keyBtn, keyRing, sequenceEl, translationEl;
let resetBtn, copyBtn, shareBtn, audioToggle, tokenFlash;

// ── Init ─────────────────────────────────────────────────────
function init() {
  keyBtn        = document.getElementById('telegraph-key');
  keyRing       = document.getElementById('key-ring');
  tokenFlash    = document.getElementById('token-flash');
  sequenceEl    = document.getElementById('sequence-display');
  translationEl = document.getElementById('translation-display');
  resetBtn      = document.getElementById('btn-reset');
  copyBtn       = document.getElementById('btn-copy');
  shareBtn      = document.getElementById('btn-share');
  audioToggle   = document.getElementById('audio-toggle');

  bindKeyEvents();
  bindButtons();
  bindKeyboard();
  renderReference();
  bindSearch();
  refreshSequence();
  refreshTranslation();
}

// ── Key Events ───────────────────────────────────────────────
function bindKeyEvents() {
  keyBtn.addEventListener('mousedown',  onDown);
  keyBtn.addEventListener('mouseup',    onUp);
  keyBtn.addEventListener('mouseleave', () => { if (isKeyDown) onUp(); });
  keyBtn.addEventListener('touchstart', e => { e.preventDefault(); onDown(); }, { passive: false });
  keyBtn.addEventListener('touchend',   e => { e.preventDefault(); onUp();   }, { passive: false });
}

function bindKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.code === 'Space' && !e.repeat && !e.target.matches('input')) {
      e.preventDefault(); onDown();
    }
  });
  document.addEventListener('keyup', e => {
    if (e.code === 'Space' && !e.target.matches('input')) {
      e.preventDefault(); onUp();
    }
  });
}

function onDown() {
  if (isKeyDown) return;
  isKeyDown  = true;
  pressStart = Date.now();
  keyBtn.classList.add('active');
  keyRing.classList.add('pulse');
  clearTimeout(letterTimer);
  clearTimeout(wordTimer);
  if (audioEnabled) startTone();
}

function onUp() {
  if (!isKeyDown) return;
  isKeyDown = false;

  const dur   = Date.now() - pressStart;
  const token = dur <= DOT_MAX ? '.' : '-';

  keyBtn.classList.remove('active');
  keyRing.classList.remove('pulse');
  flashToken(token);
  if (audioEnabled) stopTone();

  currentSymbol += token;
  tapSequence.push(token);
  refreshSequence();

  letterTimer = setTimeout(commitLetter, LETTER_GAP);
}

function commitLetter() {
  if (!currentSymbol) return;
  const ch = decodeMorseSymbol(currentSymbol);
  decodedText   += ch;
  currentSymbol  = '';
  tapSequence.push('|');
  refreshSequence();
  refreshTranslation();
  wordTimer = setTimeout(commitSpace, WORD_GAP - LETTER_GAP);
}

function commitSpace() {
  if (!decodedText || decodedText.endsWith(' ')) return;
  decodedText += ' ';
  tapSequence.push('/');
  refreshSequence();
  refreshTranslation();
}

// ── Rendering ────────────────────────────────────────────────
function refreshSequence() {
  const stream = [...tapSequence];
  if (currentSymbol) stream.push(currentSymbol + '_preview');

  if (stream.length === 0) {
    sequenceEl.innerHTML = '<span class="placeholder">—</span>';
    return;
  }

  sequenceEl.innerHTML = stream.map((tok, i) => {
    if (tok === '/') return '<span class="word-sep">/</span>';
    if (tok === '|') return '<span class="letter-sep"></span>';

    const isPreview = tok.endsWith('_preview');
    const raw = isPreview ? tok.replace('_preview', '') : tok;
    return raw.split('').map(ch =>
      `<span class="token ${ch === '.' ? 'dot' : 'dash'}${isPreview ? ' preview' : ''}">${ch === '.' ? '·' : '—'}</span>`
    ).join('');
  }).join('');
}

function refreshTranslation() {
  if (!decodedText && !currentSymbol) {
    translationEl.innerHTML = '<span class="waiting">WAITING_FOR_SIGNAL...</span>';
    return;
  }
  const preview = currentSymbol
    ? `<span class="live-preview">${decodeMorseSymbol(currentSymbol)}</span>`
    : '';
  translationEl.textContent = decodedText;
  if (preview) translationEl.innerHTML += preview;
}

function flashToken(token) {
  if (!tokenFlash) return;
  tokenFlash.textContent = token === '.' ? '·' : '—';
  tokenFlash.className   = 'token-flash ' + (token === '.' ? 'dot' : 'dash');
  tokenFlash.classList.add('visible');
  setTimeout(() => tokenFlash.classList.remove('visible'), 400);
}

// ── Buttons ──────────────────────────────────────────────────
function bindButtons() {
  resetBtn.addEventListener('click', () => {
    clearTimeout(letterTimer);
    clearTimeout(wordTimer);
    currentSymbol = '';
    decodedText   = '';
    tapSequence   = [];
    isKeyDown     = false;
    refreshSequence();
    refreshTranslation();
    playClick();
  });

  copyBtn.addEventListener('click', () => {
    if (!decodedText.trim()) return;
    navigator.clipboard.writeText(decodedText.trim()).then(() => showToast('Copied!'));
    playClick();
  });

  shareBtn.addEventListener('click', () => {
    const text = decodedText.trim();
    if (!text) return;
    if (navigator.share) {
      navigator.share({ title: 'SIGNAL', text });
    } else {
      navigator.clipboard.writeText(text);
      showToast('Text copied to clipboard');
    }
    playClick();
  });

  audioToggle.addEventListener('click', () => {
    audioEnabled = !audioEnabled;
    audioToggle.classList.toggle('muted', !audioEnabled);
    audioToggle.setAttribute('title', audioEnabled ? 'Mute audio' : 'Unmute audio');
    playClick();
  });

  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      document.body.classList.toggle('light-theme');
      playClick();
    });
  }
}

// ── Reference Grid ───────────────────────────────────────────
function renderReference() {
  const grid = document.getElementById('reference-grid');
  if (!grid) return;

  grid.innerHTML = Object.entries(MORSE_MAP).map(([morse, ch]) => {
    const morseHtml = morse.split('').map(t =>
      `<span class="${t === '.' ? 'dot' : 'dash'}">${t === '.' ? '·' : '—'}</span>`
    ).join('');
    return `
      <div class="ref-card" role="listitem" data-char="${ch}" data-morse="${morse}"
           title="${ch} = ${morse}">
        <span class="ref-char">${ch}</span>
        <span class="ref-morse">${morseHtml}</span>
      </div>`;
  }).join('');
}

function bindSearch() {
  const input = document.getElementById('ref-search');
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.toUpperCase().trim();
    document.querySelectorAll('.ref-card').forEach(card => {
      const match = !q || card.dataset.char.includes(q) || card.dataset.morse.includes(q);
      card.style.display = match ? '' : 'none';
    });
  });
}

// ── Toast ────────────────────────────────────────────────────
function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// ── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
