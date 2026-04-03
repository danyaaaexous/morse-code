// ============================================================
//  SIGNAL — Audio Engine
//  Web Audio API tone generator for dot / dash feedback
// ============================================================

let audioCtx = null;
let gainNode = null;
let oscillator = null;
let isTonePlaying = false;

const FREQUENCY   = 650;   // Hz — classic telegraph tone
const VOLUME      = 0.18;  // 0..1

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    gainNode  = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.connect(audioCtx.destination);
  }
  return audioCtx;
}

/** Start a continuous tone (key-down). */
function startTone() {
  if (isTonePlaying) return;
  const ctx = getAudioContext();
  oscillator = ctx.createOscillator();
  oscillator.type      = 'sine';
  oscillator.frequency.setValueAtTime(FREQUENCY, ctx.currentTime);
  oscillator.connect(gainNode);
  oscillator.start();
  gainNode.gain.cancelScheduledValues(ctx.currentTime);
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(VOLUME, ctx.currentTime + 0.005);
  isTonePlaying = true;
}

/** Stop the tone (key-up). */
function stopTone() {
  if (!isTonePlaying || !gainNode) return;
  const ctx = audioCtx;
  gainNode.gain.cancelScheduledValues(ctx.currentTime);
  gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.01);
  oscillator.stop(ctx.currentTime + 0.02);
  oscillator = null;
  isTonePlaying = false;
}

/** Play a quick click sound for UI feedback. */
function playClick() {
  const ctx = getAudioContext();
  const osc  = ctx.createOscillator();
  const env  = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(1200, ctx.currentTime);
  env.gain.setValueAtTime(0.06, ctx.currentTime);
  env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
  osc.connect(env);
  env.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.05);
}

export { startTone, stopTone, playClick };
