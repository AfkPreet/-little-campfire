# Music brief — Moonlight Momos

The game sounds complete without these files (a generative lo-fi score plays in Web Audio). When you add any of the four files below, the game detects them at boot and crossfades between them by time of day and weather (4 s fades). No code change needed.

## Where to put the files

```
public/audio/music_day.mp3
public/audio/music_rain.mp3
public/audio/music_night.mp3
public/audio/finale.mp3
```

Then commit and push (Vercel rebuilds from the repo), or run `npx vercel --prod` locally. Any missing file falls back to the generated score for that mood. `finale.mp3`, when present, replaces the loop during the guardian finale. Music ducks by 30% under the catch fanfare automatically.

## Shared direction (all four)

- **Instrumental only.** No vocals, no spoken word.
- **Lead instrument:** a breathy Nepali bamboo flute (bansuri / *murali*) in a gentle hill-folk style, with soft ornaments (grace notes, slides). Never shrill.
- **Bed:** felt piano and warm Rhodes, soft and close.
- **Key:** D major, melody mostly on the D major pentatonic (D E F♯ A B). Harmony over a slow **Dmaj7 → Bm7 → Gmaj7 → A** loop (I-vi-IV-V).
- **Mood:** serene, cozy, curious; a misty Eastern-Himalayan monsoon ridge with a lake, rhododendrons, tea and steamed momos. Lo-fi warmth (a touch of tape/vinyl softness is fine; no heavy crackle).
- **Avoid:** religious or ritual sounds (singing bowls, temple bells, chanting), sitar-drone clichés, aggressive drums, sharp transients, anything that sounds urgent.
- **Loops (day, rain, night):** 120-150 s, **loop-friendly: no fade in or out, ends on the tonic** so the end flows back into the start.

## Prompts (paste into Higgsfield)

### 1. `music_day.mp3` — morning to golden hour

> Instrumental lo-fi, 76 BPM, D major pentatonic over a slow Dmaj7–Bm7–Gmaj7–A loop. Breathy Nepali bamboo flute (bansuri) lead with gentle hill-folk ornaments, felt piano, warm Rhodes, soft brushed drums with a light madal hand-drum pattern. Misty Himalayan morning by a lake, cozy and unhurried, sunlit and curious. 120–150 seconds. Loop-friendly: no fade in or out, ends on the tonic.

### 2. `music_rain.mp3` — rainy days and rainy nights

> Instrumental lo-fi, 72 BPM, D major pentatonic over Dmaj7–Bm7–Gmaj7–A. Bansuri in its low, breathy register, Rhodes and felt piano like dripping eaves, a soft shaker only — no hi-hats, no kick. Rainy monsoon afternoon on a tin roof, intimate and cozy, the rain is a gift. 120–150 seconds. Loop-friendly: no fade in or out, ends on the tonic.

### 3. `music_night.mp3` — dusk and night

> Instrumental ambient lo-fi, 68–70 BPM, no drums. Distant, reverbed bansuri phrases, sparse felt piano, faint pentatonic plucks (kalimba-like), a soft warm pad. Indigo night by a campfire under stars and fireflies, calm and sleepy. D major pentatonic over Dmaj7–Bm7–Gmaj7–A. 120–150 seconds. Loop-friendly: no fade in or out, ends on the tonic.

### 4. `finale.mp3` — the guardian finale (plays once)

> Instrumental, 40–60 seconds, D major. A bansuri melody that slowly blossoms over a warm string pad and gentle chimes (no bells of worship), felt piano underneath. Wonder and gratitude as a huge gentle glowing spirit-fish rises from a rainy moonlit lake, the clouds part to stars and a moonbow. Swells softly, then settles. Ends on the tonic.

## Mixing notes

- Master the loops quietly (around -16 LUFS integrated); the game mixes ambience and SFX on top and nothing should be louder than the music bed except the catch fanfare.
- Keep the low end gentle (iPad speakers): roll off below ~60 Hz.
- MP3 at 160-192 kbps stereo is plenty.
