// Sound: a tiny WebAudio synth only, no files. Every cue is a few oscillators
// shaped by a gain envelope. Audio starts only after the first user gesture
// (browsers demand it) and M mutes everything.

export function createAudio() {
  let context = null;
  let muted = false;
  let lastBlip = 0;

  function ensure() {
    if (context) return context;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      context = new AC();
    } catch {
      context = null;
    }
    return context;
  }

  /** Unlock audio on the first gesture; safe to call on every gesture. */
  function unlock() {
    const ctx = ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function tone(freq, dur, type, gainValue, when) {
    const ctx = ensure();
    if (!ctx || muted) return;
    const start = ctx.currentTime + (when || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }

  /** A page chime: two bright notes, a fifth apart. */
  function page() {
    tone(880, 0.22, 'sine', 0.16);
    tone(1318, 0.3, 'sine', 0.12, 0.07);
  }

  /** A coin clink: a short metallic ping. */
  function coin() {
    tone(2093, 0.09, 'triangle', 0.14);
    tone(1568, 0.12, 'triangle', 0.08, 0.03);
  }

  /** The alarm sting: a low sawtooth fall. */
  function alarm() {
    tone(220, 0.5, 'sawtooth', 0.2);
    tone(165, 0.55, 'sawtooth', 0.18, 0.1);
    tone(110, 0.6, 'square', 0.1, 0.2);
  }

  /** The door unlock: a warm major triad, quick. */
  function unlockSound() {
    tone(523, 0.16, 'triangle', 0.14);
    tone(659, 0.16, 'triangle', 0.14, 0.06);
    tone(784, 0.28, 'triangle', 0.14, 0.12);
  }

  /** The victory arpeggio: four rising notes. */
  function victory() {
    const notes = [523, 659, 784, 1046];
    for (let i = 0; i < notes.length; i += 1) tone(notes[i], 0.32, 'triangle', 0.15, i * 0.11);
  }

  /** The Ledger grab: a low bell plus a bright shimmer. */
  function ledger() {
    tone(392, 0.5, 'sine', 0.18);
    tone(1175, 0.4, 'sine', 0.1, 0.08);
    tone(1568, 0.5, 'sine', 0.08, 0.16);
  }

  /**
   * The suspicion blip: its pitch rises with the highest detection meter, so
   * the player hears danger coming. Throttled to one blip per 0.45 s.
   */
  function suspicion(meter) {
    const now = (context && context.currentTime) || 0;
    if (now - lastBlip < 0.45) return;
    lastBlip = now;
    const freq = 320 + meter * 5.2;
    tone(freq, 0.1, 'square', 0.05);
  }

  /** A soft footstep tick, barely audible, for marble steps (optional flavour). */
  function step() {
    tone(140, 0.05, 'sine', 0.03);
  }

  /** A short click for UI confirms on the title screen. */
  function confirm() {
    tone(660, 0.08, 'triangle', 0.1);
    tone(990, 0.12, 'triangle', 0.08, 0.05);
  }

  function setMuted(value) {
    muted = value;
  }

  function isMuted() {
    return muted;
  }

  return {
    unlock, page, coin, alarm, unlockSound, victory, ledger, suspicion, step,
    confirm, setMuted, isMuted,
  };
}
