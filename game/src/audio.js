// Tiny synthesised sound effects: plain WebAudio oscillators, no audio files.
// The context is created on the first user gesture; before that every call is
// a silent no-op, so screenshot mode never needs audio.
export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      return null;
    }
    return context;
  }

  function tone(frequency, seconds, type, volume, when = 0, slideTo = null) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx || ctx.state === 'suspended') return;
    try {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + when);
      if (slideTo !== null) oscillator.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + when + seconds);
      gain.gain.setValueAtTime(volume, ctx.currentTime + when);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + seconds);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(ctx.currentTime + when);
      oscillator.stop(ctx.currentTime + when + seconds + 0.02);
    } catch {
      // Audio is decoration: a failure never breaks the game.
    }
  }

  return {
    unlock() {
      const ctx = ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    pickup() {
      tone(880, 0.09, 'sine', 0.12);
      tone(1318, 0.12, 'sine', 0.1, 0.07);
    },
    crack() {
      tone(220, 0.08, 'square', 0.05);
      tone(330, 0.08, 'square', 0.05, 0.08);
    },
    mainLoot() {
      tone(523, 0.12, 'sine', 0.14);
      tone(659, 0.12, 'sine', 0.14, 0.1);
      tone(784, 0.2, 'sine', 0.14, 0.2);
    },
    alarm() {
      tone(620, 0.16, 'sawtooth', 0.07, 0, 440);
      tone(620, 0.16, 'sawtooth', 0.07, 0.2, 440);
    },
    caught() {
      tone(392, 0.5, 'sawtooth', 0.12, 0, 98);
    },
    complete() {
      [523, 659, 784, 1046].forEach((frequency, index) => tone(frequency, 0.22, 'sine', 0.13, index * 0.11));
    },
    coin() {
      tone(1568, 0.06, 'triangle', 0.1);
    },
    smoke() {
      tone(180, 0.3, 'sine', 0.08, 0, 60);
    },
    dash() {
      tone(300, 0.12, 'sine', 0.06, 0, 520);
    },
  };
}
