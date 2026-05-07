// Tiny Web Audio synth for UI + combat sound effects. No assets — every sound
// is generated in real time from oscillators / noise. Auto-disables itself if
// AudioContext isn't available. The first call lazily creates the context;
// browsers block autoplay until a user gesture, so play* before any click is
// silently dropped (which is fine — they won't hit it).

let _ctx = null;
let _master = null;
let _muted = false;

function ctx() {
  if (_ctx) return _ctx;
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return null;
  try {
    _ctx = new C();
    _master = _ctx.createGain();
    _master.gain.value = 0.35;
    _master.connect(_ctx.destination);
  } catch {
    _ctx = null;
  }
  return _ctx;
}

export function setMuted(m) { _muted = !!m; }
export function isMuted()   { return _muted; }

function envGain(c, attack, decay, peak) {
  const g = c.createGain();
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(peak, c.currentTime + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + attack + decay);
  return g;
}

function tone(freq, dur, type = 'sine', peak = 0.4) {
  if (_muted) return;
  const c = ctx(); if (!c) return;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const g = envGain(c, 0.005, dur, peak);
  o.connect(g).connect(_master);
  o.start();
  o.stop(c.currentTime + dur + 0.05);
}

function sweep(f0, f1, dur, type = 'sine', peak = 0.35) {
  if (_muted) return;
  const c = ctx(); if (!c) return;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(f1, c.currentTime + dur);
  const g = envGain(c, 0.01, dur, peak);
  o.connect(g).connect(_master);
  o.start();
  o.stop(c.currentTime + dur + 0.05);
}

function noise(dur, lowpass = 1200, peak = 0.25) {
  if (_muted) return;
  const c = ctx(); if (!c) return;
  const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filt = c.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = lowpass;
  const g = envGain(c, 0.005, dur, peak);
  src.connect(filt).connect(g).connect(_master);
  src.start();
  src.stop(c.currentTime + dur + 0.05);
}

// ============================================================================
// Voices
// ============================================================================
export function playClick()    { noise(0.05, 4000, 0.18); }
export function playImpact()   { sweep(140, 60, 0.18, 'sine', 0.35); noise(0.05, 700, 0.10); }
export function playHeal()     { sweep(330, 660, 0.30, 'sine', 0.20); }
export function playCrit()     { tone(1320, 0.22, 'triangle', 0.30); tone(1760, 0.18, 'triangle', 0.18); }
export function playDodge()    { sweep(880, 1320, 0.12, 'sine', 0.18); }
export function playUnlock()   {
  if (_muted) return;
  const c = ctx(); if (!c) return;
  const tNow = c.currentTime;
  // ascending major triad
  [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.25), i * 90));
}
export function playRarity(rarity) {
  switch (rarity) {
    case 'rusted':    tone(180, 0.15, 'square', 0.10); break;
    case 'common':    tone(440, 0.12, 'sine', 0.22); break;
    case 'rare':      sweep(440, 660, 0.18, 'sine', 0.25); break;
    case 'epic':      [523, 659].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.25), i * 60)); break;
    case 'mythic':    [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.20, 'triangle', 0.25), i * 60)); break;
    case 'legendary': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.28), i * 70)); break;
    case 'radiant':   [523, 659, 784, 988, 1175, 1568].forEach((f, i) => setTimeout(() => tone(f, 0.26, 'triangle', 0.30), i * 70)); break;
    default:          tone(440, 0.10, 'sine', 0.18);
  }
}

// Global delegated handler for UI clicks. Skips canvas / passive elements so
// only meaningful interactions click; buttons + .roster-card + .stash-row
// + .equip-slot + .reroll-btn cover the major surfaces.
export function bindGlobalClickSound() {
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button, .roster-card, .stash-row, .equip-slot, .ability-chip, .dungeon-btn, .swap-btn');
    if (t && !t.disabled) playClick();
  }, true);
}
