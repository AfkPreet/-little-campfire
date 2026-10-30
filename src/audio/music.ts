/**
 * Music director (spec section 9). At boot, detectMusic() checks which of the
 * optional files in public/audio/ exist. setMood() crossfades (4 s) between
 * the file for that mood and, for any missing file, the generative fallback
 * score in the matching variant. finale.mp3 plays once in place of the loop
 * and hands back to the night mood when it ends.
 *
 * Files are decoded to AudioBuffers (gapless loops); at most two decoded
 * buffers are kept, so memory stays bounded on iPad.
 */
import { Score } from './score';
import { type NoiseBank, type Out, holdAt } from './sfx';

export type MusicMood = 'day' | 'rain' | 'night' | 'finale' | 'off';
type FileMood = Exclude<MusicMood, 'off'>;

const FILES: Record<FileMood, string> = {
  day: 'audio/music_day.mp3',
  rain: 'audio/music_rain.mp3',
  night: 'audio/music_night.mp3',
  finale: 'audio/finale.mp3',
};

/** Which optional music files exist (filled by detectMusic). */
export const detected: Record<FileMood, boolean> = { day: false, rain: false, night: false, finale: false };

export const FADE_S = 4;
/** Mastered files are much louder than the soft code score; trim them to sit at the same bed level. */
const FILE_TRIM = 0.5;

function fileUrl(m: FileMood): string {
  try {
    return new URL(FILES[m], document.baseURI).href;
  } catch {
    return FILES[m];
  }
}

function looksLikeAudio(res: Response): boolean {
  if (!res.ok && res.status !== 206) return false;
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (ct.startsWith('text/html')) return false;
  return ct.startsWith('audio/') || ct.startsWith('application/octet-stream');
}

async function probe(url: string): Promise<boolean> {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => ctl?.abort(), 4000);
  try {
    let res: Response | null = null;
    try {
      res = await fetch(url, { method: 'HEAD', cache: 'no-cache', signal: ctl?.signal });
    } catch {
      res = null;
    }
    if (res && (res.status === 405 || res.status === 501 || res.status === 403)) res = null;
    if (!res) {
      res = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' }, cache: 'no-cache', signal: ctl?.signal });
      const ok = looksLikeAudio(res);
      try {
        await res.body?.cancel();
      } catch {
        /* ignore */
      }
      return ok;
    }
    return looksLikeAudio(res);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Boot-time check for the optional music files. Never throws, never logs. */
export async function detectMusic(): Promise<void> {
  if (typeof fetch !== 'function') return;
  const moods = Object.keys(FILES) as FileMood[];
  const results = await Promise.all(moods.map((m) => probe(fileUrl(m)).catch(() => false)));
  moods.forEach((m, i) => (detected[m] = results[i]));
}

interface FileTrack {
  mood: FileMood;
  gain: GainNode;
  src: AudioBufferSourceNode | null;
  stopping: boolean;
}

export class MusicDirector {
  private readonly ctx: BaseAudioContext;
  private readonly bus: GainNode;
  private readonly score: Score;
  private mood: MusicMood = 'off';
  private token = 0;
  private tracks: FileTrack[] = [];
  private cache = new Map<FileMood, AudioBuffer>();
  private loading = new Map<FileMood, Promise<AudioBuffer | null>>();
  private scoreStopTimer: ReturnType<typeof setTimeout> | null = null;
  private scoreTarget = 0;

  constructor(ctx: BaseAudioContext, out: Out, noise: NoiseBank) {
    this.ctx = ctx;
    this.bus = ctx.createGain();
    this.bus.gain.value = FILE_TRIM;
    this.bus.connect(out.dry);
    this.score = new Score(ctx, out, noise);
  }

  getMood(): MusicMood {
    return this.mood;
  }

  /** What is actually sounding: 'file', 'score' or 'off'. */
  source(): 'file' | 'score' | 'off' {
    if (this.mood === 'off') return 'off';
    return this.tracks.some((t) => !t.stopping) ? 'file' : this.scoreTarget > 0 ? 'score' : 'off';
  }

  setMood(m: MusicMood): void {
    if (m === this.mood) return;
    this.mood = m;
    const token = ++this.token;
    const now = this.ctx.currentTime;
    // Fade every file track out.
    for (const tr of this.tracks) this.fadeOutTrack(tr, now);
    if (m === 'off') {
      this.fadeScore(0);
      return;
    }
    if (detected[m]) {
      this.fadeScore(0);
      void this.load(m).then((buf) => {
        if (token !== this.token) return;
        if (!buf) {
          detected[m] = false;
          this.toScore(m);
          return;
        }
        this.playFile(m, buf);
      });
    } else {
      this.toScore(m);
    }
  }

  private toScore(m: FileMood): void {
    this.score.setVariant(m);
    this.fadeScore(1);
  }

  private fadeScore(target: number): void {
    const now = this.ctx.currentTime;
    if (this.scoreStopTimer) {
      clearTimeout(this.scoreStopTimer);
      this.scoreStopTimer = null;
    }
    this.scoreTarget = target;
    const g = this.score.out.gain;
    if (target > 0) {
      if (!this.score.isRunning()) {
        g.cancelScheduledValues(now);
        g.setValueAtTime(0, now);
        this.score.start();
      } else holdAt(g, now);
      g.linearRampToValueAtTime(target, now + FADE_S);
    } else if (this.score.isRunning()) {
      holdAt(g, now);
      g.linearRampToValueAtTime(0, now + FADE_S);
      this.scoreStopTimer = setTimeout(() => {
        this.scoreStopTimer = null;
        if (this.scoreTarget === 0) this.score.stop();
      }, FADE_S * 1000 + 300);
    }
  }

  private fadeOutTrack(tr: FileTrack, now: number): void {
    if (tr.stopping) return;
    tr.stopping = true;
    holdAt(tr.gain.gain, now);
    tr.gain.gain.linearRampToValueAtTime(0, now + FADE_S);
    try {
      tr.src?.stop(now + FADE_S + 0.1);
    } catch {
      /* already stopped */
    }
    setTimeout(() => {
      try {
        tr.gain.disconnect();
      } catch {
        /* gone */
      }
      this.tracks = this.tracks.filter((x) => x !== tr);
    }, FADE_S * 1000 + 400);
  }

  private playFile(m: FileMood, buf: AudioBuffer): void {
    const now = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + FADE_S);
    gain.connect(this.bus);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = m !== 'finale';
    src.connect(gain);
    src.start(now + 0.02);
    const tr: FileTrack = { mood: m, gain, src, stopping: false };
    this.tracks.push(tr);
    if (m === 'finale') {
      src.onended = () => {
        if (!tr.stopping && this.mood === 'finale') {
          tr.stopping = true;
          this.tracks = this.tracks.filter((x) => x !== tr);
          try {
            gain.disconnect();
          } catch {
            /* gone */
          }
          // Hand back to the night loop.
          this.mood = 'off';
          this.setMood('night');
        }
      };
    }
  }

  private load(m: FileMood): Promise<AudioBuffer | null> {
    const hit = this.cache.get(m);
    if (hit) {
      // Refresh LRU order.
      this.cache.delete(m);
      this.cache.set(m, hit);
      return Promise.resolve(hit);
    }
    const inflight = this.loading.get(m);
    if (inflight) return inflight;
    const pr = (async () => {
      try {
        const res = await fetch(fileUrl(m));
        if (!looksLikeAudio(res)) return null;
        const ab = await res.arrayBuffer();
        const buf = await new Promise<AudioBuffer>((resolve, reject) => {
          const r = this.ctx.decodeAudioData(ab, resolve, reject) as Promise<AudioBuffer> | undefined;
          if (r && typeof r.catch === 'function') r.catch(() => {});
        });
        this.cache.set(m, buf);
        // Keep at most two decoded files (current + the one fading out).
        while (this.cache.size > 2) {
          const oldest = this.cache.keys().next().value as FileMood;
          this.cache.delete(oldest);
        }
        return buf;
      } catch {
        return null;
      } finally {
        this.loading.delete(m);
      }
    })();
    this.loading.set(m, pr);
    return pr;
  }

  tick(until: number): void {
    this.score.tick(until);
  }
}
