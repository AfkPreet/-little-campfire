/**
 * Synth toolkit + every sound effect (spec section 9). Pure Web Audio, no
 * files. Everything here works on any BaseAudioContext, so the same recipes
 * can be rendered offline for loudness checks.
 *
 * Sound rules: soft attacks (>= 2 ms), rounded sine/triangle tones, filtered
 * noise, low-mid centre of gravity, gentle reverb. Never a buzzer.
 */

// ---------------------------------------------------------------------------
// Graph primitives shared by sfx, ambience and the fallback score
// ---------------------------------------------------------------------------

/** A bus input pair: dry signal and reverb send. */
export interface Out {
  dry: AudioNode;
  wet: AudioNode;
}

export interface NoiseBank {
  white: AudioBuffer;
  pink: AudioBuffer;
  brown: AudioBuffer;
}

export const mtof = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);
export const rand = (a: number, b: number): number => a + Math.random() * (b - a);
export const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const TINY = 0.0001;

/**
 * Copy `src` (length len + fade) into a seamlessly looping buffer of length
 * len: the extra tail is crossfaded into the head, so sample len-1 flows
 * straight into sample 0.
 */
export function loopify(dst: Float32Array, src: Float32Array, fade: number): void {
  const len = dst.length;
  for (let i = 0; i < len; i++) dst[i] = src[i];
  for (let i = 0; i < fade; i++) {
    const k = i / fade;
    dst[i] = src[i] * k + src[len + i] * (1 - k);
  }
}

/** Mono noise buffers, generated once per context. */
export function makeNoiseBank(ctx: BaseAudioContext): NoiseBank {
  const sr = ctx.sampleRate;
  const fade = Math.floor(sr * 0.05);
  const mk = (sec: number) => ctx.createBuffer(1, Math.floor(sr * sec), sr);
  const white = mk(2);
  const wd = white.getChannelData(0);
  for (let i = 0; i < wd.length; i++) wd[i] = Math.random() * 2 - 1;

  // Pink: Paul Kellet's refined filter.
  const pink = mk(3);
  const praw = new Float32Array(pink.length + fade);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < praw.length; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    praw[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  loopify(pink.getChannelData(0), praw, fade);

  // Brown: leaky integrated white noise.
  const brown = mk(3);
  const braw = new Float32Array(brown.length + fade);
  let last = 0;
  for (let i = 0; i < braw.length; i++) {
    const w = Math.random() * 2 - 1;
    last = (last + 0.02 * w) / 1.02;
    braw[i] = last * 3.5;
  }
  loopify(brown.getChannelData(0), braw, fade);
  return { white, pink, brown };
}

/**
 * A warm stereo reverb impulse from shaped noise: short pre-delay, a few early
 * reflections, an exponential tail that darkens as it decays.
 */
export function makeImpulse(ctx: BaseAudioContext, seconds = 2.4, decayPow = 3.2): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * seconds);
  const buf = ctx.createBuffer(2, len, sr);
  const pre = Math.floor(sr * 0.014);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = pre; i < len; i++) {
      const t = (i - pre) / (len - pre);
      // One-pole lowpass whose cutoff drops over the tail: darker, softer decay.
      const a = 0.62 - 0.5 * t;
      lp += a * ((Math.random() * 2 - 1) - lp);
      d[i] = lp * Math.pow(1 - t, decayPow);
    }
    // Early reflections.
    for (let k = 0; k < 7; k++) {
      const at = pre + Math.floor(sr * (0.008 + Math.random() * 0.07));
      if (at < len) d[at] += (Math.random() < 0.5 ? -1 : 1) * (0.5 - k * 0.05);
    }
    // Fade-in over 4 ms so the wet path has no click.
    const fi = Math.floor(sr * 0.004);
    for (let i = 0; i < fi; i++) d[pre + i] *= i / fi;
  }
  return buf;
}

/** Hold an AudioParam at its current value from time t (for interrupting ramps). */
export function holdAt(p: AudioParam, t: number): void {
  const anyP = p as AudioParam & { cancelAndHoldAtTime?: (t: number) => AudioParam };
  if (typeof anyP.cancelAndHoldAtTime === 'function') {
    try {
      anyP.cancelAndHoldAtTime(t);
      return;
    } catch {
      /* fall through */
    }
  }
  const v = p.value;
  p.cancelScheduledValues(t);
  p.setValueAtTime(v, t);
}

/** Percussive envelope: 0 -> peak (linear, attack) -> silence (exponential, decay). Returns end time. */
export function perc(p: AudioParam, t: number, peak: number, attack: number, decay: number): number {
  const a = Math.max(0.002, attack);
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(Math.max(TINY, peak), t + a);
  p.exponentialRampToValueAtTime(TINY, t + a + decay);
  p.setValueAtTime(0, t + a + decay + 0.005);
  return t + a + decay + 0.01;
}

/** Attack / hold / release envelope with a sustained body. Returns end time. */
export function swell(p: AudioParam, t: number, peak: number, attack: number, hold: number, release: number): number {
  const a = Math.max(0.004, attack);
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(Math.max(TINY, peak), t + a);
  p.setValueAtTime(Math.max(TINY, peak), t + a + hold);
  p.exponentialRampToValueAtTime(TINY, t + a + hold + release);
  p.setValueAtTime(0, t + a + hold + release + 0.005);
  return t + a + hold + release + 0.01;
}

/** Exponential glide of a frequency-like param. */
export function glide(p: AudioParam, t: number, from: number, to: number, dur: number): void {
  p.setValueAtTime(Math.max(TINY, from), t);
  p.exponentialRampToValueAtTime(Math.max(TINY, to), t + Math.max(0.005, dur));
}

let liveVoices = 0;
/** Cap on simultaneous voices per synth (the SFX synth drops new sounds beyond it). */
const MAX_VOICES = 40;
export function voiceCount(): number {
  return liveVoices;
}

/**
 * One short-lived sound: owns its nodes, routes to dry + reverb send through
 * an optional stereo panner, and disconnects everything when its last source
 * ends.
 */
export class Voice {
  readonly input: GainNode;
  private nodes: AudioNode[] = [];
  private lastSrc: AudioScheduledSourceNode | null = null;
  private lastEnd = 0;
  private finished = false;
  private params: { from: AudioNode; to: AudioParam }[] = [];

  constructor(
    readonly ctx: BaseAudioContext,
    out: Out,
    readonly noiseBank: NoiseBank,
    o: { vol?: number; pan?: number; wet?: number } = {},
    private readonly owner: { live: number } | null = null,
  ) {
    liveVoices++;
    if (owner) owner.live++;
    this.input = ctx.createGain();
    this.input.gain.value = o.vol ?? 1;
    this.nodes.push(this.input);
    let tail: AudioNode = this.input;
    const pan = o.pan ?? 0;
    if (pan !== 0 && typeof ctx.createStereoPanner === 'function') {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      tail.connect(p);
      this.nodes.push(p);
      tail = p;
    }
    tail.connect(out.dry);
    const wet = o.wet ?? 0;
    if (wet > 0) {
      const w = ctx.createGain();
      w.gain.value = wet;
      tail.connect(w);
      w.connect(out.wet);
      this.nodes.push(w);
    }
  }

  private track(src: AudioScheduledSourceNode, stop: number): void {
    this.nodes.push(src);
    if (stop >= this.lastEnd) {
      this.lastEnd = stop;
      this.lastSrc = src;
    }
  }

  osc(type: OscillatorType, freq: number, start: number, stop: number, dest: AudioNode = this.input): OscillatorNode {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = Math.max(1, freq);
    o.connect(dest);
    o.start(start);
    o.stop(stop);
    this.track(o, stop);
    return o;
  }

  noise(kind: keyof NoiseBank, start: number, stop: number, dest: AudioNode = this.input, rate = 1): AudioBufferSourceNode {
    const buf = this.noiseBank[kind];
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.playbackRate.value = rate;
    s.connect(dest);
    s.start(start, Math.random() * (buf.duration - 0.1));
    s.stop(stop);
    this.track(s, stop);
    return s;
  }

  filter(type: BiquadFilterType, freq: number, q = 0.707, dest: AudioNode = this.input): BiquadFilterNode {
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    f.connect(dest);
    this.nodes.push(f);
    return f;
  }

  gain(v: number, dest: AudioNode = this.input): GainNode {
    const g = this.ctx.createGain();
    g.gain.value = v;
    g.connect(dest);
    this.nodes.push(g);
    return g;
  }

  /** A gain whose output drives an AudioParam (FM index, LFO depth). */
  paramGain(to: AudioParam, v = 0): GainNode {
    const g = this.ctx.createGain();
    g.gain.value = v;
    g.connect(to);
    this.nodes.push(g);
    return g;
  }

  /** Connect an external modulator to a param; undone on cleanup. */
  modulate(from: AudioNode, to: AudioParam): void {
    from.connect(to);
    this.params.push({ from, to });
  }

  /** Register cleanup when the last source ends. Call after building. */
  done(): void {
    const src = this.lastSrc;
    if (!src) {
      this.cleanup();
      return;
    }
    src.onended = () => this.cleanup();
  }

  private cleanup(): void {
    if (this.finished) return;
    this.finished = true;
    liveVoices = Math.max(0, liveVoices - 1);
    if (this.owner) this.owner.live = Math.max(0, this.owner.live - 1);
    for (const { from, to } of this.params) {
      try {
        from.disconnect(to);
      } catch {
        /* already gone */
      }
    }
    for (const n of this.nodes) {
      try {
        n.disconnect();
      } catch {
        /* already gone */
      }
    }
    this.nodes = [];
  }
}

/** Builds voices on one output pair. */
export class Synth {
  /** Voices of this synth still sounding (score and ambience voices never block SFX). */
  live = 0;

  constructor(
    readonly ctx: BaseAudioContext,
    readonly out: Out,
    readonly noise: NoiseBank,
  ) {}

  voice(vol: number, pan = 0, wet = 0.15): Voice {
    return new Voice(this.ctx, this.out, this.noise, { vol, pan, wet }, this);
  }

  busy(): boolean {
    return this.live >= MAX_VOICES;
  }
}

// ---------------------------------------------------------------------------
// Reusable instrument voices (also used by the score and ambience)
// ---------------------------------------------------------------------------

/** Soft FM bell / glass chime. ratio 3.5 = glassy, 2.76 = tubular chime. */
export function bell(s: Synth, t: number, f: number, o: { vol: number; pan?: number; wet?: number; decay?: number; ratio?: number; index?: number }): void {
  const v = s.voice(o.vol, o.pan ?? 0, o.wet ?? 0.4);
  const decay = o.decay ?? 1.4;
  const end = t + decay + 0.05;
  const amp = v.gain(0);
  perc(amp.gain, t, 1, 0.005, decay);
  const car = v.osc('sine', f, t, end, amp);
  const mg = v.paramGain(car.frequency);
  v.osc('sine', f * (o.ratio ?? 3.5), t, end, mg);
  const idx = (o.index ?? 1.4) * f;
  perc(mg.gain, t, idx, 0.004, Math.min(0.35, decay * 0.3));
  // A quiet octave partial for sparkle.
  const p2 = v.gain(0);
  perc(p2.gain, t, 0.18, 0.003, decay * 0.4);
  v.osc('sine', f * 2, t, end, p2);
  v.done();
}

/** Marimba-like mallet note: sine body, 4x overtone, woody FM attack. */
export function marimba(s: Synth, t: number, f: number, o: { vol: number; pan?: number; wet?: number; decay?: number }): void {
  const v = s.voice(o.vol, o.pan ?? 0, o.wet ?? 0.25);
  const decay = o.decay ?? 0.9;
  const end = t + decay + 0.05;
  const amp = v.gain(0);
  perc(amp.gain, t, 1, 0.004, decay);
  const car = v.osc('sine', f, t, end, amp);
  const mg = v.paramGain(car.frequency);
  v.osc('sine', f, t, t + 0.2, mg);
  perc(mg.gain, t, f * 1.1, 0.002, 0.07);
  const ov = v.gain(0);
  perc(ov.gain, t, 0.22, 0.003, 0.11);
  v.osc('sine', f * 3.93, t, t + 0.2, ov);
  // Mallet: a breath of low-passed noise.
  const mal = v.gain(0);
  perc(mal.gain, t, 0.12, 0.002, 0.02);
  v.noise('pink', t, t + 0.06, v.filter('lowpass', 1800, 0.7, mal));
  v.done();
}

/** Sine "bloop" droplet / bubble with an exponential pitch rise. */
function bloop(s: Synth, t: number, f0: number, f1: number, o: { vol: number; pan?: number; wet?: number; rise?: number; decay?: number; lp?: number }): void {
  const v = s.voice(o.vol, o.pan ?? 0, o.wet ?? 0.15);
  const decay = o.decay ?? 0.09;
  const amp = v.gain(0, o.lp ? v.filter('lowpass', o.lp, 0.7) : v.input);
  const end = perc(amp.gain, t, 1, 0.003, decay);
  const osc = v.osc('sine', f0, t, end, amp);
  glide(osc.frequency, t, f0, f1, o.rise ?? 0.05);
  v.done();
}

// ---------------------------------------------------------------------------
// SFX catalogue
// ---------------------------------------------------------------------------

export const SFX_IDS = [
  'step',
  'plip',
  'splash',
  'bite',
  'reel',
  'fanfare',
  'pop',
  'basket',
  'tok',
  'spring',
  'page',
  'squish',
  'sizzle',
  'bubble',
  'kettle',
  'chime',
  'tinkle',
  'squeak',
  'nope',
  'coin',
  'whoosh',
  'stir',
  'rumble',
  'hearts',
  'sparkle',
  // Setting flavour (docs/WORLD.md).
  'tonk',
  'rattle',
  'eep',
  'rustle',
  'fwump',
  'tuck',
  'twinkle',
  'breath',
] as const;

export type SfxId = (typeof SFX_IDS)[number];

/** Friendly aliases other code may emit on the bus. */
export const SFX_ALIASES: Record<string, SfxId> = {
  discovery: 'chime',
  discover: 'chime',
  moment: 'chime',
  stamp: 'chime',
  cast: 'whoosh',
  swish: 'whoosh',
  catch: 'fanfare',
  bloop: 'bite',
  nibble: 'plip',
  bobber: 'plip',
  buy: 'coin',
  sell: 'coin',
  button: 'squish',
  tap: 'squish',
  click: 'squish',
  press: 'squish',
  peg: 'tok',
  jingle: 'spring',
  tent: 'spring',
  flip: 'page',
  forage: 'pop',
  pickup: 'pop',
  windchime: 'tinkle',
  chimes: 'tinkle',
  disabled: 'nope',
  deny: 'nope',
  release: 'hearts',
  heart: 'hearts',
  guardian: 'rumble',
  boil: 'bubble',
  whistle: 'kettle',
  fry: 'sizzle',
  footstep: 'step',
  yakbell: 'tonk',
  bell: 'tonk',
  lid: 'rattle',
  steamer: 'rattle',
  hero: 'eep',
  doko: 'rustle',
  ghum: 'fwump',
  curl: 'tuck',
  mica: 'twinkle',
  exhale: 'breath',
  mist: 'breath',
};

export function resolveSfx(id: string): SfxId | null {
  if ((SFX_IDS as readonly string[]).includes(id)) return id as SfxId;
  return SFX_ALIASES[id] ?? null;
}

type Recipe = (s: Synth, t: number, p: number, pan: number, vol: number) => void;

/** Pentatonic D major degrees for bells and sparkles. */
const PENTA_HI = [86, 88, 90, 93, 95, 98, 100] as const;

const R: Record<SfxId, Recipe> = {
  // Footstep pat on grass: a soft brushed pat with a tiny thump.
  step(s, t, p, pan, vol) {
    const v = s.voice(0.2 * vol, pan, 0.03);
    const amp = v.gain(0, v.filter('lowpass', 2600, 0.6));
    perc(amp.gain, t, 1, 0.006, 0.07);
    v.noise('pink', t, t + 0.1, v.filter('bandpass', 1300 * p * rand(0.85, 1.15), 1.0, amp));
    const rus = v.gain(0);
    perc(rus.gain, t + 0.01, 0.25, 0.01, 0.05);
    v.noise('white', t, t + 0.1, v.filter('bandpass', 3200 * p, 1.4, rus));
    const th = v.gain(0);
    perc(th.gain, t, 0.55, 0.004, 0.07);
    const o = v.osc('sine', 150 * p, t, t + 0.1, th);
    glide(o.frequency, t, 150 * p, 70 * p, 0.06);
    v.done();
  },

  // Bobber lands: a round droplet plip with a whisper of water.
  plip(s, t, p, pan, vol) {
    bloop(s, t, 520 * p, 1250 * p, { vol: 0.16 * vol, pan, wet: 0.25, rise: 0.045, decay: 0.12 });
    bloop(s, t + 0.05, 900 * p, 1500 * p, { vol: 0.05 * vol, pan, wet: 0.25, rise: 0.03, decay: 0.06 });
    const v = s.voice(0.05 * vol, pan, 0.2);
    const a = v.gain(0);
    perc(a.gain, t, 1, 0.004, 0.09);
    v.noise('pink', t, t + 0.12, v.filter('bandpass', 1700, 1.6, a));
    v.done();
  },

  // Splash: a falling band of noise, a soft body and a few droplets.
  splash(s, t, p, pan, vol) {
    const v = s.voice(0.42 * vol, pan, 0.25);
    const a = v.gain(0, v.filter('lowpass', 3200, 0.6));
    perc(a.gain, t, 1, 0.014, 0.55);
    const bp = v.filter('bandpass', 1400 * p, 0.8, a);
    glide(bp.frequency, t, 1500 * p, 480 * p, 0.5);
    v.noise('pink', t, t + 0.65, bp);
    const body = v.gain(0);
    perc(body.gain, t, 0.7, 0.01, 0.32);
    v.noise('brown', t, t + 0.4, v.filter('lowpass', 420, 0.7, body));
    v.done();
    const n = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const f = rand(700, 1400) * p;
      bloop(s, t + rand(0.08, 0.45), f, f * 1.6, { vol: 0.06 * vol, pan: pan + rand(-0.3, 0.3), wet: 0.3, rise: 0.04, decay: 0.07 });
    }
  },

  // Bite: a round double "bloop".
  bite(s, t, p, pan, vol) {
    const one = (tt: number, k: number, vv: number) => {
      const v = s.voice(vv * vol, pan, 0.2);
      const a = v.gain(0, v.filter('lowpass', 1400, 0.9));
      const end = perc(a.gain, tt, 1, 0.008, 0.2);
      const o = v.osc('sine', 260 * p * k, tt, end, a);
      o.frequency.setValueAtTime(260 * p * k, tt);
      o.frequency.exponentialRampToValueAtTime(540 * p * k, tt + 0.06);
      o.frequency.exponentialRampToValueAtTime(400 * p * k, tt + 0.18);
      const h = v.gain(0.28, a);
      const o2 = v.osc('triangle', 520 * p * k, tt, end, h);
      o2.frequency.setValueAtTime(520 * p * k, tt);
      o2.frequency.exponentialRampToValueAtTime(1080 * p * k, tt + 0.06);
      o2.frequency.exponentialRampToValueAtTime(800 * p * k, tt + 0.18);
      v.done();
    };
    one(t, 1, 0.18);
    one(t + 0.14, 1.12, 0.11);
  },

  // Reel: a soft pulsing whirr over a rising spool tone (~1.2 s).
  reel(s, t, p, pan, vol) {
    const dur = 1.2;
    const end = t + dur + 0.3;
    const v = s.voice(0.12 * vol, pan, 0.08);
    const env = v.gain(0, v.filter('lowpass', 3400, 0.6));
    swell(env.gain, t, 1, 0.08, dur - 0.08, 0.25);
    // Whirr: band-passed noise, amplitude pulsed by a triangle LFO.
    const am = v.gain(0.5, env);
    v.noise('white', t, end, v.filter('bandpass', 2200 * p, 2.6, am));
    const lfo = v.osc('triangle', 16, t, end, v.paramGain(am.gain, 0.45));
    lfo.frequency.setValueAtTime(14, t);
    lfo.frequency.linearRampToValueAtTime(30, t + 0.5);
    lfo.frequency.linearRampToValueAtTime(26, t + 0.9);
    lfo.frequency.linearRampToValueAtTime(12, t + dur);
    // Spool tone.
    const sp = v.gain(0.3, env);
    const o = v.osc('triangle', 170 * p, t, end, v.filter('lowpass', 900, 0.7, sp));
    o.frequency.setValueAtTime(170 * p, t);
    o.frequency.linearRampToValueAtTime(235 * p, t + 0.8);
    o.frequency.linearRampToValueAtTime(200 * p, t + dur);
    v.done();
  },

  // Catch fanfare: three rising marimba notes and a little bloom.
  fanfare(s, t, p, pan, vol) {
    const notes = [74, 78, 81];
    notes.forEach((m, i) => marimba(s, t + i * 0.13, mtof(m) * p, { vol: (i === 2 ? 0.3 : 0.24) * vol, pan, wet: 0.3, decay: i === 2 ? 1.5 : 0.8 }));
    [74, 78, 81, 86].forEach((m, i) => bell(s, t + 0.4 + i * 0.025, mtof(m) * p, { vol: 0.045 * vol, pan: pan + (i - 1.5) * 0.15, wet: 0.5, decay: 1.6, ratio: 3.5, index: 0.8 }));
    R.sparkle(s, t + 0.45, p, pan, vol * 0.7);
  },

  // Item pop: a bubbly upward pop.
  pop(s, t, p, pan, vol) {
    const v = s.voice(0.2 * vol, pan, 0.12);
    const a = v.gain(0);
    const end = perc(a.gain, t, 1, 0.003, 0.11);
    const o = v.osc('sine', 330 * p, t, end, a);
    glide(o.frequency, t, 330 * p, 900 * p, 0.07);
    const h = v.gain(0.18, a);
    const o2 = v.osc('triangle', 660 * p, t, end, v.filter('lowpass', 2400, 0.7, h));
    glide(o2.frequency, t, 660 * p, 1800 * p, 0.07);
    const c = v.gain(0);
    perc(c.gain, t, 0.15, 0.002, 0.015);
    v.noise('white', t, t + 0.04, v.filter('bandpass', 1500, 1.2, c));
    v.done();
  },

  // Basket: a soft wicker thud with two little bounces.
  basket(s, t, p, pan, vol) {
    const thud = (tt: number, k: number, vv: number) => {
      const v = s.voice(vv * vol, pan, 0.08);
      const a = v.gain(0);
      const end = perc(a.gain, tt, 1, 0.004, 0.13);
      const o = v.osc('sine', 210 * p * k, tt, end, a);
      glide(o.frequency, tt, 210 * p * k, 120 * p * k, 0.09);
      const w = v.gain(0);
      perc(w.gain, tt, 0.22, 0.004, 0.06);
      v.noise('pink', tt, tt + 0.08, v.filter('bandpass', 2300, 1.1, w));
      v.done();
    };
    thud(t, 1, 0.2);
    thud(t + 0.16, 1.22, 0.11);
    thud(t + 0.27, 1.38, 0.05);
  },

  // Tent peg: a hollow wooden tok.
  tok(s, t, p, pan, vol) {
    const v = s.voice(0.15 * vol, pan, 0.1);
    const a = v.gain(0);
    const end = perc(a.gain, t, 1, 0.004, 0.09);
    const o = v.osc('sine', 820 * p, t, end, a);
    glide(o.frequency, t, 820 * p, 760 * p, 0.08);
    const b = v.gain(0);
    perc(b.gain, t, 0.22, 0.004, 0.035);
    v.osc('sine', 820 * 2.1 * p, t, end, b);
    const k = v.gain(0);
    perc(k.gain, t, 0.45, 0.005, 0.06);
    v.osc('sine', 260 * p, t, end, k);
    const c = v.gain(0);
    perc(c.gain, t, 0.1, 0.003, 0.012);
    v.noise('white', t, t + 0.03, v.filter('bandpass', 2500, 1.5, c));
    v.done();
  },

  // Tent spring: a wobbly boing and a sparkly jingle.
  spring(s, t, p, pan, vol) {
    const v = s.voice(0.14 * vol, pan, 0.2);
    const a = v.gain(0, v.filter('lowpass', 1600, 0.7));
    const end = perc(a.gain, t, 1, 0.01, 0.55);
    const o = v.osc('sine', 180 * p, t, end, a);
    glide(o.frequency, t, 180 * p, 420 * p, 0.35);
    const vib = v.paramGain(o.frequency);
    v.osc('sine', 13, t, end, vib);
    vib.gain.setValueAtTime(45 * p, t);
    vib.gain.exponentialRampToValueAtTime(2, t + 0.5);
    const tri = v.gain(0.25, a);
    const o2 = v.osc('triangle', 360 * p, t, end, tri);
    glide(o2.frequency, t, 360 * p, 840 * p, 0.35);
    v.done();
    [86, 90, 93, 98].forEach((m, i) => bell(s, t + 0.2 + i * 0.07, mtof(m) * p, { vol: 0.05 * vol, pan: pan + (i - 1.5) * 0.2, wet: 0.4, decay: 0.7, ratio: 3.5, index: 1.2 }));
  },

  // Page flip: a papery swish and a soft flap.
  page(s, t, p, pan, vol) {
    const v = s.voice(0.26 * vol, pan, 0.06);
    const a = v.gain(0);
    swell(a.gain, t, 1, 0.06, 0.08, 0.16);
    const bp = v.filter('bandpass', 800, 0.9, a);
    bp.frequency.setValueAtTime(700 * p, t);
    bp.frequency.exponentialRampToValueAtTime(2600 * p, t + 0.16);
    bp.frequency.exponentialRampToValueAtTime(1200 * p, t + 0.3);
    v.noise('pink', t, t + 0.36, bp);
    const f = v.gain(0);
    perc(f.gain, t + 0.2, 0.5, 0.003, 0.05);
    v.noise('pink', t + 0.18, t + 0.3, v.filter('lowpass', 1200, 0.7, f));
    v.done();
  },

  // Button squish: a soft "pwip".
  squish(s, t, p, pan, vol) {
    const v = s.voice(0.18 * vol, pan, 0.05);
    const a = v.gain(0, v.filter('lowpass', 1500, 0.8));
    const end = perc(a.gain, t, 1, 0.004, 0.12);
    const o = v.osc('triangle', 480 * p, t, end, a);
    glide(o.frequency, t, 480 * p, 300 * p, 0.08);
    const sub = v.gain(0.5, a);
    const o2 = v.osc('sine', 240 * p, t, end, sub);
    glide(o2.frequency, t, 240 * p, 150 * p, 0.08);
    v.done();
  },

  // Sizzle: soft filtered hiss with crackle (~2.5 s).
  sizzle(s, t, p, pan, vol) {
    const dur = 2.5;
    const v = s.voice(0.07 * vol, pan, 0.04);
    const env = v.gain(0, v.filter('lowpass', 5000, 0.5));
    swell(env.gain, t, 1, 0.25, dur - 0.7, 0.45);
    const crack = v.gain(0.4, env);
    for (let i = 0; i < 46; i++) {
      const tt = t + rand(0.05, dur - 0.1);
      const pk = rand(0.6, 1.1);
      crack.gain.setValueAtTime(0.4, tt);
      crack.gain.linearRampToValueAtTime(pk, tt + 0.004);
      crack.gain.linearRampToValueAtTime(0.4, tt + rand(0.012, 0.03));
    }
    v.noise('white', t, t + dur + 0.1, v.filter('highpass', 1700 * p, 0.6, crack));
    const hiss = v.gain(0.35, env);
    v.noise('white', t, t + dur + 0.1, v.filter('bandpass', 3200 * p, 0.7, hiss));
    v.done();
  },

  // Bubbling pot: a cluster of low bubbles over a simmer (~2 s).
  bubble(s, t, p, pan, vol) {
    const v = s.voice(0.06 * vol, pan, 0.08);
    const a = v.gain(0);
    swell(a.gain, t, 1, 0.3, 1.3, 0.4);
    v.noise('brown', t, t + 2.1, v.filter('lowpass', 320, 0.7, a));
    v.done();
    const n = 10 + Math.floor(Math.random() * 5);
    for (let i = 0; i < n; i++) {
      const f = rand(180, 420) * p;
      bloop(s, t + rand(0, 1.9), f, f * 1.8, { vol: rand(0.06, 0.11) * vol, pan: pan + rand(-0.25, 0.25), wet: 0.12, rise: 0.05, decay: 0.07, lp: 1600 });
    }
  },

  // Kettle: a soft breathy whistle that swells and fades.
  kettle(s, t, p, pan, vol) {
    const dur = 2.0;
    const end = t + dur + 0.1;
    const v = s.voice(0.055 * vol, pan, 0.15);
    const env = v.gain(0, v.filter('lowpass', 3000, 0.6));
    swell(env.gain, t, 1, 0.65, dur - 1.1, 0.42);
    const w = v.gain(0.6, env);
    const o = v.osc('sine', 1050 * p, t, end, w);
    o.frequency.setValueAtTime(1050 * p, t);
    o.frequency.linearRampToValueAtTime(1240 * p, t + 1.6);
    v.osc('sine', 5.5, t, end, v.paramGain(o.frequency, 8 * p));
    const br = v.gain(0.5, env);
    const bp = v.filter('bandpass', 1050 * p, 6, br);
    bp.frequency.setValueAtTime(1050 * p, t);
    bp.frequency.linearRampToValueAtTime(1240 * p, t + 1.6);
    v.noise('pink', t, end, bp);
    v.done();
  },

  // Discovery chime: a rising pentatonic glass arpeggio.
  chime(s, t, p, pan, vol) {
    [81, 86, 88, 93].forEach((m, i) => bell(s, t + i * 0.09, mtof(m) * p, { vol: (0.105 - i * 0.01) * vol, pan: pan + (i - 1.5) * 0.15, wet: 0.45, decay: 1.6, ratio: 3.5, index: 1.3 }));
  },

  // Wind chime: a few random tubular tinkles.
  tinkle(s, t, p, pan, vol) {
    const n = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      bell(s, t + rand(0, 0.9), mtof(pick(PENTA_HI)) * p, { vol: rand(0.05, 0.08) * vol, pan: pan + rand(-0.4, 0.4), wet: 0.45, decay: rand(1.0, 1.5), ratio: 2.76, index: 1 });
    }
  },

  // Companion squeak: a tiny "eep" (sometimes "eep-eep").
  squeak(s, t, p, pan, vol) {
    const one = (tt: number, k: number, vv: number) => {
      const v = s.voice(vv * vol, pan, 0.12);
      const a = v.gain(0, v.filter('lowpass', 3000, 0.7));
      const end = swell(a.gain, tt, 1, 0.01, 0.06, 0.09);
      const o = v.osc('sine', 900 * p * k, tt, end, a);
      o.frequency.setValueAtTime(900 * p * k, tt);
      o.frequency.exponentialRampToValueAtTime(1500 * p * k, tt + 0.06);
      o.frequency.exponentialRampToValueAtTime(1150 * p * k, tt + 0.14);
      v.osc('sine', 22, tt, end, v.paramGain(o.frequency, 30 * p));
      v.done();
    };
    one(t, 1, 0.09);
    if (Math.random() < 0.5) one(t + 0.17, 1.12, 0.065);
  },

  // Gentle "nope": two soft falling notes, never a buzzer.
  nope(s, t, p, pan, vol) {
    [67, 64].forEach((m, i) => {
      const tt = t + i * 0.13;
      const v = s.voice(0.12 * vol, pan, 0.08);
      const a = v.gain(0, v.filter('lowpass', 1000, 0.7));
      const end = perc(a.gain, tt, 1, 0.012, 0.15);
      v.osc('triangle', mtof(m) * p, tt, end, a);
      v.done();
    });
  },

  // Coin: two soft bright notes.
  coin(s, t, p, pan, vol) {
    bell(s, t, mtof(83) * p, { vol: 0.08 * vol, pan, wet: 0.2, decay: 0.14, ratio: 2, index: 0.8 });
    bell(s, t + 0.075, mtof(88) * p, { vol: 0.1 * vol, pan, wet: 0.25, decay: 0.5, ratio: 2, index: 0.8 });
  },

  // Cast swish: a soft rising and falling band of air.
  whoosh(s, t, p, pan, vol) {
    const v = s.voice(0.4 * vol, pan, 0.05);
    const a = v.gain(0);
    swell(a.gain, t, 1, 0.12, 0.04, 0.24);
    const bp = v.filter('bandpass', 400, 1.4, a);
    bp.frequency.setValueAtTime(350 * p, t);
    bp.frequency.exponentialRampToValueAtTime(1600 * p, t + 0.18);
    bp.frequency.exponentialRampToValueAtTime(500 * p, t + 0.42);
    v.noise('pink', t, t + 0.45, bp);
    v.done();
  },

  // Spoon swirl: a sloshy circling filter with two tiny clinks.
  stir(s, t, p, pan, vol) {
    const dur = 1.1;
    const end = t + dur + 0.1;
    const v = s.voice(0.28 * vol, pan, 0.06);
    const a = v.gain(0);
    swell(a.gain, t, 1, 0.2, dur - 0.55, 0.35);
    const bp = v.filter('bandpass', 700 * p, 2, a);
    v.osc('sine', 1.8, t, end, v.paramGain(bp.frequency, 330 * p));
    v.noise('pink', t, end, bp);
    v.done();
    bell(s, t + 0.3, 2600 * p, { vol: 0.012 * vol, pan, wet: 0.15, decay: 0.08, ratio: 2.4, index: 0.5 });
    bell(s, t + 0.85, 3050 * p, { vol: 0.01 * vol, pan, wet: 0.15, decay: 0.08, ratio: 2.4, index: 0.5 });
  },

  // Guardian rumble: deep, soft, purring and happy (~2.4 s).
  rumble(s, t, p, pan, vol) {
    const dur = 2.4;
    const end = t + dur + 0.2;
    const v = s.voice(0.052 * vol, pan, 0.3);
    const env = v.gain(0, v.filter('lowpass', 700, 0.6));
    swell(env.gain, t, 1, 0.5, dur - 1.3, 0.8);
    const purr = v.gain(0.7, env);
    v.osc('sine', 5.5, t, end, v.paramGain(purr.gain, 0.3));
    const parts: [OscillatorType, number, number][] = [
      ['sine', 55, 1],
      ['sine', 110, 0.8],
      ['triangle', 165, 0.35],
    ];
    for (const [type, f, g] of parts) {
      const o = v.osc(type, f * p, t, end, v.gain(g, purr));
      o.frequency.setValueAtTime(f * p, t);
      o.frequency.setValueAtTime(f * p, t + dur - 0.7);
      o.frequency.linearRampToValueAtTime(f * p * 1.12, t + dur);
    }
    const n = v.gain(0.35, env);
    v.noise('brown', t, end, v.filter('lowpass', 200, 0.7, n));
    v.done();
  },

  // Release hearts: three tiny rising tinks.
  hearts(s, t, p, pan, vol) {
    [93, 95, 98].forEach((m, i) => bell(s, t + i * 0.065, mtof(m) * p, { vol: 0.065 * vol, pan: pan + (i - 1) * 0.2, wet: 0.45, decay: 0.45, ratio: 2, index: 0.4 }));
  },

  // Yak bell: a hollow bronze "tonk" with a soft wooden clapper.
  tonk(s, t, p, pan, vol) {
    bell(s, t, 430 * p, { vol: 0.11 * vol, pan, wet: 0.3, decay: 1.2, ratio: 2.41, index: 1.6 });
    bell(s, t + 0.004, 430 * 2.76 * p, { vol: 0.025 * vol, pan, wet: 0.3, decay: 0.5, ratio: 1.5, index: 0.4 });
    const v = s.voice(0.05 * vol, pan, 0.1);
    const a = v.gain(0);
    perc(a.gain, t, 1, 0.002, 0.03);
    v.noise('pink', t, t + 0.05, v.filter('bandpass', 1100 * p, 1.4, a));
    v.done();
  },

  // Steamer lid rattle: a little run of soft bamboo-and-tin taps.
  rattle(s, t, p, pan, vol) {
    let tt = t;
    const n = 6 + Math.floor(Math.random() * 5);
    for (let i = 0; i < n; i++) {
      const k = 1 - i / (n + 2);
      const v = s.voice(0.22 * vol * k, pan, 0.08);
      const a = v.gain(0);
      perc(a.gain, tt, 1, 0.002, 0.03);
      v.noise('pink', tt, tt + 0.05, v.filter('bandpass', rand(1900, 2600) * p, 1.6, a));
      const pg = v.gain(0);
      const end = perc(pg.gain, tt, 0.25, 0.002, 0.05);
      v.osc('sine', rand(1300, 1500) * p, tt, end, pg);
      v.done();
      tt += rand(0.04, 0.09);
    }
  },

  // Tuki's "eep": a single round little squeak, a touch lower than the companion's.
  eep(s, t, p, pan, vol) {
    const v = s.voice(0.1 * vol, pan, 0.12);
    const a = v.gain(0, v.filter('lowpass', 2600, 0.7));
    const end = swell(a.gain, t, 1, 0.012, 0.07, 0.09);
    const o = v.osc('sine', 700 * p, t, end, a);
    o.frequency.setValueAtTime(700 * p, t);
    o.frequency.exponentialRampToValueAtTime(1120 * p, t + 0.07);
    o.frequency.exponentialRampToValueAtTime(920 * p, t + 0.16);
    v.osc('sine', 18, t, end, v.paramGain(o.frequency, 22 * p));
    v.done();
  },

  // Doko-tuck rustle: a soft wicker crinkle and a tiny settle.
  rustle(s, t, p, pan, vol) {
    const v = s.voice(0.18 * vol, pan, 0.05);
    const a = v.gain(0, v.filter('lowpass', 4500, 0.6));
    swell(a.gain, t, 1, 0.03, 0.18, 0.14);
    const jit = v.gain(0.5, a);
    for (let i = 0; i < 14; i++) {
      const tt = t + rand(0, 0.32);
      jit.gain.setValueAtTime(0.5, tt);
      jit.gain.linearRampToValueAtTime(rand(0.8, 1.2), tt + 0.006);
      jit.gain.linearRampToValueAtTime(0.5, tt + 0.02);
    }
    v.noise('pink', t, t + 0.42, v.filter('bandpass', 3000 * p, 0.9, jit));
    const th = v.gain(0);
    const end = perc(th.gain, t + 0.3, 0.6, 0.004, 0.08);
    const o = v.osc('sine', 180 * p, t + 0.3, end, th);
    glide(o.frequency, t + 0.3, 180 * p, 110 * p, 0.07);
    v.done();
  },

  // Ghum "fwump": a soft puff of air as the leaf hood settles.
  fwump(s, t, p, pan, vol) {
    const v = s.voice(0.16 * vol, pan, 0.08);
    const a = v.gain(0);
    swell(a.gain, t, 1, 0.03, 0.02, 0.22);
    const lp = v.filter('lowpass', 600, 0.8, a);
    glide(lp.frequency, t, 700 * p, 160 * p, 0.22);
    v.noise('pink', t, t + 0.32, lp);
    const b = v.gain(0);
    const end = perc(b.gain, t, 0.5, 0.01, 0.16);
    const o = v.osc('sine', 120 * p, t, end, b);
    glide(o.frequency, t, 120 * p, 70 * p, 0.14);
    v.done();
  },

  // Kopila's curl "tuck": a tiny soft tuck.
  tuck(s, t, p, pan, vol) {
    const v = s.voice(0.15 * vol, pan, 0.06);
    const a = v.gain(0, v.filter('lowpass', 1800, 0.7));
    const end = perc(a.gain, t, 1, 0.003, 0.08);
    const o = v.osc('triangle', 620 * p, t, end, a);
    glide(o.frequency, t, 620 * p, 420 * p, 0.06);
    const k = v.gain(0);
    perc(k.gain, t, 0.2, 0.001, 0.012);
    v.noise('pink', t, t + 0.03, v.filter('bandpass', 2200, 1.2, k));
    v.done();
  },

  // Mica twinkle: two or three tiny glassy glints.
  twinkle(s, t, p, pan, vol) {
    const n = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n; i++) {
      bell(s, t + i * rand(0.07, 0.12), mtof(pick([93, 95, 98, 100])) * p, { vol: 0.05 * vol, pan: pan + rand(-0.3, 0.3), wet: 0.6, decay: rand(0.5, 0.8), ratio: 3.5, index: 0.6 });
    }
  },

  // The guardian's gill-mist breath: a long, soft, low exhale.
  breath(s, t, p, pan, vol) {
    const v = s.voice(0.14 * vol, pan, 0.4);
    const a = v.gain(0);
    swell(a.gain, t, 1, 0.4, 0.3, 0.9);
    const lp = v.filter('lowpass', 900, 0.6, a);
    lp.frequency.setValueAtTime(500 * p, t);
    lp.frequency.linearRampToValueAtTime(950 * p, t + 0.45);
    lp.frequency.linearRampToValueAtTime(380 * p, t + 1.6);
    v.noise('pink', t, t + 1.75, lp);
    v.done();
  },

  // Sparkle: a shimmer of high pentatonic blips.
  sparkle(s, t, p, pan, vol) {
    for (let i = 0; i < 6; i++) {
      bell(s, t + rand(0, 0.45), mtof(pick(PENTA_HI) + 2) * p, { vol: rand(0.035, 0.055) * vol, pan: pan + rand(-0.5, 0.5), wet: 0.55, decay: rand(0.2, 0.35), ratio: 2, index: 0.3 });
    }
  },
};

const lastPlayed = new Map<SfxId, number>();
/** Minimum gap between two plays of the same sound (seconds). */
const MIN_GAP: Partial<Record<SfxId, number>> = { reel: 0.5, sizzle: 1.0, bubble: 0.8, kettle: 1.2, rumble: 1.0, fanfare: 0.4, splash: 0.15, stir: 0.4, breath: 1.0, rattle: 0.3 };

/**
 * Play one effect on a synth at time t (defaults to now). Light random pitch
 * variation keeps repeats from sounding mechanical.
 */
export function renderSfx(s: Synth, id: SfxId, o: { vol?: number; pan?: number; pitch?: number } = {}, at?: number): boolean {
  const t = at ?? s.ctx.currentTime + 0.005;
  const gap = MIN_GAP[id] ?? 0.035;
  const last = lastPlayed.get(id);
  if (at === undefined && last !== undefined && t - last < gap && t >= last) return false;
  if (s.busy() && id !== 'fanfare') return false;
  lastPlayed.set(id, t);
  const vary = id === 'step' || id === 'pop' || id === 'plip' || id === 'tok' || id === 'squish' ? rand(0.96, 1.04) : 1;
  const p = Math.max(0.25, Math.min(4, (o.pitch ?? 1) * vary));
  const vol = Math.max(0, Math.min(2, o.vol ?? 1));
  const pan = Math.max(-1, Math.min(1, o.pan ?? 0));
  if (vol <= 0) return false;
  R[id](s, t, p, pan, vol);
  return true;
}
