/**
 * Ambience beds (spec section 9): birdsong by day, crickets at night, rain
 * (open and muffled in the tent doorway), fire crackle, wind with slow gusts,
 * water lapping, and a soft indoor room tone for the shop. Every bed fades by
 * a target level; beds that sit at zero for a while stop their sources so the
 * idle cost is nothing. Random events are placed by a lookahead scheduler
 * (the engine calls tick(until)), never per frame.
 */
import { type NoiseBank, type Out, Synth, glide, holdAt, perc, pick, rand, swell } from './sfx';

export type AmbienceScene = 'title' | 'intro' | 'camp' | 'shop' | 'cooking' | 'journal' | 'album' | 'silent';

export interface AmbienceCtx {
  scene: AmbienceScene;
  /** Day progress 0..1 dawn to dusk; >= 1 is night. */
  p: number;
  raining: boolean;
  /** Resting in the tent doorway: rain becomes muffled and cozy. */
  inTent: boolean;
  /** 0..1 */
  nearFire: number;
  /** 0..1 */
  nearWater: number;
}

const clamp01 = (v: number) => (v > 1 ? 1 : v < 0 ? 0 : Number.isFinite(v) ? v : 0);

/** Piecewise-linear curve lookup. */
function curve(pts: [number, number][], x: number): number {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    if (x <= x1) {
      const [x0, y0] = pts[i - 1];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return pts[pts.length - 1][1];
}

/** Birds: a dawn chorus, quieter through the day, gone by late dusk. */
const BIRDS: [number, number][] = [
  [0, 0.75],
  [0.05, 1],
  [0.14, 0.95],
  [0.4, 0.62],
  [0.65, 0.5],
  [0.82, 0.38],
  [0.93, 0.05],
  [0.97, 0],
];
/** Crickets: begin at dusk, full at night, a few linger at first light. */
const CRICKETS: [number, number][] = [
  [0, 0.3],
  [0.06, 0],
  [0.8, 0],
  [0.9, 0.45],
  [1, 1],
];

const SCENE_LEVEL: Record<AmbienceScene, number> = { camp: 1, title: 0.75, intro: 0.45, shop: 0.4, cooking: 0.8, journal: 0.5, album: 0.35, silent: 0 };
const SCENE_LP: Record<AmbienceScene, number> = { camp: 16000, title: 16000, intro: 7000, shop: 650, cooking: 16000, journal: 3000, album: 2400, silent: 16000 };

abstract class Bed {
  readonly gain: GainNode;
  running = false;
  target = 0;
  private applied = -1;
  private zeroSince = 0;
  protected nodes: AudioNode[] = [];
  protected sources: AudioScheduledSourceNode[] = [];

  constructor(
    protected readonly ctx: BaseAudioContext,
    protected readonly noise: NoiseBank,
    dest: AudioNode,
    protected readonly vol: number,
  ) {
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    this.gain.connect(dest);
  }

  set(target: number, tc: number): void {
    const v = clamp01(target);
    const now = this.ctx.currentTime;
    if (v > 0.001 && !this.running) {
      this.running = true;
      this.start(now);
    }
    if (Math.abs(v - this.applied) < 0.006 && !(v === 0 && this.applied !== 0)) return;
    this.applied = v;
    this.target = v;
    if (v === 0) this.zeroSince = now;
    this.gain.gain.setTargetAtTime(v * this.vol, now, tc);
  }

  /** Called from the scheduler: stop sources after a long silence. */
  maintain(now: number): void {
    if (this.running && this.target <= 0.001 && now - this.zeroSince > 8) {
      this.running = false;
      this.stop(now);
    }
  }

  protected loop(kind: keyof NoiseBank, dest: AudioNode, t: number, rate = 1): AudioBufferSourceNode {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise[kind];
    s.loop = true;
    s.playbackRate.value = rate;
    s.connect(dest);
    s.start(t, Math.random() * (s.buffer.duration - 0.1));
    this.sources.push(s);
    return s;
  }

  protected node<T extends AudioNode>(n: T): T {
    this.nodes.push(n);
    return n;
  }

  protected filt(type: BiquadFilterType, f: number, q = 0.707): BiquadFilterNode {
    const n = this.ctx.createBiquadFilter();
    n.type = type;
    n.frequency.value = f;
    n.Q.value = q;
    return this.node(n);
  }

  protected g(v: number): GainNode {
    const n = this.ctx.createGain();
    n.gain.value = v;
    return this.node(n);
  }

  protected panner(v: number): AudioNode {
    if (typeof this.ctx.createStereoPanner !== 'function') return this.g(1);
    const p = this.ctx.createStereoPanner();
    p.pan.value = v;
    return this.node(p);
  }

  abstract start(t: number): void;

  stop(t: number): void {
    for (const s of this.sources) {
      try {
        s.stop(t + 0.05);
      } catch {
        /* already stopped */
      }
    }
    this.sources = [];
    const nodes = this.nodes;
    this.nodes = [];
    // Disconnect a moment later so the tails are silent first.
    setTimeout(() => {
      for (const n of nodes) {
        try {
          n.disconnect();
        } catch {
          /* gone */
        }
      }
    }, 200);
  }

  tick(_until: number): void {}
}

// ---------------------------------------------------------------------------

class WindBed extends Bed {
  private gust!: GainNode;
  private lp!: BiquadFilterNode;
  private nextGust = 0;
  /** External gust control (scenes sync visuals): auto gusts off. */
  external = false;

  start(t: number): void {
    this.lp = this.filt('lowpass', 380, 0.5);
    this.gust = this.g(0.55);
    const pan = this.panner(0);
    this.lp.connect(this.gust);
    this.gust.connect(pan);
    pan.connect(this.gain);
    this.loop('brown', this.lp, t);
    // A second, airier layer for a little whistle in the gusts.
    const air = this.g(0.12);
    const bp = this.filt('bandpass', 900, 0.8);
    bp.connect(air);
    air.connect(this.gust);
    this.loop('pink', bp, t);
    // Slow stereo drift.
    if ('pan' in pan) {
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.05;
      const d = this.g(0.3);
      lfo.connect(d);
      d.connect((pan as StereoPannerNode).pan);
      lfo.start(t);
      this.sources.push(lfo);
    }
    this.nextGust = t + rand(3, 8);
  }

  doGust(t: number, s: number): void {
    if (!this.running) return;
    const k = clamp01(s);
    holdAt(this.gust.gain, t);
    holdAt(this.lp.frequency, t);
    const up = rand(1.8, 2.6);
    const hold = rand(0.5, 1.2);
    const down = rand(3.2, 4.5);
    this.gust.gain.linearRampToValueAtTime(0.55 + 0.5 * k, t + up);
    this.gust.gain.linearRampToValueAtTime(0.5 + 0.45 * k, t + up + hold);
    this.gust.gain.linearRampToValueAtTime(0.55, t + up + hold + down);
    this.lp.frequency.linearRampToValueAtTime(380 + 560 * k, t + up);
    this.lp.frequency.linearRampToValueAtTime(380, t + up + hold + down);
  }

  override tick(until: number): void {
    if (!this.running || this.external) return;
    if (this.nextGust < this.ctx.currentTime - 1) this.nextGust = this.ctx.currentTime + 1;
    if (this.nextGust < until) {
      this.doGust(this.nextGust, rand(0.5, 1));
      this.nextGust += rand(8, 15);
    }
  }
}

class RainBed extends Bed {
  private open!: GainNode;
  private tent!: GainNode;
  private openSyn!: Synth;
  private tentSyn!: Synth;
  private nextDrip = 0;
  private nextLeaf = 0;
  private nextTap = 0;
  private nextPlop = 0;
  private tentAmt = 0;

  start(t: number): void {
    this.open = this.g(1 - this.tentAmt * 0.92);
    this.tent = this.g(this.tentAmt);
    this.open.connect(this.gain);
    this.tent.connect(this.gain);
    // Open rain: two decorrelated band-passed pink layers, wide in stereo.
    for (const pv of [-0.6, 0.6]) {
      const bp = this.filt('bandpass', 1500, 0.4);
      const shelf = this.filt('highshelf', 5000);
      shelf.gain.value = -8;
      const pn = this.panner(pv);
      bp.connect(shelf);
      shelf.connect(pn);
      pn.connect(this.open);
      this.loop('pink', bp, t, pv < 0 ? 1 : 0.97);
    }
    const body = this.g(0.4);
    const blp = this.filt('lowpass', 500, 0.6);
    blp.connect(body);
    body.connect(this.open);
    this.loop('brown', blp, t);
    // Tent: muffled rain on canvas.
    const tlp = this.filt('lowpass', 430, 0.6);
    const tg = this.g(1.15);
    tlp.connect(tg);
    tg.connect(this.tent);
    this.loop('pink', tlp, t, 0.9);
    const tb = this.g(0.5);
    const tblp = this.filt('lowpass', 220, 0.6);
    tblp.connect(tb);
    tb.connect(this.tent);
    this.loop('brown', tblp, t);
    const dummyWet = this.g(0);
    this.openSyn = new Synth(this.ctx, { dry: this.open, wet: dummyWet }, this.noise);
    this.tentSyn = new Synth(this.ctx, { dry: this.tent, wet: dummyWet }, this.noise);
    this.nextDrip = this.nextLeaf = this.nextTap = this.nextPlop = t + 0.2;
  }

  setTent(x: number, tc: number): void {
    const k = clamp01(x);
    if (Math.abs(k - this.tentAmt) < 0.01) return;
    this.tentAmt = k;
    if (!this.running) return;
    const now = this.ctx.currentTime;
    this.open.gain.setTargetAtTime(1 - k * 0.92, now, tc);
    this.tent.gain.setTargetAtTime(k, now, tc);
  }

  override tick(until: number): void {
    if (!this.running || this.target < 0.02) return;
    const now = this.ctx.currentTime;
    const resync = (v: number) => (v < now - 0.5 ? now + 0.05 : v);
    this.nextDrip = resync(this.nextDrip);
    this.nextLeaf = resync(this.nextLeaf);
    this.nextTap = resync(this.nextTap);
    this.nextPlop = resync(this.nextPlop);
    const open = 1 - this.tentAmt;
    const tent = this.tentAmt;
    let guard = 0;
    while (this.nextDrip < until && guard++ < 32) {
      if (open > 0.1) {
        const t = this.nextDrip;
        const v = this.openSyn.voice(rand(0.012, 0.03), rand(-0.8, 0.8), 0);
        const a = v.gain(0, v.filter('lowpass', 5000, 0.6));
        const end = perc(a.gain, t, 1, 0.002, rand(0.02, 0.04));
        const f = rand(1800, 3000);
        const o = v.osc('sine', f, t, end, a);
        glide(o.frequency, t, f, f * 0.7, 0.03);
        v.done();
      }
      this.nextDrip += rand(0.12, 0.4);
    }
    guard = 0;
    while (this.nextLeaf < until && guard++ < 8) {
      if (open > 0.1) {
        const t = this.nextLeaf;
        const v = this.openSyn.voice(rand(0.02, 0.04), rand(-0.7, 0.7), 0);
        const a = v.gain(0);
        const end = perc(a.gain, t, 1, 0.003, 0.08);
        const f = rand(700, 1300);
        const o = v.osc('sine', f, t, end, a);
        glide(o.frequency, t, f, f * 1.5, 0.04);
        v.done();
      }
      this.nextLeaf += rand(1.2, 3.2);
    }
    guard = 0;
    while (this.nextTap < until && guard++ < 32) {
      if (tent > 0.1) {
        const t = this.nextTap;
        const v = this.tentSyn.voice(rand(0.05, 0.13), rand(-0.6, 0.6), 0);
        const a = v.gain(0);
        perc(a.gain, t, 1, 0.002, rand(0.015, 0.035));
        v.noise('pink', t, t + 0.06, v.filter('lowpass', rand(450, 900), 0.8, a));
        v.done();
      }
      this.nextTap += rand(0.05, 0.16);
    }
    guard = 0;
    while (this.nextPlop < until && guard++ < 8) {
      if (tent > 0.1) {
        // Drips off the tent edge: soft round plops.
        const t = this.nextPlop;
        const v = this.tentSyn.voice(rand(0.05, 0.08), rand(-0.5, 0.5), 0);
        const a = v.gain(0);
        const end = perc(a.gain, t, 1, 0.003, 0.09);
        const f = rand(260, 420);
        const o = v.osc('sine', f, t, end, a);
        glide(o.frequency, t, f, f * 1.45, 0.05);
        v.done();
      }
      this.nextPlop += rand(0.9, 2.2);
    }
  }
}

class FireBed extends Bed {
  private flicker!: GainNode;
  private syn!: Synth;
  private nextCrack = 0;
  private nextFlicker = 0;

  start(t: number): void {
    const lp = this.filt('lowpass', 280, 0.6);
    this.flicker = this.g(1);
    lp.connect(this.flicker);
    this.flicker.connect(this.gain);
    this.loop('brown', lp, t);
    const crackOut = this.g(1);
    const clp = this.filt('lowpass', 6000, 0.5);
    crackOut.connect(clp);
    clp.connect(this.gain);
    this.syn = new Synth(this.ctx, { dry: crackOut, wet: this.g(0) }, this.noise);
    this.nextCrack = this.nextFlicker = t + 0.1;
  }

  override tick(until: number): void {
    if (!this.running || this.target < 0.02) return;
    const now = this.ctx.currentTime;
    if (this.nextCrack < now - 0.5) this.nextCrack = now + 0.05;
    if (this.nextFlicker < now - 0.5) this.nextFlicker = now + 0.05;
    let guard = 0;
    while (this.nextFlicker < until && guard++ < 8) {
      this.flicker.gain.setTargetAtTime(rand(0.7, 1.15), this.nextFlicker, 0.12);
      this.nextFlicker += rand(0.2, 0.45);
    }
    guard = 0;
    const rate = 4 + 6 * this.target;
    while (this.nextCrack < until && guard++ < 32) {
      const t = this.nextCrack;
      const big = Math.random() < 0.1;
      const v = this.syn.voice(big ? rand(0.25, 0.4) : rand(0.06, 0.22), rand(-0.3, 0.3), 0);
      const a = v.gain(0);
      perc(a.gain, t, 1, 0.0015, big ? rand(0.02, 0.035) : rand(0.004, 0.018));
      v.noise('white', t, t + 0.06, v.filter('bandpass', big ? rand(900, 1300) : rand(1400, 4200), 1.4, a));
      if (big) {
        const pg = v.gain(0);
        const end = perc(pg.gain, t, 0.3, 0.002, 0.04);
        const o = v.osc('sine', 320, t, end, pg);
        glide(o.frequency, t, 320, 150, 0.03);
      }
      v.done();
      // Poisson-ish spacing, with occasional little clusters.
      this.nextCrack += Math.random() < 0.2 ? rand(0.02, 0.06) : -Math.log(1 - Math.random() * 0.98) / rate;
    }
  }
}

class WaterBed extends Bed {
  private laps: { g: GainNode; lp: BiquadFilterNode; next: number }[] = [];
  private syn!: Synth;
  private trickleSyn!: Synth;
  private nextGlug = 0;
  private nextTrickle = 0;

  start(t: number): void {
    this.laps = [];
    for (const pv of [-0.45, 0.45]) {
      const lp = this.filt('lowpass', 480, 0.7);
      const g = this.g(0.35);
      const pn = this.panner(pv);
      lp.connect(g);
      g.connect(pn);
      pn.connect(this.gain);
      this.loop('brown', lp, t, pv < 0 ? 1 : 0.94);
      this.laps.push({ g, lp, next: t + rand(0.2, 1.5) });
    }
    this.syn = new Synth(this.ctx, { dry: this.gain, wet: this.g(0) }, this.noise);
    this.nextGlug = t + rand(1, 3);
    // A trickling stream off to one side: a soft hiss and tiny bubbly plinks.
    const tr = this.g(0.18);
    const trPan = this.panner(-0.55);
    const bp = this.filt('bandpass', 2400, 0.8);
    bp.connect(tr);
    tr.connect(trPan);
    trPan.connect(this.gain);
    this.loop('pink', bp, t, 1.05);
    const plinks = this.g(1);
    plinks.connect(trPan);
    this.trickleSyn = new Synth(this.ctx, { dry: plinks, wet: this.g(0) }, this.noise);
    this.nextTrickle = t + 0.2;
  }

  override tick(until: number): void {
    if (!this.running || this.target < 0.02) return;
    const now = this.ctx.currentTime;
    for (const l of this.laps) {
      if (l.next < now - 0.5) l.next = now + 0.05;
      if (l.next < until) {
        const t = l.next;
        const up = rand(0.5, 0.9);
        const down = rand(1.0, 1.6);
        const pk = rand(0.75, 1);
        l.g.gain.setValueAtTime(0.35, t);
        l.g.gain.linearRampToValueAtTime(pk, t + up);
        l.g.gain.linearRampToValueAtTime(0.35, t + up + down);
        l.lp.frequency.setValueAtTime(450, t);
        l.lp.frequency.linearRampToValueAtTime(880, t + up);
        l.lp.frequency.linearRampToValueAtTime(450, t + up + down);
        l.next = t + up + down + rand(0.2, 1.4);
      }
    }
    if (this.nextTrickle < now - 0.5) this.nextTrickle = now + 0.05;
    let guard = 0;
    while (this.nextTrickle < until && guard++ < 24) {
      const t = this.nextTrickle;
      const v = this.trickleSyn.voice(rand(0.02, 0.05), rand(-0.2, 0.2), 0);
      const a = v.gain(0, v.filter('lowpass', 3000, 0.7));
      const end = perc(a.gain, t, 1, 0.003, rand(0.03, 0.06));
      const f = rand(800, 1900);
      const o = v.osc('sine', f, t, end, a);
      glide(o.frequency, t, f, f * rand(1.3, 1.7), 0.035);
      v.done();
      this.nextTrickle += Math.random() < 0.3 ? rand(0.03, 0.07) : rand(0.08, 0.3);
    }
    if (this.nextGlug < now - 0.5) this.nextGlug = now + 0.5;
    if (this.nextGlug < until) {
      const t = this.nextGlug;
      const v = this.syn.voice(rand(0.06, 0.1), rand(-0.5, 0.5), 0);
      const a = v.gain(0, v.filter('lowpass', 1200, 0.7));
      const end = perc(a.gain, t, 1, 0.004, 0.08);
      const f = rand(300, 560);
      const o = v.osc('sine', f, t, end, a);
      glide(o.frequency, t, f, f * 1.4, 0.05);
      v.done();
      this.nextGlug += rand(2, 5);
    }
  }
}

type BirdKind = 'tweet' | 'trill' | 'whistle' | 'coo' | 'feebee' | 'chatter' | 'barbet';

class BirdsBed extends Bed {
  private syn!: Synth;
  private next = 0;
  /** Day progress, to choose species (doves at dawn and morning). */
  p = 0.3;

  start(t: number): void {
    const lp = this.filt('lowpass', 6000, 0.5);
    lp.connect(this.gain);
    this.syn = new Synth(this.ctx, { dry: lp, wet: this.g(0) }, this.noise);
    this.next = t + rand(0.3, 1.5);
  }

  override tick(until: number): void {
    if (!this.running || this.target < 0.02) return;
    const now = this.ctx.currentTime;
    if (this.next < now - 0.5) this.next = now + rand(0.2, 1);
    if (this.next >= until) return;
    const t = this.next;
    const dawn = this.p < 0.16;
    const kinds: [BirdKind, number][] = [
      ['chatter', 2.6],
      ['tweet', 2.4],
      ['whistle', 2],
      ['trill', 1],
      ['feebee', 0.8],
      ['barbet', dawn ? 2.4 : 0.25],
      ['coo', this.p < 0.4 ? 0.6 : 0.1],
    ];
    const total = kinds.reduce((a, [, w]) => a + w, 0);
    let r = Math.random() * total;
    let kind: BirdKind = 'tweet';
    for (const [k, w] of kinds) {
      if ((r -= w) <= 0) {
        kind = k;
        break;
      }
    }
    const dur = this.phrase(kind, t, rand(-0.85, 0.85), rand(0.5, 1));
    this.next = t + dur + rand(0.8, 4.5) / (0.35 + this.target);
  }

  /** One bird phrase on a single oscillator. Returns its length. */
  private phrase(kind: BirdKind, t: number, pan: number, dist: number): number {
    // [f0, f1, len, peak, gapAfter]
    const notes: [number, number, number, number, number][] = [];
    if (kind === 'tweet') {
      const base = rand(2600, 3400);
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) notes.push([base, base * 1.3, 0.06, 1 - i * 0.1, rand(0.05, 0.09)]);
    } else if (kind === 'trill') {
      const base = rand(3200, 3900);
      const n = 8 + Math.floor(Math.random() * 7);
      for (let i = 0; i < n; i++) notes.push([base * (i % 2 ? 1.08 : 1), base * (i % 2 ? 1.02 : 1.1), 0.032, 0.6 + 0.4 * Math.sin((i / n) * Math.PI), 0.013]);
    } else if (kind === 'whistle') {
      const n = 3 + Math.floor(Math.random() * 4);
      let fr = rand(2400, 3200);
      for (let i = 0; i < n; i++) {
        const nf = Math.max(2000, Math.min(3800, fr * pick([0.84, 0.89, 1.12, 1.19, 1.0])));
        notes.push([fr, nf, rand(0.1, 0.2), 0.9, rand(0.04, 0.09)]);
        fr = nf;
      }
    } else if (kind === 'chatter') {
      // Laughingthrush: a giggly tumble of mid-pitched notes.
      const n = 7 + Math.floor(Math.random() * 7);
      let fr = rand(1500, 2300);
      for (let i = 0; i < n; i++) {
        const nf = Math.max(1200, Math.min(2900, fr * rand(0.8, 1.25)));
        notes.push([fr, nf, rand(0.045, 0.08), 0.55 + 0.45 * Math.random(), rand(0.02, 0.07)]);
        fr = nf;
      }
    } else if (kind === 'barbet') {
      // Barbet at dawn: a low, repeated "pu-kuruk" hoot.
      const base = rand(620, 720);
      const n = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) notes.push([base * 1.1, base * 1.08, 0.07, 0.8, 0.05], [base, base * 0.97, 0.15, 0.9, 0.22]);
    } else if (kind === 'feebee') {
      const hi = rand(3100, 3500);
      notes.push([hi, hi * 0.99, 0.24, 0.9, 0.06], [hi * 0.84, hi * 0.83, 0.26, 0.8, 0.04]);
    } else {
      // Dove: "hoo-HOO-hoo-hoo", low and round.
      const base = rand(500, 580);
      [0.8, 1, 0.7, 0.65].forEach((pk, i) => notes.push([base * (i === 1 ? 1.06 : 1), base * (i === 1 ? 0.98 : 0.94), i === 1 ? 0.38 : 0.26, pk, 0.12]));
    }
    const total = notes.reduce((a, n) => a + n[2] + n[4], 0);
    const low = kind === 'coo' || kind === 'barbet';
    const v = this.syn.voice((low ? 0.1 : kind === 'chatter' ? 0.065 : 0.075) * dist, pan, 0);
    const amp = v.gain(0, low ? v.filter('lowpass', 1300, 0.7) : v.input);
    const o = v.osc('sine', notes[0][0], t, t + total + 0.05, amp);
    const f = o.frequency;
    const g = amp.gain;
    g.setValueAtTime(0, t);
    let at = t;
    for (const [f0, f1, len, peak, gap] of notes) {
      f.setValueAtTime(f0, at);
      f.exponentialRampToValueAtTime(f1, at + len);
      g.setValueAtTime(0, at);
      g.linearRampToValueAtTime(peak, at + Math.min(0.012, len * 0.3));
      g.setValueAtTime(peak, at + len * 0.6);
      g.linearRampToValueAtTime(0, at + len);
      at += len + gap;
    }
    v.done();
    return total;
  }
}

class CricketsBed extends Bed {
  private crickets: { g: GainNode; next: number; period: number; pulses: number }[] = [];
  private trill!: GainNode;
  private nextTrill = 0;
  private frogSyn!: Synth;
  private nextFrog = 0;
  /** 0..1, frogs croak near the water at night. */
  frogs = 0;

  start(t: number): void {
    const lp = this.filt('lowpass', 5500, 0.5);
    lp.connect(this.gain);
    this.crickets = [];
    const defs: [number, number, number, number][] = [
      [3900, -0.55, 0.72, 3],
      [4300, 0.5, 0.95, 4],
      [3600, 0.1, 1.25, 3],
    ];
    for (const [f, pv, period, pulses] of defs) {
      const o = this.ctx.createOscillator();
      o.frequency.value = f;
      const g = this.g(0);
      const pn = this.panner(pv);
      o.connect(g);
      g.connect(pn);
      pn.connect(lp);
      o.start(t);
      this.sources.push(o);
      this.crickets.push({ g, next: t + rand(0.1, 0.8), period, pulses });
    }
    // A far tree-cricket trill for texture.
    const tri = this.ctx.createOscillator();
    tri.frequency.value = 2650;
    const tg = this.g(0);
    this.trill = tg;
    this.nextTrill = t + rand(1, 3);
    const am = this.g(0.5);
    tri.connect(am);
    am.connect(tg);
    tg.connect(lp);
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 38;
    const depth = this.g(0.5);
    lfo.connect(depth);
    depth.connect(am.gain);
    tri.start(t);
    lfo.start(t);
    this.sources.push(tri, lfo);
    this.frogSyn = new Synth(this.ctx, { dry: this.gain, wet: this.g(0) }, this.noise);
    this.nextFrog = t + rand(3, 8);
  }

  override tick(until: number): void {
    if (!this.running || this.target < 0.02) return;
    const now = this.ctx.currentTime;
    // The far trill comes and goes in phrases (a constant tone is tiring).
    if (this.nextTrill < now - 0.5) this.nextTrill = now + 0.5;
    if (this.nextTrill < until) {
      const t = this.nextTrill;
      const on = rand(1.5, 4);
      const g = this.trill.gain;
      g.setValueAtTime(0, t);
      g.linearRampToValueAtTime(0.1, t + 0.6);
      g.setValueAtTime(0.1, t + on);
      g.linearRampToValueAtTime(0, t + on + 0.8);
      this.nextTrill = t + on + 0.8 + rand(1.5, 5);
    }
    for (const c of this.crickets) {
      if (c.next < now - 0.5) c.next = now + 0.05;
      let guard = 0;
      while (c.next < until && guard++ < 8) {
        let t = c.next;
        for (let i = 0; i < c.pulses; i++) {
          c.g.gain.setValueAtTime(0, t);
          c.g.gain.linearRampToValueAtTime(1, t + 0.005);
          c.g.gain.setValueAtTime(1, t + 0.018);
          c.g.gain.linearRampToValueAtTime(0, t + 0.024);
          t += 0.045;
        }
        c.next += c.period * rand(0.85, 1.2);
      }
    }
    if (this.frogs > 0.2) {
      if (this.nextFrog < now - 0.5) this.nextFrog = now + 1;
      if (this.nextFrog < until) {
        const t = this.nextFrog;
        const n = Math.random() < 0.5 ? 2 : 1;
        for (let i = 0; i < n; i++) {
          const tt = t + i * 0.24;
          const v = this.frogSyn.voice(0.9 * this.frogs, rand(-0.6, 0.6), 0);
          const a = v.gain(0, v.filter('lowpass', 700, 0.8));
          const end = swell(a.gain, tt, 1, 0.02, 0.1, 0.06);
          // Multiplicative throat flutter: am = 0.6 +- 0.4 after the envelope.
          const am = v.gain(0.6, a);
          const f0 = rand(130, 160);
          const o = v.osc('triangle', f0, tt, end, am);
          glide(o.frequency, tt, f0, f0 * 1.25, 0.16);
          v.osc('sine', 28, tt, end, v.paramGain(am.gain, 0.4));
          v.done();
        }
        this.nextFrog += rand(5, 12);
      }
    }
  }
}

class RoomBed extends Bed {
  private syn!: Synth;
  private next = 0;
  private tick2 = false;
  private tinRoar!: GainNode;
  private tinSyn!: Synth;
  private nextTin = 0;
  /** 0..1: rain drumming on the shop's tin roof. */
  tin = 0;
  private tinApplied = -1;

  start(t: number): void {
    const lp = this.filt('lowpass', 170, 0.6);
    const rg = this.g(0.8);
    lp.connect(rg);
    rg.connect(this.gain);
    this.loop('brown', lp, t);
    this.syn = new Synth(this.ctx, { dry: this.gain, wet: this.g(0) }, this.noise);
    this.next = t + 0.5;
    // Rain on the tin roof: a soft mid roar plus metallic pings.
    this.tinRoar = this.g(0);
    const bp = this.filt('bandpass', 1700, 0.7);
    bp.connect(this.tinRoar);
    this.tinRoar.connect(this.gain);
    this.loop('pink', bp, t, 0.95);
    const pings = this.g(1);
    const plp = this.filt('lowpass', 5200, 0.6);
    pings.connect(plp);
    plp.connect(this.gain);
    this.tinSyn = new Synth(this.ctx, { dry: pings, wet: this.g(0) }, this.noise);
    this.nextTin = t + 0.1;
    this.tinApplied = -1;
  }

  override tick(until: number): void {
    if (!this.running || this.target < 0.02) return;
    const now = this.ctx.currentTime;
    if (Math.abs(this.tin - this.tinApplied) > 0.01) {
      this.tinApplied = this.tin;
      this.tinRoar.gain.setTargetAtTime(0.5 * this.tin, now, 1.5);
    }
    if (this.tin > 0.05) {
      if (this.nextTin < now - 0.5) this.nextTin = now + 0.05;
      let g = 0;
      while (this.nextTin < until && g++ < 32) {
        const t = this.nextTin;
        const v = this.tinSyn.voice(rand(0.04, 0.11) * this.tin, rand(-0.7, 0.7), 0);
        const a = v.gain(0);
        const end = perc(a.gain, t, 1, 0.002, rand(0.02, 0.05));
        const f = rand(2400, 4200);
        const o = v.osc('sine', f, t, end, a);
        v.osc('sine', f * 1.47, t, end, v.paramGain(o.frequency, f * 0.3));
        v.done();
        this.nextTin += rand(0.03, 0.12);
      }
    }
    if (this.next < now - 0.5) this.next = now + 0.1;
    let guard = 0;
    while (this.next < until && guard++ < 4) {
      // A slow wooden clock: tick... tock...
      const t = this.next;
      const f = this.tick2 ? 1500 : 2000;
      const v = this.syn.voice(0.16, 0.35, 0);
      const a = v.gain(0, v.filter('lowpass', 3500, 0.7));
      const end = perc(a.gain, t, 1, 0.002, 0.03);
      v.osc('sine', f, t, end, a);
      const k = v.gain(0);
      perc(k.gain, t, 0.4, 0.001, 0.01);
      v.noise('white', t, t + 0.03, v.filter('bandpass', f * 1.5, 2, k));
      v.done();
      this.tick2 = !this.tick2;
      this.next += 1.0;
    }
  }
}

// ---------------------------------------------------------------------------

export class Ambience {
  private readonly ctx: BaseAudioContext;
  private outdoorLP: BiquadFilterNode;
  private outdoorLevel: GainNode;
  private indoor: GainNode;
  readonly wind: WindBed;
  readonly rain: RainBed;
  readonly fire: FireBed;
  readonly water: WaterBed;
  readonly birds: BirdsBed;
  readonly crickets: CricketsBed;
  readonly room: RoomBed;
  private beds: Bed[];
  private lastScene: AmbienceScene | null = null;
  private appliedLP = -1;
  private appliedLevel = -1;

  constructor(ctx: BaseAudioContext, dest: Out, noise: NoiseBank) {
    this.ctx = ctx;
    const mix = ctx.createGain();
    this.outdoorLP = ctx.createBiquadFilter();
    this.outdoorLP.type = 'lowpass';
    this.outdoorLP.frequency.value = 16000;
    this.outdoorLP.Q.value = 0.5;
    this.outdoorLevel = ctx.createGain();
    this.outdoorLevel.gain.value = 0;
    mix.connect(this.outdoorLP);
    this.outdoorLP.connect(this.outdoorLevel);
    this.outdoorLevel.connect(dest.dry);
    const send = ctx.createGain();
    send.gain.value = 0.22;
    this.outdoorLevel.connect(send);
    send.connect(dest.wet);
    this.indoor = ctx.createGain();
    this.indoor.gain.value = 1;
    this.indoor.connect(dest.dry);

    this.wind = new WindBed(ctx, noise, mix, 0.16);
    this.rain = new RainBed(ctx, noise, mix, 0.22);
    this.fire = new FireBed(ctx, noise, mix, 0.2);
    this.water = new WaterBed(ctx, noise, mix, 0.16);
    this.birds = new BirdsBed(ctx, noise, mix, 1);
    this.crickets = new CricketsBed(ctx, noise, mix, 0.03);
    this.room = new RoomBed(ctx, noise, this.indoor, 0.09);
    this.beds = [this.wind, this.rain, this.fire, this.water, this.birds, this.crickets, this.room];
  }

  /** Apply a state; cheap enough to call every frame (only real changes touch the graph). */
  set(c: AmbienceCtx): void {
    const sc = c.scene;
    const sceneChanged = sc !== this.lastScene;
    this.lastScene = sc;
    const tcScene = 0.6;
    const p = Number.isFinite(c.p) ? c.p : 0.3;
    const rain = c.raining ? 1 : 0;
    const tent = c.inTent && sc !== 'shop' ? 1 : 0;
    const level = SCENE_LEVEL[sc] ?? 1;
    const lp = sc === 'shop' ? SCENE_LP.shop : Math.min(SCENE_LP[sc] ?? 16000, tent ? 2600 : 16000);

    if (Math.abs(level - this.appliedLevel) > 0.005) {
      this.appliedLevel = level;
      this.outdoorLevel.gain.setTargetAtTime(level, this.ctx.currentTime, sceneChanged ? tcScene : 1.2);
    }
    if (Math.abs(lp - this.appliedLP) > 1) {
      this.appliedLP = lp;
      this.outdoorLP.frequency.setTargetAtTime(lp, this.ctx.currentTime, 0.35);
    }

    const silent = sc === 'silent';
    const day = curve(BIRDS, p);
    const night = curve(CRICKETS, p);
    const muffle = tent ? 0.55 : 1;
    let birds = day * (rain ? 0.2 : 1) * muffle;
    let crickets = night * (rain ? 0.25 : 1) * muffle;
    let wind = (0.55 + 0.2 * rain) * (tent ? 0.6 : 1);
    let fire = sc === 'cooking' ? 1 : clamp01(c.nearFire) * muffle;
    let water = clamp01(c.nearWater) * (sc === 'cooking' ? 0.5 : 1) * muffle;
    if (sc === 'intro') {
      birds *= 0.6;
      crickets *= 0.5;
      wind = 0.8;
      fire = 0;
      water = 0;
    } else if (sc === 'album') {
      fire = 0;
      water = 0;
    }
    if (silent) birds = crickets = wind = fire = water = 0;

    this.birds.p = p;
    this.crickets.frogs = night * clamp01(c.nearWater) * (rain ? 0.4 : 1);
    this.birds.set(birds, 2);
    this.crickets.set(crickets, 2);
    this.wind.set(wind, 2);
    this.rain.set(silent ? 0 : rain, 2.5);
    this.rain.setTent(tent, 0.6);
    this.fire.set(fire, 0.8);
    this.water.set(water, 1);
    this.room.tin = sc === 'shop' && rain ? 1 : 0;
    this.room.set(sc === 'shop' ? 1 : 0, 0.5);
  }

  gust(strength = 1): void {
    this.wind.external = true;
    this.wind.doGust(this.ctx.currentTime + 0.02, strength);
  }

  tick(until: number): void {
    const now = this.ctx.currentTime;
    for (const b of this.beds) {
      b.tick(until);
      b.maintain(now);
    }
  }
}
