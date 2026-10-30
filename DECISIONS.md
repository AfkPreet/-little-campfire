# Decisions

Every decision as **chosen / rejected / why**. Newest sections at the bottom of each group. The locked spec lives in `docs/SPEC.md`; the world in `docs/WORLD.md`.

## 1. Locked in the pre-build interview (spec section 2)

| Area | Chosen | Rejected | Why |
| --- | --- | --- | --- |
| Genre | Cozy camping sim | Survival with hunger and warmth meters | Threat kills the serene feel; the hook is curiosity instead |
| Pressure | One positive-only Contentment level, no fail state | Soft or real survival stakes | Satisfaction should only rise; nothing punishes |
| Look | 2D side-view storybook, layered parallax | 3D diorama, 2D top-down, pixel art | Most reliably gorgeous from pure code; the others need hand-made art or are risky in one pass |
| Art source | 100% drawn in code | AI-generated sprites and backgrounds | Code art can bounce, blink and relight for dawn, night and rain; generated art cannot, and its style drifts |
| Palette | Muted pastels | Bright candy pastels, warm picture-book | Serene first, cute second; relights beautifully |
| World | Claude invents the setting, hero critter and cast | A fixed setting | One coherent world, locked in `ART_BIBLE.md` |
| Food | Fishing and foraging | Hunting, traps, gardening | Eating cute critters breaks kawaii; gardening adds scope |
| Feel | Gentle tap-timing fishing; drag-and-stir recipe discovery | Skill minigames, idle auto-play | Engaging without stress |
| Shelter | Pitch a tent, then decorate | Build from parts, one-tap tent | A satisfying setup plus self-expression |
| Structure | 7-day trip on a soft clock, then optional free play | Endless sandbox, several campsites in v1 | A clear arc without 3x the art |
| Economy | Starting budget; sell extras to earn | Fixed budget only, daily allowance | Creates the core loop |
| Hooks | Journal and mystery at full depth; companion and rare moments light, triggered by Contentment | All four at full depth | Four separate systems would thin out polish; the journal is the one spine |
| Sound | Lo-fi plus nature. Music: files generated in Higgsfield. SFX, ambience and a fallback score in code | All-code music, no music | Music is code's weak spot; the game must still sound complete without the files |
| Platform | Browser, touch-first, landscape | Keyboard-first, phone portrait | Mostly played on iPad; mouse still works |
| Build | Autonomous milestones with screenshot self-review | Pausing for review, one straight pass | Self-critique is where the visual quality comes from |
| Ship | Vercel | Local only, Higgsfield community | A shareable link that opens on iPad |

## 2. Engine and tooling (M0)

| Area | Chosen | Rejected | Why |
| --- | --- | --- | --- |
| Engine version | Phaser 3.90.0 (latest 3.x), pinned | Phaser 4.x | Spec says Phaser 3; 3.90 is the final, most stable 3.x |
| Build tool | Vite 7.3.7 + TypeScript 5.9.3, pinned | Vite 8 (Rolldown), TypeScript 7 (native preview) | Both newer majors are fresh; the 7/5.9 pair is battle-tested and cross-platform |
| Resolution model | Canvas backing store at device px (DPR capped at 2); every camera uses origin (0,0) and zoom = deviceHeight / 720, so all code works in logical units with height 720 and a flexible width | Phaser FIT/ENVELOP scale modes, letterboxing | Scale modes blur on Retina or letterbox; this keeps text and edges sharp and lets wide screens show more world (spec section 10) |
| Art texture scale | Textures drawn at ART_SCALE = clamp(zoom, 2, 2.5) and displayed at 1/ART_SCALE | A fixed 2x | Spec asks for 2x; on a 12.9" iPad (zoom 2.84) a fixed 2x would upscale 1.4x and soften outlines. 2.5 cap keeps memory sane |
| Texture upload | Draw each texture on its own Canvas 2D, convert to an ImageBitmap (premultiplied), register with Phaser, then release the canvas | Keep a canvas per texture (`addCanvas`) | iOS Safari caps total canvas memory (~384 MB); bitmaps live outside that cap. Verified no alpha fringing in Chromium |
| Wide layers | Auto-chunked "strips" (max 2048 device px per chunk) | One huge texture per parallax band | Mobile GPUs cap texture size; chunks stay well under 4096 |
| Light & atmosphere | Multiply-tint every band by a per-key colour, plus tinted haze bands between depth bands and additive glow sprites | Per-frame redraws, heavy post-FX bloom | Tints and pre-baked glows cost nothing per frame and relight smoothly; bloom shaders are risky on iPad |
| Random | mulberry32, named streams (weather, fish, forage, moments, misc) saved with the game | One shared RNG | Extra casts must not change tomorrow's weather; deterministic seeds make screenshots and smoke tests repeatable |
| Content IDs | Stable ids from the spec names (`pebble_minnow`), display names come from the reskin | Using display names as ids | The reskin can change names freely without breaking saves |
| Scene registry | Every `src/scenes/*.ts` default export auto-registers; art modules auto-bake via `import.meta.glob` | Hand-maintained lists | Lets art and scene work proceed in parallel without merge conflicts |
| Previews | `?scene=preview&what=<name>` runs any `*.preview.ts` | Only the full style board | Each art/UI module can be screenshotted in isolation during review |
| Shots/smoke | Playwright 1.63.0 (matches the pre-installed Chromium), Node scripts only | bash scripts, Puppeteer | Cross-platform (Windows + macOS) as the spec requires |

## 3. Systems interpretations (M0)

| Area | Chosen | Rejected | Why |
| --- | --- | --- | --- |
| Day timeline | p = 0..1 over 480 s: Dawn 0-0.10, Morning 0.10-0.40, Afternoon 0.40-0.65, Golden hour 0.65-0.82, Dusk 0.82-1.0; Night holds at p >= 1 | Equal slices | Dawn and dusk are the prettiest but should feel fleeting; mornings and afternoons are where the loop happens |
| "Day" for fish | Morning through golden hour (spec definition) | — | Spec text |
| "Day" for forage | Any time except night | Morning through golden hour only | Being stricter about berries at dawn adds frustration without adding curiosity; still distinct from "any time" at night |
| Decor ownership | Each decor item is bought once ("Owned" on the card), placed once | Buying several of the same | Matches the spec's Buy/Owned card; contentment baseline counts placed items and is capped anyway |
| Sleeping without a tent | The fire offers "Sleep" at night when no tent is pitched (under the stars, tent bonus +0) | Hidden or no way to sleep | Spec: nobody can get stuck |
| Night rain guarantee | If no rainy night by Day 4, rain begins at Day 4 dusk | Forcing Day 4 to be a rainy day | Keeps the day's rolled weather; "Night 4 rains" is what the spec asks |
| Mystery rain guarantee | After the dumplings are cooked, rain begins at that day's dusk (or the next night if already night) | Waiting a full day | Spec: "the next night rains" |
| Mid-day weather change | 10% per day (not Day 1), at p 0.25-0.75; rain fades in/out over ~8 s | Abrupt switch | Serene |
| Rod hint | Shown once per day, after 3 casts while a Willow-Rod+ fish is in season with a weaker rod | Every 3 casts | Gentle, not naggy |
| Dish price floor | max(listed price, ceil(1.25 x ingredient value)); staples at shop price, Moon Blossom 0 | — | Spec rule; rare fish make pricier dishes |

## 4. The world (M0) — full rationale in `docs/WORLD.md` section 9 and Appendix A

Process: four independent concepts (Eastern Himalaya, Western Ghats, Meghalaya, open choice), three lens judges (visual-in-code, cast & originality, systems & culture), then a synthesis that fixed every judge problem and grafted the best runner-up ideas. Scores: Himalaya 25.5, Ghats 23.5, Meghalaya 21.5, Open 19.5.

| Area | Chosen | Rejected | Why |
| --- | --- | --- | --- |
| Overall | "Himalaya", revised | "Ghats" (Little Monsoon) — finale collided with real offering rites; "Meghalaya" — see-through riverbed fights the side view, generic kitten hero | Top total, 2 of 3 judges; the mystery dish, the region's food and the title are one word; every lighting state has a code-native spectacle |
| Title | **Moonlight Momos** | Cloud & Kettle (generic, "&"); Junkiri (one word, unparseable) | 2 words, alliterative, regional, names the mystery dish; no existing game found (WebSearch) |
| Setting | Junkiri Danda / Jun Pokhari, fictional monsoon ridge lake | Darjeeling tea slope (rigid stripes, no lake); Teesta valley (loses snow ridges + cloud sea; kept as the teaser) | Natural depth bands from simple shapes, mist that belongs, monsoon rain as the reward |
| Hero | **Tuki**, large-eared pika with a doko basket | Red panda (reads as Retsuko / Mei / Shifu); Himalayan marmot (generic blob) | Native, round, tailless; haying behaviour becomes the quirk; the doko silhouette is unique |
| Shopkeeper | **Boju**, grandmother yak with knitted horn cosies | Black bear (genre default, feared); Takin (Bhutan, resists kawaii) | The high-camp animal; knitting explains the Wool Bunting and Shawl Hammock |
| Companion | **Kopila**, pangolin pup | Collared owlet ("ullu" is an insult; genre default); slow loris (feeds pet-trade imagery) | Shy and nocturnal; curling into a bud-ball is the tap-to-hide gag |
| Guardian | **Kuhiro**, great mist-fish | Naga/serpent (living faith, Haku); giant mahseer/koi (too close to catchable fish; Tui and La) | Mist-is-breath lore ties weather, clue 1 and the finale; freckles = constellation |
| Currency | **Rupees, written ₹120** | Cowrie shells (ritual use, ocean shells); paisa (120 paisa = ₹1.20) | Honest and instantly understood; format rules prevent misreads |
| Lead instrument | **Bansuri / murali** (Nepali hill-folk style) with madal by day | Sarangi (melancholy, generators flatten it); tungna (generators don't know it) | Sounds like mist and wind; easy to fake well in Web Audio for the fallback |
| Rain gear | **Ghum** cane-and-leaf hood | Leaf umbrella (Totoro); flipped doko hat (costume cliché, spills flowers) | Regional, hands-free, keeps the ears visible |
| Content reskin | Every name/flavour from WORLD 7; every number unchanged; ids stay the spec ids | Changing numbers to fit flavour | Balance is locked; ids keep saves stable |
| Fish base sizes | Garra 7, Barb 12, Asala 24, Danio 9, Loach 10, Glowfin 14, Katle 38, Mahseer 55 cm | — | Spec gave ±30% but no base; real-species proportions |
| Camp layout | WORLD 3.2 anchor lines (walk line 585, dock 575, lake horizon 452) | My earlier placeholder (612) | Fits the composition rule (top 40% sky/ridges, hero on the lower third) |

### Accents (spec: every accent logged)

All 74 accents from WORLD.md section 8 were added to `ACCENTS` in `src/palette.ts` with their exact names and hexes; every one is at or below 40% HSB saturation (verified by script at M0). One of my own engine values failed the check (night water tint `#3F4670`, 43.7%) and was changed to the world's night-lake colour `#4E5A7A` (36.1%). The spec-locked night sky top `#2F3558` (46.6%) is a lighting key, not an accent, and stays as specified.

## 5. Build process and integration (M0 → M1)

| Area | Chosen | Rejected | Why |
| --- | --- | --- | --- |
| Who builds what | Lead writes the engine spine, systems, scenes and integration; parallel agents build art modules (landscape, cast, guardian, props, icons) and the audio engine against fixed API contracts, each followed by review | One agent per milestone; lead writes everything | Art is the bulk of the work and parallelises cleanly by file; contracts keep it coherent |
| Lazy world scenes | Camp, Shop, Title, Intro and the style board load lazily in Boot (skipped entirely in previews) | Eager registration of every scene | A half-finished art module can only break its own scene, never the previews other modules use; smaller first bundle |
| Iteration screenshots | `scripts/shot.mjs` renders at 1x; milestone shots (`npm run shots`) at 2x | 2x everywhere | Software WebGL on a loaded 4-core box managed ~1 frame per 2 s at 2x |
| Shared dev server | `NO_HMR=1` (no live reload) for the screenshot server | Default HMR | Every edit reloaded every agent's open page mid-screenshot |
| Shop layout | Catalog card sits between the HUD's top and bottom rows; 2 rows of item cards per page on short screens, 3 on tall | Full-height catalog | The HUD (money, time, backpack, journal) must stay visible in the shop |
| Long tab labels | Auto-shrink a label to fit its tab | Abbreviating "Fishing"/"Kitchen" | Spec strings stay literal; narrow iPad catalog still fits six tabs |
| Interrupted agents | Agents write a compiling first version within their first steps, then improve in place | Plan-then-write | The usage limit cut agents off three times; incremental files survive |
| Deploy route | Vercel via the connected Vercel account (git-based deploy of the GitHub repo) if available, else `npx vercel --prod` | Only the CLI | The CLI needs an interactive login in this environment |
