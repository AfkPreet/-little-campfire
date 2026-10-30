/**
 * Generative lo-fi fallback score (spec section 9), used for any mood whose
 * music file is missing. D major, Imaj9 - vi9 - IVmaj9 - V6/9, soft FM keys,
 * sparse kalimba plucks on the pentatonic, an optional breathy flute lead,
 * faint vinyl, brushed drums by day only.
 *
 * Scheduling is a lookahead scheduler: the engine calls tick(until) from a
 * setTimeout loop and every note is placed on the AudioContext clock. No
 * per-frame work.
 */
import { type NoiseBank, type Out, Synth, glide, loopify, mtof, perc, pick, rand, swell } from './sfx';

export type ScoreVariant = 'day' | 'rain' | 'night' | 'finale';
export type LeadVoice = 'flute' | 'none';

let leadVoice: LeadVoice = 'flute';

/** Enable the lead instrument once the world's lead is known (default flute). */
export function setLeadVoice(v: LeadVoice): void {
  leadVoice = v;
}

export function getLeadVoice(): LeadVoice {
  return leadVoice;
}

interface VariantCfg {
  bpm: number;
  barsPerChord: number;
  drums: boolean;
  bass: number;
  keys: number;
  keysLP: number;
  /** Probability of a kalimba pluck per eighth note. */
  kalimba: number;
  /** Probability of starting a lead phrase per bar. */
  lead: number;
  leadLow: boolean;
  wet: number;
  swing: number;
  /** Comping density 0..1. */
  comp: number;
  vinyl: number;
  /** Finale: kalimba arpeggios. */
  arps: boolean;
}

const CFG: Record<ScoreVariant, VariantCfg> = {
  day: { bpm: 76, barsPerChord: 1, drums: true, bass: 1, keys: 1, keysLP: 2300, kalimba: 0.15, lead: 0.24, leadLow: false, wet: 0.22, swing: 0.16, comp: 1, vinyl: 1, arps: false },
  rain: { bpm: 72, barsPerChord: 1, drums: false, bass: 0.7, keys: 0.85, keysLP: 1500, kalimba: 0.11, lead: 0.16, leadLow: false, wet: 0.48, swing: 0.14, comp: 0.55, vinyl: 1.25, arps: false },
  night: { bpm: 66, barsPerChord: 2, drums: false, bass: 0.55, keys: 0.82, keysLP: 1300, kalimba: 0.07, lead: 0.13, leadLow: true, wet: 0.4, swing: 0.12, comp: 0.3, vinyl: 0.8, arps: false },
  finale: { bpm: 64, barsPerChord: 2, drums: false, bass: 0.8, keys: 1, keysLP: 2000, kalimba: 0.12, lead: 0.42, leadLow: false, wet: 0.52, swing: 0.1, comp: 0.5, vinyl: 0.5, arps: true },
};

/** Rootless voicings, smooth voice leading (MIDI). */
const CHORDS: { root: number; keys: number[]; tones: number[] }[] = [
  { root: 38, keys: [54, 57, 61, 64], tones: [2, 6, 9, 1] }, // Dmaj9  (pitch classes: D F# A C#)
  { root: 35, keys: [57, 61, 62, 66], tones: [11, 2, 6, 9] }, // Bm9
  { root: 43, keys: [54, 57, 59, 62], tones: [7, 11, 2, 6] }, // Gmaj9
  { root: 45, keys: [54, 59, 61, 64], tones: [9, 1, 4, 6] }, // A6/9
];

/** D major pentatonic (D E F# A B). */
const PENTA_PC = [2, 4, 6, 9, 11];
function pentaRange(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let m = lo; m <= hi; m++) if (PENTA_PC.includes(m % 12)) out.push(m);
  return out;
}
const KALIMBA_NOTES = pentaRange(62, 83);
const LEAD_HI = pentaRange(69, 86);
const LEAD_LO = pentaRange(62, 79);

/** A pre-generated vinyl loop: faint hiss plus sparse soft crackles. */
function makeVinyl(ctx: BaseAudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * 5);
  const fade = Math.floor(sr * 0.05);
  const buf = ctx.createBuffer(1, len, sr);
  const raw = new Float32Array(len + fade);
  let lp = 0;
  for (let i = 0; i < raw.length; i++) {
    lp += 0.25 * ((Math.random() * 2 - 1) - lp);
    raw[i] = lp * 0.18;
  }
  const pops = 5 * 9;
  for (let k = 0; k < pops; k++) {
    const at = fade + Math.floor(Math.random() * (len - fade - 200));
    const amp = Math.random() < 0.12 ? rand(0.5, 0.8) : rand(0.08, 0.3);
    const sign = Math.random() < 0.5 ? -1 : 1;
    const n = 3 + Math.floor(Math.random() * 18);
    for (let j = 0; j < n; j++) raw[at + j] += sign * amp * Math.exp(-j / 3) * (j % 2 ? -0.6 : 1);
  }
  loopify(buf.getChannelData(0), raw, fade);
  return buf;
}

type Ev = (t: number) => void;

export class Score {
  /** Overall score level; the music director fades this. */
  readonly out: GainNode;
  private readonly ctx: BaseAudioContext;
  private cfg: VariantCfg;
  private variant: ScoreVariant;
  private pending: ScoreVariant | null = null;
  private running = false;
  private nextStep = 0;
  private step = 0;
  private bar = 0;
  private events = new Map<number, Ev[]>();
  private absStep = 0;

  private keysSyn: Synth;
  private bassSyn: Synth;
  private pluckSyn: Synth;
  private leadSyn: Synth;
  private drumSyn: Synth;
  private keysLP: BiquadFilterNode;
  private wetLevel: GainNode;
  private vinylGain: GainNode;
  private vinylSrc: AudioBufferSourceNode | null = null;
  private vinylBuf: AudioBuffer;
  private echo: DelayNode;
  private wow: GainNode;
  private wowOsc: OscillatorNode | null = null;
  private tremOsc: OscillatorNode | null = null;
  private trem: GainNode;
  private lastKalimba = 74;
  private leadBusyUntil = 0;
  private persistent: AudioNode[] = [];
  private vinylIn: AudioNode;
  private tremDepth: GainNode;

  constructor(ctx: BaseAudioContext, dest: Out, noise: NoiseBank, variant: ScoreVariant = 'day') {
    this.ctx = ctx;
    this.variant = variant;
    this.cfg = CFG[variant];
    const g = (v: number) => {
      const n = ctx.createGain();
      n.gain.value = v;
      this.persistent.push(n);
      return n;
    };
    this.out = g(0);
    this.out.connect(dest.dry);
    this.wetLevel = g(this.cfg.wet);
    this.out.connect(this.wetLevel);
    this.wetLevel.connect(dest.wet);

    // Keys: FM e-piano -> felt lowpass -> gentle tremolo.
    const keysIn = g(1);
    this.keysLP = ctx.createBiquadFilter();
    this.keysLP.type = 'lowpass';
    this.keysLP.frequency.value = this.cfg.keysLP;
    this.keysLP.Q.value = 0.5;
    this.trem = g(1);
    keysIn.connect(this.keysLP);
    this.keysLP.connect(this.trem);
    this.trem.connect(this.out);
    const keysWet = g(0.35);
    keysIn.connect(keysWet);
    this.keysSyn = new Synth(ctx, { dry: keysIn, wet: keysWet }, noise);
    keysWet.connect(this.wetLevel);

    // Bass.
    const bassIn = g(1);
    const bassLP = ctx.createBiquadFilter();
    bassLP.type = 'lowpass';
    bassLP.frequency.value = 340;
    bassIn.connect(bassLP);
    bassLP.connect(this.out);
    this.persistent.push(bassLP);
    this.bassSyn = new Synth(ctx, { dry: bassIn, wet: g(0) }, noise);

    // Plucks with a soft dotted-eighth echo.
    const pluckIn = g(1);
    pluckIn.connect(this.out);
    this.echo = ctx.createDelay(2);
    this.echo.delayTime.value = this.beat() * 0.75;
    const fb = g(0.3);
    const echoLP = ctx.createBiquadFilter();
    echoLP.type = 'lowpass';
    echoLP.frequency.value = 2200;
    const echoSend = g(0.35);
    pluckIn.connect(echoSend);
    echoSend.connect(this.echo);
    this.echo.connect(echoLP);
    echoLP.connect(fb);
    fb.connect(this.echo);
    echoLP.connect(this.out);
    this.persistent.push(this.echo, echoLP);
    const pluckWet = g(0.5);
    this.pluckSyn = new Synth(ctx, { dry: pluckIn, wet: pluckWet }, noise);
    pluckWet.connect(this.wetLevel);

    // Lead.
    const leadIn = g(1);
    leadIn.connect(this.out);
    const leadWet = g(0.6);
    leadWet.connect(this.wetLevel);
    this.leadSyn = new Synth(ctx, { dry: leadIn, wet: leadWet }, noise);

    // Drums.
    const drumIn = g(1);
    drumIn.connect(this.out);
    const drumWet = g(0.2);
    drumWet.connect(this.wetLevel);
    this.drumSyn = new Synth(ctx, { dry: drumIn, wet: drumWet }, noise);

    // Vinyl bed.
    this.vinylBuf = makeVinyl(ctx);
    this.vinylGain = g(0.05 * this.cfg.vinyl);
    const vhp = ctx.createBiquadFilter();
    vhp.type = 'highpass';
    vhp.frequency.value = 500;
    const vlp = ctx.createBiquadFilter();
    vlp.type = 'lowpass';
    vlp.frequency.value = 5200;
    vhp.connect(vlp);
    vlp.connect(this.vinylGain);
    this.vinylGain.connect(this.out);
    this.persistent.push(vhp, vlp);
    this.vinylIn = vhp;

    // Tape wow: one slow LFO shared by every keys carrier's detune.
    this.wow = g(5);
    // Suitcase-style tremolo depth: gain 1 +- 0.1.
    this.tremDepth = g(0.1);
    this.tremDepth.connect(this.trem.gain);
  }

  private beat(cfg = this.cfg): number {
    return 60 / cfg.bpm;
  }

  isRunning(): boolean {
    return this.running;
  }

  getVariant(): ScoreVariant {
    return this.pending ?? this.variant;
  }

  /** Change the variant at the next bar line; filters glide over 4 s. */
  setVariant(v: ScoreVariant): void {
    if (v === this.getVariant()) return;
    if (!this.running) {
      this.variant = v;
      this.cfg = CFG[v];
      this.applyCfg(0.05);
      return;
    }
    this.pending = v;
  }

  private applyCfg(tc: number): void {
    const t = this.ctx.currentTime;
    this.keysLP.frequency.setTargetAtTime(this.cfg.keysLP, t, tc);
    this.wetLevel.gain.setTargetAtTime(this.cfg.wet, t, tc);
    this.vinylGain.gain.setTargetAtTime(0.05 * this.cfg.vinyl, t, tc);
    this.echo.delayTime.setTargetAtTime(this.beat() * 0.75, t, tc);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    const t = this.ctx.currentTime + 0.12;
    this.nextStep = t;
    this.step = 0;
    this.bar = 0;
    this.absStep = 0;
    this.events.clear();
    this.leadBusyUntil = 0;
    const vs = this.ctx.createBufferSource();
    vs.buffer = this.vinylBuf;
    vs.loop = true;
    vs.connect(this.vinylIn);
    vs.start(t, Math.random() * 4);
    this.vinylSrc = vs;
    const wo = this.ctx.createOscillator();
    wo.frequency.value = 0.33;
    wo.connect(this.wow);
    wo.start(t);
    this.wowOsc = wo;
    const tr = this.ctx.createOscillator();
    tr.frequency.value = 4.2;
    tr.connect(this.tremDepth);
    tr.start(t);
    this.tremOsc = tr;
  }

  /** Stop scheduling and release persistent sources (call after fading out). */
  stop(): void {
    if (!this.running) return;
    this.running = false;
    const t = this.ctx.currentTime;
    for (const s of [this.vinylSrc, this.wowOsc, this.tremOsc]) {
      try {
        s?.stop(t + 0.05);
      } catch {
        /* already stopped */
      }
    }
    this.vinylSrc = null;
    this.wowOsc = null;
    this.tremOsc = null;
    this.events.clear();
  }

  /** Schedule every step that starts before `until` (AudioContext time). */
  tick(until: number): void {
    if (!this.running) return;
    const now = this.ctx.currentTime;
    if (this.nextStep < now - 0.2) {
      // We fell behind (tab throttled or a long hitch): resync instead of bursting.
      this.nextStep = now + 0.05;
    }
    let guard = 0;
    while (this.nextStep < until && guard++ < 64) {
      this.scheduleStep(this.nextStep);
      const sixteenth = this.beat() / 4;
      this.nextStep += sixteenth;
      this.step = (this.step + 1) % 16;
      this.absStep++;
      if (this.step === 0) this.bar++;
    }
  }

  private at(step: number, t: number): number {
    // Swing the off 16ths and off 8ths a touch.
    const sixteenth = this.beat() / 4;
    const swing = step % 2 === 1 ? this.cfg.swing * sixteenth : 0;
    return t + swing;
  }

  private queue(absStep: number, fn: Ev): void {
    const list = this.events.get(absStep);
    if (list) list.push(fn);
    else this.events.set(absStep, [fn]);
  }

  private scheduleStep(t: number): void {
    if (this.step === 0) {
      if (this.pending) {
        this.variant = this.pending;
        this.cfg = CFG[this.pending];
        this.pending = null;
        this.applyCfg(1.4);
      }
      this.planBar(t);
    }
    const evs = this.events.get(this.absStep);
    if (evs) {
      this.events.delete(this.absStep);
      const tt = this.at(this.step, t);
      for (const e of evs) e(tt);
    }
  }

  private chordAt(bar: number) {
    return CHORDS[Math.floor(bar / this.cfg.barsPerChord) % CHORDS.length];
  }

  /** Decide everything that happens in the bar starting now. */
  private planBar(t: number): void {
    const c = this.cfg;
    const bar = this.bar;
    const chord = this.chordAt(bar);
    const firstOfChord = bar % c.barsPerChord === 0;
    const base = this.absStep;
    const beat = this.beat();
    const cycle = bar % 16;

    // --- Keys ---------------------------------------------------------------
    if (firstOfChord) {
      const roll = c.barsPerChord > 1 ? 0.06 : 0.022;
      const len = beat * 4 * c.barsPerChord * (c.barsPerChord > 1 ? 0.95 : 0.9);
      this.queue(base, (tt) => chord.keys.forEach((m, i) => this.key(tt + i * roll, m, len, (0.07 - i * 0.004) * c.keys)));
      if (c.arps) this.queue(base + 8, (tt) => this.key(tt, chord.keys[3] + 12, beat * 3, 0.03 * c.keys));
    }
    if (c.comp >= 0.9) {
      if (Math.random() < 0.6) this.queue(base + 6, (tt) => chord.keys.slice(1).forEach((m, i) => this.key(tt + i * 0.015, m, beat * 1.2, 0.04 * c.keys)));
      if (Math.random() < 0.4) this.queue(base + 10, (tt) => chord.keys.slice(2).forEach((m, i) => this.key(tt + i * 0.015, m, beat, 0.034 * c.keys)));
    } else if (c.comp >= 0.5) {
      if (Math.random() < 0.45) this.queue(base + 8, (tt) => chord.keys.slice(1).forEach((m, i) => this.key(tt + i * 0.02, m, beat * 2, 0.038 * c.keys)));
    } else if (!firstOfChord && Math.random() < 0.35) {
      this.queue(base + 8, (tt) => this.key(tt, chord.keys[3] + (Math.random() < 0.5 ? 0 : 2), beat * 2.5, 0.035 * c.keys));
    }

    // --- Bass ---------------------------------------------------------------
    if (firstOfChord) {
      const len = c.barsPerChord > 1 ? beat * 6 : beat * 1.6;
      this.queue(base, (tt) => this.bass(tt, chord.root, len, 0.075 * c.bass));
    }
    if (c.barsPerChord === 1) {
      if (Math.random() < 0.5) this.queue(base + 10, (tt) => this.bass(tt, chord.root + (Math.random() < 0.5 ? 7 : 12), beat * 0.9, 0.075 * c.bass));
      const next = this.chordAt(bar + 1);
      if (Math.random() < 0.3 && next !== chord) this.queue(base + 14, (tt) => this.bass(tt, next.root + (next.root > chord.root ? -2 : 2), beat * 0.45, 0.055 * c.bass));
    }

    // --- Kalimba ------------------------------------------------------------
    if (c.arps && cycle % 2 === 1) {
      const notes = [...chord.keys.map((m) => m + 12), chord.keys[1] + 24];
      notes.forEach((m, i) => this.queue(base + i * 2 + 2, (tt) => this.kalimba(tt, nearestPenta(m), 0.045)));
    } else {
      for (let s = 0; s < 16; s += 2) {
        if (Math.random() < c.kalimba * (s % 4 === 0 ? 1.2 : 0.8)) {
          this.queue(base + s, (tt) => this.kalimba(tt, this.nextKalimba(chord.tones, s % 4 === 0), rand(0.035, 0.055)));
        }
      }
    }

    // --- Lead ---------------------------------------------------------------
    if (leadVoice === 'flute' && t > this.leadBusyUntil && Math.random() < c.lead) {
      this.planPhrase(base, t, chord.tones);
    }

    // --- Drums (day only) ---------------------------------------------------
    if (c.drums) {
      const breathe = cycle >= 12;
      if (!breathe || cycle === 15) {
        this.queue(base, (tt) => this.kick(tt, 1));
        if (Math.random() < 0.7) this.queue(base + 10, (tt) => this.kick(tt, 0.75));
      }
      this.queue(base + 4, (tt) => this.brush(tt, 1));
      this.queue(base + 12, (tt) => this.brush(tt, 1));
      for (let s = 0; s < 16; s += 2) {
        if (Math.random() < 0.85) this.queue(base + s, (tt) => this.shaker(tt, s % 4 === 2 ? 1 : 0.6));
      }
      if (cycle === 7 || cycle === 15) this.queue(base + 14, (tt) => this.brush(tt, 0.6));
    }
  }

  private nextKalimba(tones: number[], strong: boolean): number {
    let cands = KALIMBA_NOTES.filter((m) => Math.abs(m - this.lastKalimba) <= 5 && m !== this.lastKalimba);
    if (strong) {
      const ct = cands.filter((m) => tones.includes(m % 12));
      if (ct.length) cands = ct;
    }
    if (!cands.length) cands = KALIMBA_NOTES;
    const m = pick(cands);
    this.lastKalimba = m;
    return m;
  }

  private planPhrase(base: number, t: number, tones: number[]): void {
    const pool = this.cfg.leadLow ? LEAD_LO : LEAD_HI;
    const n = 3 + Math.floor(Math.random() * 4);
    let idx = Math.floor(pool.length * rand(0.3, 0.7));
    let step = base + pick([0, 2, 4, 8]);
    const sixteenth = this.beat() / 4;
    const slow = this.cfg.barsPerChord > 1 ? 2 : 1;
    let endT = t;
    for (let i = 0; i < n; i++) {
      const last = i === n - 1;
      const durSteps = (last ? pick([8, 12]) : pick([2, 4, 4, 6])) * slow;
      idx = Math.max(0, Math.min(pool.length - 1, idx + pick([-2, -1, -1, 1, 1, 2])));
      let m = pool[idx];
      if (last) {
        const ct = pool.filter((x) => tones.includes(x % 12));
        if (ct.length) m = ct.reduce((a, b) => (Math.abs(b - m) < Math.abs(a - m) ? b : a));
      }
      const dur = durSteps * sixteenth * 0.92;
      const vel = (last ? 0.05 : 0.055) * (this.variant === 'rain' ? 0.8 : 1);
      this.queue(step, (tt) => this.flute(tt, m, dur, vel));
      step += durSteps;
      endT = t + (step - base) * sixteenth;
    }
    // Leave room to breathe before the next phrase.
    this.leadBusyUntil = endT + this.beat() * 4 * rand(2, 4);
  }

  // ---------------------------------------------------------------------------
  // Instruments
  // ---------------------------------------------------------------------------

  /** Soft FM electric piano (felt Rhodes). */
  private key(t: number, m: number, dur: number, vel: number): void {
    const s = this.keysSyn;
    const f = mtof(m);
    const v = s.voice(vel, 0, 1);
    const rel = 0.5;
    const end = t + dur + rel + 0.05;
    const amp = v.gain(0);
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(1, t + 0.008);
    amp.gain.setTargetAtTime(0.35, t + 0.008, 0.9);
    amp.gain.setTargetAtTime(0.0001, t + dur, rel / 4);
    amp.gain.setValueAtTime(0, end - 0.01);
    const car = v.osc('sine', f, t, end, amp);
    car.detune.value = rand(-4, 4);
    v.modulate(this.wow, car.detune);
    const mg = v.paramGain(car.frequency);
    v.osc('sine', f, t, end, mg);
    mg.gain.setValueAtTime(0, t);
    mg.gain.linearRampToValueAtTime(f * 1.6, t + 0.004);
    mg.gain.setTargetAtTime(f * 0.18, t + 0.004, 0.22);
    // Tine: a short bell-like octave-and-a-fifth partial.
    const tine = v.gain(0);
    perc(tine.gain, t, 0.07, 0.002, 0.25);
    v.osc('sine', f * 3, t, Math.min(end, t + 0.4), tine);
    v.done();
  }

  private bass(t: number, m: number, dur: number, vel: number): void {
    const v = this.bassSyn.voice(vel, 0, 0);
    const f = mtof(m);
    const end = t + dur + 0.35;
    const amp = v.gain(0);
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(1, t + 0.025);
    amp.gain.setTargetAtTime(0.55, t + 0.03, 0.35);
    amp.gain.setTargetAtTime(0.0001, t + dur, 0.08);
    amp.gain.setValueAtTime(0, end - 0.01);
    v.osc('sine', f, t, end, amp);
    v.osc('sine', f * 2, t, end, v.gain(0.45, amp));
    v.osc('triangle', f * 3, t, end, v.gain(0.06, amp));
    v.done();
  }

  private kalimba(t: number, m: number, vel: number): void {
    const v = this.pluckSyn.voice(vel, rand(-0.35, 0.35), 1);
    const f = mtof(m);
    const amp = v.gain(0);
    const end = perc(amp.gain, t, 1, 0.003, 1.3);
    v.osc('sine', f, t, end, amp);
    const ping = v.gain(0);
    perc(ping.gain, t, 0.12, 0.002, 0.07);
    v.osc('sine', f * 5.95, t, t + 0.12, ping);
    const thumb = v.gain(0);
    perc(thumb.gain, t, 0.1, 0.002, 0.012);
    v.noise('pink', t, t + 0.04, v.filter('lowpass', 2600, 0.7, thumb));
    v.done();
  }

  /** Breathy flute: sine + band-passed breath noise + delayed vibrato. */
  private flute(t: number, m: number, dur: number, vel: number): void {
    const s = this.leadSyn;
    const f = mtof(m);
    const v = s.voice(vel, rand(-0.15, 0.15), 1);
    const end = t + dur + 0.3;
    const lp = v.filter('lowpass', 3400, 0.6);
    const amp = v.gain(0, lp);
    swell(amp.gain, t, 1, 0.09, Math.max(0.05, dur - 0.09), 0.22);
    const o = v.osc('sine', f, t, end, amp);
    const body = v.gain(0.12, amp);
    const o2 = v.osc('triangle', f, t, end, body);
    // Vibrato fades in after the attack.
    const vib = v.paramGain(o.frequency);
    vib.connect(o2.frequency);
    v.osc('sine', rand(4.6, 5.4), t, end, vib);
    vib.gain.setValueAtTime(0, t);
    vib.gain.setValueAtTime(0, t + Math.min(0.25, dur * 0.4));
    vib.gain.linearRampToValueAtTime(f * 0.007, t + Math.min(0.7, dur));
    // A tiny scoop up into the note.
    glide(o.frequency, t, f * 0.985, f, 0.06);
    // Breath.
    const br = v.gain(0, lp);
    br.gain.setValueAtTime(0, t);
    br.gain.linearRampToValueAtTime(0.5, t + 0.04);
    br.gain.setTargetAtTime(0.22, t + 0.05, 0.12);
    br.gain.setTargetAtTime(0.0001, t + dur, 0.06);
    v.noise('pink', t, end, v.filter('bandpass', f, 3.2, br));
    const chiff = v.gain(0);
    perc(chiff.gain, t, 0.12, 0.004, 0.05);
    v.noise('white', t, t + 0.08, v.filter('bandpass', f * 3, 1.2, chiff));
    v.done();
  }

  private kick(t: number, k: number): void {
    const v = this.drumSyn.voice(0.12 * k, 0, 0);
    const amp = v.gain(0);
    const end = perc(amp.gain, t, 1, 0.004, 0.24);
    const o = v.osc('sine', 95, t, end, amp);
    glide(o.frequency, t, 95, 44, 0.12);
    v.done();
  }

  private brush(t: number, k: number): void {
    const v = this.drumSyn.voice(0.045 * k, 0.1, 1);
    const amp = v.gain(0);
    swell(amp.gain, t, 1, 0.014, 0.02, 0.17);
    v.noise('pink', t, t + 0.25, v.filter('bandpass', 2300, 0.6, amp));
    v.done();
  }

  private shaker(t: number, k: number): void {
    const v = this.drumSyn.voice(0.02 * k, -0.2, 0);
    const amp = v.gain(0, v.filter('lowpass', 9000, 0.5));
    perc(amp.gain, t, 1, 0.008, 0.05);
    v.noise('white', t, t + 0.08, v.filter('highpass', 6000, 0.6, amp));
    v.done();
  }

  /** Free every persistent node (when the engine tears down). */
  dispose(): void {
    this.stop();
    for (const n of this.persistent) {
      try {
        n.disconnect();
      } catch {
        /* gone */
      }
    }
  }
}

function nearestPenta(m: number): number {
  for (let d = 0; d < 3; d++) {
    if (PENTA_PC.includes((m + d) % 12)) return m + d;
    if (PENTA_PC.includes((m - d + 12) % 12)) return m - d;
  }
  return m;
}
