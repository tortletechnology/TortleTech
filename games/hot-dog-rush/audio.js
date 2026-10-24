export function createAudio() {
  let ctx = null;
  let master = null;
  let sfx = null;
  let music = null;
  let muted = false;
  let musicOn = true;
  let nextNote = 0;
  let step = 0;
  const melody = [523, 659, 784, 659, 698, 784, 880, 784, 659, 587, 523, 587];
  const bass = [196, 196, 247, 220, 196, 175];

  function ensure() {
    if (ctx) return true;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(ctx.destination);
    sfx = ctx.createGain();
    sfx.gain.value = 0.85;
    sfx.connect(master);
    music = ctx.createGain();
    music.gain.value = musicOn ? 0.2 : 0;
    music.connect(master);
    return true;
  }

  function resume() {
    if (!ensure()) return;
    if (ctx.state === "suspended") ctx.resume();
  }

  function tone(freq, dur, type, vol, when = 0, dest = sfx) {
    if (!ctx || muted || !dest) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, vol) {
    if (!ctx || muted) return;
    const length = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = 900;
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(sfx);
    src.start();
  }

  function schedule() {
    if (!ctx || !musicOn || muted) return;
    const now = ctx.currentTime;
    if (nextNote < now) nextNote = now + 0.02;
    let guard = 0;
    while (nextNote < now + 0.25 && guard < 6) {
      tone(melody[step % melody.length], 0.16, "sine", 0.05, nextNote - now, music);
      if (step % 2 === 0) tone(bass[(step / 2) % bass.length], 0.22, "triangle", 0.06, nextNote - now, music);
      nextNote += 0.24;
      step += 1;
      guard += 1;
    }
  }

  return {
    resume,
    setMuted(value) {
      muted = !!value;
      if (master) master.gain.value = muted ? 0 : 0.9;
    },
    get muted() {
      return muted;
    },
    toggleMute() {
      this.setMuted(!muted);
      return muted;
    },
    setMusic(on) {
      musicOn = !!on;
      if (music) music.gain.value = musicOn ? 0.2 : 0;
    },
    toggleMusic() {
      this.setMusic(!musicOn);
      return musicOn;
    },
    get musicOn() {
      return musicOn;
    },
    click() {
      tone(520, 0.05, "triangle", 0.07);
    },
    pickup() {
      tone(440, 0.07, "sine", 0.09);
      tone(660, 0.09, "sine", 0.07, 0.03);
    },
    grill() {
      tone(170, 0.12, "sawtooth", 0.035);
      noise(0.16, 0.07);
    },
    ding() {
      tone(880, 0.11, "sine", 0.1);
      tone(1320, 0.16, "sine", 0.06, 0.02);
    },
    serve() {
      [523, 659, 784, 1046].forEach((freq, index) => tone(freq, 0.16, "triangle", 0.1, index * 0.055));
    },
    fail() {
      tone(146, 0.2, "square", 0.05);
      tone(98, 0.26, "sawtooth", 0.04, 0.03);
    },
    burn() {
      tone(280, 0.18, "sawtooth", 0.04);
      noise(0.22, 0.08);
    },
    fanfare() {
      [392, 523, 659, 784].forEach((freq, index) => tone(freq, 0.18, "triangle", 0.09, index * 0.08));
    },
    update() {
      schedule();
    },
  };
}
