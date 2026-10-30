/**
 * Audio engine (spec section 9): one AudioContext, three mix buses (music,
 * sfx, ambience) with a shared generated-impulse reverb, a gentle master
 * compressor, iOS-safe unlock on the first gesture, and the public API the
 * rest of the game calls.
 *
 * Nothing makes a sound (or even creates an AudioContext) before the first
 * user gesture; requested ambience and music are remembered and applied on
 * unlock. Every entry point is safe to call when Web Audio is missing.
 *
 *   playSfx('pop')                       one-shot effect (also bus 'sfx' events)
 *   setAmbience({ scene, p, raining, inTent, nearFire, nearWater })  every frame is fine
 *   setMusicMood('day' | 'rain' | 'night' | 'finale' | 'off')        4 s crossfade
 *   duckMusic(0.3, 1800)                 automatic under the catch fanfare
 */
import { bus } from '@/core/bus';
import { registerDebug } from '@/core/debug';
import { settingsGet } from '@/core/settings';
import { Ambience, type AmbienceCtx, type AmbienceScene } from './ambience';
import { MusicDirector, detectMusic as detectFiles, detected, type MusicMood } from './music';
import { type LeadVoice, getLeadVoice, setLeadVoice } from './score';
import { type Out, type SfxId, SFX_IDS, Synth, holdAt, makeImpulse, makeNoiseBank, renderSfx, resolveSfx, voiceCount } from './sfx';

export type { SfxId, MusicMood, AmbienceCtx, AmbienceScene, LeadVoice };
export { SFX_IDS, setLeadVoice, getLeadVoice };

/** Seconds of audio scheduled ahead by the lookahead loop. */
const LOOKAHEAD = 0.3;
const LOOP_MS = 50;
/** Per-bus trims so that, at equal slider positions, SFX and ambience sit under the music bed. */
const TRIM = { music: 1.0, sfx: 0.9, amb: 0.85 };

class MixBus implements Out {
  readonly dry: GainNode;
  readonly wet: GainNode;
  readonly duckD: GainNode;
  readonly duckW: GainNode;
  private readonly volD: GainNode;
  private readonly volW: GainNode;

  constructor(ctx: BaseAudioContext, master: AudioNode, reverb: AudioNode) {
    const g = (v = 1) => {
      const n = ctx.createGain();
      n.gain.value = v;
      return n;
    };
    this.dry = g();
    this.wet = g();
    this.duckD = g();
    this.duckW = g();
    this.volD = g(0);
    this.volW = g(0);
    this.dry.connect(this.duckD).connect(this.volD).connect(master);
    this.wet.connect(this.duckW).connect(this.volW).connect(reverb);
  }

  setLevel(v: number, t: number, tc = 0.06): void {
    this.volD.gain.setTargetAtTime(v, t, tc);
    this.volW.gain.setTargetAtTime(v, t, tc);
  }
}

interface Engine {
  ctx: AudioContext;
  music: MixBus;
  sfx: MixBus;
  amb: MixBus;
  synth: Synth;
  ambience: Ambience;
  director: MusicDirector;
  out: GainNode;
  analyser: AnalyserNode | null;
}

let ctx: AudioContext | null = null;
let eng: Engine | null = null;
/** True once the context has been running (pending state applied). */
let unlocked = false;
let resumeAt = -1;
let loopTimer: ReturnType<typeof setTimeout> | null = null;
let hiddenSuspended = false;
const pendingAmb: AmbienceCtx = { scene: 'silent', p: 0.3, raining: false, inTent: false, nearFire: 0, nearWater: 0 };
let ambRequested = false;
let pendingMood: MusicMood = 'off';
let levelBuf: Float32Array<ArrayBuffer> | null = null;

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function audioCtor(): (new (o?: AudioContextOptions) => AudioContext) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function volCurve(v: number): number {
  const x = Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
  return Math.pow(x, 1.6);
}

function applyVolumes(): void {
  if (!eng) return;
  const s = settingsGet();
  const t = eng.ctx.currentTime;
  eng.music.setLevel(volCurve(s.music) * TRIM.music, t);
  eng.sfx.setLevel(volCurve(s.sounds) * TRIM.sfx, t);
  eng.amb.setLevel(volCurve(s.ambience) * TRIM.amb, t);
  if (unlocked) {
    applyMood();
    if (ambRequested) applyAmb();
  }
}

/** A muted layer is stopped outright (saves CPU on iPad) and resumes when unmuted. */
function applyMood(): void {
  if (!eng) return;
  eng.director.setMood(settingsGet().music > 0 ? pendingMood : 'off');
}

const silentAmb: AmbienceCtx = { scene: 'silent', p: 0.3, raining: false, inTent: false, nearFire: 0, nearWater: 0 };
function applyAmb(): void {
  if (!eng) return;
  eng.ambience.set(settingsGet().ambience > 0 ? pendingAmb : silentAmb);
}

function build(c: AudioContext): Engine {
  const g = (v = 1) => {
    const n = c.createGain();
    n.gain.value = v;
    return n;
  };
  // Master: gentle high/low trims -> soft compressor -> out.
  const masterIn = g(1);
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 32;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 12000;
  lp.Q.value = 0.5;
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.knee.value = 14;
  comp.ratio.value = 3;
  comp.attack.value = 0.012;
  comp.release.value = 0.28;
  const out = g(0.92);
  masterIn.connect(hp).connect(lp).connect(comp).connect(out).connect(c.destination);

  // Shared reverb (impulse generated off the tap handler).
  const reverb = c.createConvolver();
  const ret = g(0.7);
  reverb.connect(ret).connect(masterIn);
  setTimeout(() => {
    try {
      reverb.buffer = makeImpulse(c, 2.4, 3.2);
    } catch {
      /* reverb is optional */
    }
  }, 0);

  const music = new MixBus(c, masterIn, reverb);
  const sfx = new MixBus(c, masterIn, reverb);
  const amb = new MixBus(c, masterIn, reverb);
  const noise = makeNoiseBank(c);
  const e: Engine = {
    ctx: c,
    music,
    sfx,
    amb,
    synth: new Synth(c, sfx, noise),
    ambience: new Ambience(c, amb, noise),
    director: new MusicDirector(c, music, noise),
    out,
    analyser: null,
  };
  eng = e;
  applyVolumes();
  return e;
}

function onState(): void {
  if (!ctx || !eng) return;
  if (ctx.state === 'running') {
    resumeAt = -1;
    if (!unlocked) {
      unlocked = true;
      if (ambRequested) applyAmb();
      applyMood();
    }
    startLoop();
  }
}

function startLoop(): void {
  if (loopTimer !== null) return;
  const step = () => {
    loopTimer = null;
    if (!ctx || !eng) return;
    if (ctx.state === 'running') {
      const until = ctx.currentTime + LOOKAHEAD;
      try {
        eng.ambience.tick(until);
        eng.director.tick(until);
      } catch {
        /* never let a scheduling hiccup kill the loop */
      }
    }
    loopTimer = setTimeout(step, LOOP_MS);
  };
  loopTimer = setTimeout(step, 0);
}

function hasActivation(): boolean {
  const ua = (typeof navigator !== 'undefined' ? (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation : undefined) ?? null;
  return ua ? ua.isActive : true;
}

/**
 * Create / resume the AudioContext. Call from inside a user gesture (the
 * engine already listens for the first tap anywhere, so this is optional).
 */
export function unlockAudio(): void {
  try {
    if (!ctx) {
      const C = audioCtor();
      if (!C) return;
      try {
        ctx = new C({ latencyHint: 'interactive' });
      } catch {
        ctx = new C();
      }
      ctx.onstatechange = onState;
    }
    const c = ctx;
    if (!eng) build(c);
    if (c.state !== 'running' && (c.state as string) !== 'closed') {
      resumeAt = now();
      try {
        const pr = c.resume();
        if (pr && typeof pr.then === 'function') pr.then(onState, () => {});
      } catch {
        /* resume can throw on very old Safari */
      }
      // iOS: starting a silent buffer inside the gesture opens the output.
      try {
        const b = c.createBuffer(1, 1, 22050);
        const s = c.createBufferSource();
        s.buffer = b;
        s.connect(c.destination);
        s.start(0);
      } catch {
        /* ignore */
      }
    }
    onState();
  } catch {
    /* audio is optional */
  }
}

const GESTURES = ['pointerup', 'touchend', 'mousedown', 'click', 'keydown'] as const;

function onGesture(): void {
  if (ctx && ctx.state === 'running') return;
  if (!hasActivation()) return;
  hiddenSuspended = false;
  unlockAudio();
}

function onVisibility(): void {
  if (!ctx) return;
  try {
    if (document.hidden) {
      if (ctx.state === 'running') {
        hiddenSuspended = true;
        void ctx.suspend().catch(() => {});
      }
    } else if (hiddenSuspended) {
      hiddenSuspended = false;
      void ctx.resume().then(onState, () => {});
    }
  } catch {
    /* ignore */
  }
}

/** Play a sound effect by id or alias (unknown ids are ignored). */
function playAny(id: string, opts?: { vol?: number; pan?: number; pitch?: number }): void {
  if (!eng || !ctx) return;
  const running = ctx.state === 'running';
  if (!running && !(resumeAt > 0 && now() - resumeAt < 1500)) return;
  if (settingsGet().sounds <= 0) return;
  const sid = resolveSfx(id);
  if (!sid) return;
  try {
    const played = renderSfx(eng.synth, sid, opts);
    if (played && sid === 'fanfare') duckMusic(0.3, 1800);
  } catch {
    /* never throw from a sound */
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Boot: find which optional music files exist in public/audio/. Never throws or logs. */
export async function detectMusic(): Promise<void> {
  try {
    await detectFiles();
  } catch {
    /* treat as no files */
  }
}

export function playSfx(id: SfxId, opts?: { vol?: number; pan?: number; pitch?: number }): void {
  playAny(id, opts);
}

/** Ambience state; cheap to call every frame. */
export function setAmbience(c: AmbienceCtx): void {
  pendingAmb.scene = c.scene;
  pendingAmb.p = c.p;
  pendingAmb.raining = c.raining;
  pendingAmb.inTent = c.inTent;
  pendingAmb.nearFire = c.nearFire;
  pendingAmb.nearWater = c.nearWater;
  ambRequested = true;
  if (eng && unlocked) {
    try {
      applyAmb();
    } catch {
      /* ignore */
    }
  }
}

/** Crossfade (4 s) to a music mood; missing files use the generative score. */
export function setMusicMood(mood: MusicMood): void {
  pendingMood = mood;
  if (eng && unlocked) {
    try {
      applyMood();
    } catch {
      /* ignore */
    }
  }
}

/** Duck the music bus by `amount` (0.3 = 30%) for `ms`, then recover. */
export function duckMusic(amount = 0.3, ms = 1800): void {
  if (!eng || !ctx) return;
  const t = ctx.currentTime;
  const k = Math.max(0, Math.min(1, 1 - amount));
  for (const g of [eng.music.duckD.gain, eng.music.duckW.gain]) {
    holdAt(g, t);
    g.linearRampToValueAtTime(k, t + 0.12);
    g.setValueAtTime(k, t + Math.max(0.12, ms / 1000));
    g.linearRampToValueAtTime(1, t + Math.max(0.12, ms / 1000) + 0.9);
  }
}

/** A wind gust now (lets a scene sync swaying lanterns and chimes). Auto gusts stop once this is used. */
export function windGust(strength = 1): void {
  if (eng && unlocked) eng.ambience.gust(strength);
}

/** Suggested mood for a time of day and weather (night from late dusk). */
export function musicMoodFor(p: number, raining: boolean, finale = false): MusicMood {
  if (finale) return 'finale';
  if (raining) return 'rain';
  return p >= 0.92 ? 'night' : 'day';
}

export function isAudioUnlocked(): boolean {
  return unlocked && !!ctx && ctx.state === 'running';
}

/** Output level 0..1 (RMS of the master), for meters in dev previews. */
export function audioLevel(): number {
  if (!eng || !unlocked) return 0;
  if (!eng.analyser) {
    try {
      eng.analyser = eng.ctx.createAnalyser();
      eng.analyser.fftSize = 512;
      eng.out.connect(eng.analyser);
    } catch {
      return 0;
    }
  }
  const a = eng.analyser;
  if (!levelBuf || levelBuf.length !== a.fftSize) levelBuf = new Float32Array(new ArrayBuffer(a.fftSize * 4));
  a.getFloatTimeDomainData(levelBuf);
  let sum = 0;
  for (let i = 0; i < levelBuf.length; i++) sum += levelBuf[i] * levelBuf[i];
  return Math.sqrt(sum / levelBuf.length);
}

export function audioState(): {
  supported: boolean;
  state: string;
  unlocked: boolean;
  mood: MusicMood;
  musicSource: string;
  detected: Record<string, boolean>;
  lead: LeadVoice;
  voices: number;
} {
  return {
    supported: !!audioCtor(),
    state: ctx ? ctx.state : 'none',
    unlocked,
    mood: pendingMood,
    musicSource: eng ? eng.director.source() : 'off',
    detected: { ...detected },
    lead: getLeadVoice(),
    voices: voiceCount(),
  };
}

// ---------------------------------------------------------------------------
// Install once on import
// ---------------------------------------------------------------------------

const offs: (() => void)[] = [];

if (typeof window !== 'undefined') {
  for (const ev of GESTURES) window.addEventListener(ev, onGesture, { capture: true, passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  offs.push(
    bus.on('sfx', (e) => playAny(e.id, { vol: e.vol, pan: e.pan })),
    bus.on('settings:changed', applyVolumes),
  );
  registerDebug('audio', () => audioState());
  registerDebug('sfx', (id: string) => playAny(id));
  // The whole API for scripted tests (one module instance, even after HMR).
  registerDebug('audioApi', () => ({ playSfx, setMusicMood, setAmbience, duckMusic, windGust, setLeadVoice, audioLevel, audioState, SFX_IDS }));
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    for (const ev of GESTURES) window.removeEventListener(ev, onGesture, { capture: true });
    document.removeEventListener('visibilitychange', onVisibility);
    offs.forEach((off) => off());
    if (loopTimer !== null) clearTimeout(loopTimer);
    try {
      void ctx?.close().catch(() => {});
    } catch {
      /* ignore */
    }
  });
}
