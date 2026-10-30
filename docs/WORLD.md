# WORLD.md: Moonlight Momos (locked)

*a tiny camping trip*

**Status:** LOCKED. This is the single source of truth for the world, cast, names, reskinned tables and setting accents. It extends `docs/SPEC.md` sections 4, 6, 8 and 9 and never contradicts them. `ART_BIBLE.md` Part B, `DECISIONS.md`, `src/palette.ts` (`ACCENTS`) and `src/data/*.ts` are derived from this file. Every number in section 7 is copied unchanged from SPEC section 6. Only names, flavour text and looks change.

**Winning concept:** "himalaya" (judge total 25.5). It has been revised to fix every problem the three judges raised, and it carries the best ideas from "ghats", "meghalaya" and "open" where they fit. Appendix A lists each fix and each graft.

---

## 1. Title

| Item | Locked value |
| --- | --- |
| Final title | **Moonlight Momos** |
| Subtitle | **a tiny camping trip** (unchanged) |
| Logo (code-drawn) | Two lines in Baloo 2 ExtraBold: "Moonlight" above "Momos". Fill is cream `#F6EFE6` with a 3 px `gurans-deep` `#C07A84` outline and a soft `glow` bloom. Each "o" in "Momos" is a tiny steamed momo: a cream circle with 5 short pleat strokes on top in `steamer` `#C9CDD3`, plus a faint `fish-glow` `#DCE8F5` halo. A thin crescent moon in `moon-gurans` `#F3EEF5` tucks into the first "M". No other ornament. |
| Meta description | "Moonlight Momos: a tiny, cozy camping trip. Fish, forage, cook by the fire, and meet the gentle guardian of the water." |

**Title uniqueness check** (WebSearch, 30 Oct 2026)

- **Queries:** `"Moonlight Momos" game` and `"Moonlight Momos" Steam OR itch.io OR "App Store"`.
- **Result:** no game, app or itch.io page has this title.
- **Nearest hits** (all different titles):
  - *Momodora: Reverie Under the Moonlight* (2016) and *Momodora: Moonlit Farewell* (2024), both by Bombservice. They are dark action Metroidvanias that share only the "Momo" prefix and a moon word.
  - *Marimomo*, *Momoguro: Legends of Uno* and *Momo's Mansion*: small, unrelated games about collectible "momos".
  - *Moonlight* (a delisted Steam game), *Moonlight Cow: Guardian of the Night* (Steam, coming soon) and *Moonlighter*.
- **Verdict:** clear. The closeness to Momodora is acceptable because the genre and the words are different.
- **Before the M4 deploy:** web search misses tiny jam games, so repeat an exact-title search on Steam, itch.io and the App Store.

**Place-name check** (same session)

- "Jun Pokhari" and "Junkiri Danda" match no real place.
- Similar real names: **Jor Pokhari**, a temple lake in Soreng, Sikkim, and **Jumley Pokhari** on the Singalila trail. So the lake is never spelled "Jor", and nothing near it ever looks like a temple. The sacred lakes **Panch Pokhari** and **Gupha Pokhari** are not used or echoed.
- The concept's earlier check found no real "Sunthala Bend".

---

## 2. Placeholder map

| Spec placeholder | Exact string | How it reads in the spec's literal strings |
| --- | --- | --- |
| `{Title}` | `Moonlight Momos` | Title logo; "Moonlight Momos: Trip 1"; the meta description |
| Subtitle | `a tiny camping trip` | Title screen |
| `{Hero}` | `Tuki` | "Tuki has been saving up for a little camping trip." / "Tuki's Journal" |
| `{Shopkeeper}` | `Boju` | "Boju's General Store" |
| `{Companion}` | `Kopila` | "Share with Kopila" / "Kopila wants to stay with you!" |
| `{Water}` | `Jun Pokhari` (no article inside the placeholder) | "Old campers say a gentle guardian lives in the Jun Pokhari." / "A rainbow over the Jun Pokhari!" / "You met the guardian of Jun Pokhari." All three spec templates read naturally as written, so none needs changing. |
| `{Next campsite}` | `Sunthala Bend` | "Next trip: Sunthala Bend. Coming soon." |
| Place (prose only) | `Junkiri Danda` | Intro art, album, flavour lines |
| Guardian name (prose only) | `Kuhiro` | Shown only after the legend (Boju's lore line and the lantern name). UI strings keep saying "the guardian". |
| Glimmering Scale | `Moon Scale` | Item card, journal clue 2 |
| Guardian Lantern | `Kuhiro's Lantern` | Decor card, finale gift |
| "Willow Rod+" rod tag | `Rattan Rod+` | Fish table and journal hints |
| Bait toggle | `None` / `Atta` / `Mica` | Fishing UI |

**Currency: rupees**

| Rule | Value |
| --- | --- |
| Name | rupees (singular: rupee) |
| Symbol | `₹` |
| How amounts are written | Symbol first, no space, whole numbers only: **`₹120`**, `₹40`, `₹2`. |
| Never | Decimals, "Rs", "INR", "/-", "k" for thousands, or the word "paisa" |
| Prose | "120 rupees" may appear in flavour or dialogue text. All UI uses `₹120`. |
| HUD | Top-left: a copper coin icon followed by `₹120` |
| Spec conversions | Every "c" in the spec becomes `₹`: start budget `₹120`; Day-1 essentials about `₹80`-`₹95`; Mystery Mush sells for `₹2`. |
| Font | Baloo 2 is the UI font because it has the `₹` glyph. Patrick Hand (journal and banners) may lack it, so any amount inside handwritten text is set in Baloo 2, or `₹` is drawn as a small vector glyph. |
| Coin art | Copper `#C99A7E` disc with a `butter` rim highlight, a 5-dot gurans emboss in `gurans-deep` `#C07A84` at 50% alpha, and a tiny `₹` stamped in `copper-line` `#9E7A64`. |

---

## 3. Setting

### 3.1 Place, water and region

- **Place: Junkiri Danda** ("Firefly Ridge": Nepali *junkiri* = firefly, *danda* = ridge).
  - A fictional monsoon-ridge camp at about 3,000 m in hills like those of Sikkim and Darjeeling.
  - Nothing here claims a real or sacred site.
- **Water: Jun Pokhari** ("Moon Pond": *jun* = moon, *pokhari* = pond or lake).
  - A small, round, jade high lake in a bowl of old rhododendron trees (*gurans*).
  - Its near shore curls around the camp clearing like a cupped hand.
  - **Lore:** the lake is always a little misty because the mist is Kuhiro breathing.
- **Next campsite: Sunthala Bend** ("Mandarin Bend": *sunthala* = hill mandarin).
  - A warm river bend among orange orchards in the valley far below: warm where Junkiri Danda is cool.
  - **Postcard art:** round orange trees heavy with fruit (`ainselu` `#E6C392` dots on `moss` domes), one curl of jade river, a small bamboo footbridge silhouette and peach light.
- **The view:**
  - Past the lake, the land drops into a **sea of cloud**.
  - One nearer ridge pokes through, wearing broad **tea-terrace stripes** and a few **pastel tin-roofed hill houses**. Their windows light up at dusk like a necklace.
  - Behind everything float **the Snow Grannies**: a range of soft, pillow-round snow peaks (Boju's name for them) that blush pink at dawn. They are deliberately not any real mountain.
- **Region flavour:**
  - Eastern-Himalayan hill country, Nepali-speaking: chiya in small glasses, momos, rain on tin roofs, rhododendron bloom, laughingthrush chatter, monsoon cloud that walks through the forest.
  - **Language rule:** names are English-first, with at most one hill word per name. Every hill word is quietly translated by the item's flavour line the first time the player sees it.
- **Cast plausibility:**
  - Large-eared pikas and domestic yaks belong at this altitude.
  - Chinese pangolins live in the forests just below. Kopila "wanders up the bamboo path on monsoon nights", which is why it appears only at dusk and night.

### 3.2 Camp layout (Camp scene, side view, left to right)

**Frame and anchor lines**

- **World size:** 2800 logical px wide at logical height 720. iPad landscape shows about 1340 px; phone landscape about 1560 px. The camera follows Tuki.
- **Anchor y lines:**

  | Line | y | Notes |
  | --- | --- | --- |
  | Lake horizon (far-shore waterline) | 452 | |
  | Back rim of the clearing's grass | 500 | |
  | Walk line (feet) | 585 | |
  | Dock deck | 575 | |
  | Open-water surface | 590 at the dock | |
  | Foreground band | 610-720 | |

- **Hero placement:** Tuki (about 104 px) stands from y 481 to 585, on the lower third.

**Props, left to right**

| x (logical px) | Area | Contents |
| --- | --- | --- |
| 0-160 | **Shop path exit** | 3 flat stone steps climb off-screen to the left. The corner of **Boju's General Store** peeks in at x 30-150: a powder tin-blue roof wedge, the dented-kettle sign and a curl of chimney smoke, half behind bamboo. Tapping it or walking off-screen opens the Shop scene. |
| 160-520 | **Bamboo path** | Flat stone slabs at x 220, 330 and 440, with 2 malingo bamboo clumps at x 200 and x 480 (ground band). |
| 520-1990 | **Camp clearing** | Grassy point. The lake shows as a strip (y 452-500) behind its back rim; that strip is not castable. Props, left to right:<br>- x 560: **Katus tree** (forage: Katus Nuts).<br>- x 660: **Sisnu patch** (forage: Sisnu Nettles).<br>- x 780: **Tent spot A**.<br>- x 930: **Ainselu bush 1**.<br>- x 1020: **Mossy log 1** (Puffcap Chyau).<br>- x 1060: **Bud Bush**, drawn on the back rim behind the fire. A low rhododendron with closed buds; Kopila peeks from it. Not a forage spot.<br>- x 1160: **Fire**: a ring of 7 round stones and 3 crossed logs. The Pirka Stool or Radi Rug default spot is at x 1100.<br>- x 1320: **Tent spot B**, the default spot nearest the fire.<br>- x 1470: **Ainselu bush 2**.<br>- x 1560: **Mossy log 2**.<br>- x 1700: **Tent spot C**.<br>- x 1840 and x 1990: **Hammock point**, two old rhododendron trunks (the two-tree snap point). Their low branches carry 2 extra decor hang points. |
| 1990-2240 | **Shore** | Grass gives way to round pebbles and a short reed line. Two night-time spots sit here:<br>- x 2120: **Moon Gurans bush** (night-only forage spot after clue 3), a small rhododendron at the dock's root.<br>- x 2180: the **Moon Scale sparkle** (clue 2), on the pebbles.<br>Tapping the water within reach of the shore (x 2200-2320) casts from the shore. |
| 2240-2520 | **Dock** | 5 rounded planks on 3 round posts (x 2290, 2400, 2510), reaching right over the water. Tuki casts from the dock end at x 2500. The "Leave an offering" bubble appears here. |
| 2200-2800 | **Open water** | The Jun Pokhari fills y 452-720 to the right edge of the world. Kuhiro rises at x 2660, facing left toward the dock. The first-night glow drifts at about x 2700, y 470 (far out). |

**Forage spots (7):** 2 ainselu bushes, 2 mossy logs, 1 sisnu patch, 1 katus tree, and the Moon Gurans bush (night only, after clue 3).

**Interactables:** Tent spots 3, fire 1, hammock point 1, dock 1, shop exit 1. At most 3 glow at once, and only near Tuki (SPEC §8).

### 3.3 Boju's General Store (Shop scene; simple shapes only, no text anywhere)

**The hut**

- A wooden hut (`shop-wood` `#C9AE92`, 4 broad plank lines) on 4 short round stilts, reached by 3 flat stone steps.
- **Roof:** a rounded wedge of corrugated tin in `tin-blue` `#A3B8CC`, with 5 vertical stripes 6% lighter.
- **Counter window:** wide, with a fold-up bark shutter. Boju stands behind it. A bench sits outside.

**Props and signage**

- **Window ledge:** 3 **geraniums growing in old ghee tins** (`steamer`-grey tins with rose 5-dot blooms).
- **Sign:** a dented aluminium **kettle hanging from the eave**.
- **Stacked boxes:** two **tea chests** (rounded boxes with bark edge strips).
- **By the door:** a spare **doko** (cone basket).
- **Under the eave:** a string of 6 cream **churpi** cubes (hard yak cheese) drying.
- **Chimney:** a tin pipe with 3 soft smoke curls.

**Shelves behind Boju**

- **Top shelf:** rounded jars (alpha 0.5) of katus, honey and rice.
- **Middle shelf:** coils of rose-and-butter wool.
- **Bottom shelf:** the **Momo Steamer**, stacked aluminium tiers. It stays hidden behind a cloth until clue 3.

**Weather, light and sound**

- The window glows warm at night.
- Rain makes the roof **plink**, and the shop's ambience adds tin-roof plinks.
- Through the open shutter, blurred and at low contrast, you can see mist and dhupi silhouettes.

### 3.4 Depth-band layer plan

**Build rules**

- **One generator per band.**
- **Bake to strips:** every band is drawn once into strip textures at 2x, then relit by the engine's multiply tint and haze bands (ART_BIBLE A3). Nothing is redrawn per frame.
- **Never draw band bases:** a mist strip or the lake always hides them.
- **Species limit:** at most 3 plant species per band in the near and foreground bands.
- **Atmospheric tint toward the horizon colour:**

  | Band | Tint |
  | --- | --- |
  | Snow row | 70% |
  | Far ridges | 55% |
  | Mid | 40% |
  | Near | 20% |
  | Ground | 0% |
  | Foreground | -8% (slightly darker and warmer than ground) |

**Bands, back to front**

| # | Band (engine key) | Scroll | y range (720 high) | Shapes, all rounded with no sharp corners | Base colours |
| --- | --- | --- | --- | --- | --- |
| S | **Sky** (`sky`) | 0.0 | 0-720 | Lighting-key gradient (3 stacked vertex-tinted bands).<br>**Sun:** soft disc with bloom.<br>**Moon:** cream disc with a lavender halo.<br>**Day cumulus "pillows":** unions of 4-6 circles with flat bottoms.<br>**Night:** stars, a faint lavender Milky Way strip and **the Gurans**: 6 slightly brighter stars in a flower shape (5 in a ring of radius 18 px around 1 centre star) over the lake at about 70% of screen width, y 120-150. The game never points it out, and it is visible on every clear night. It pays off in the finale (section 5.4). | Spec lighting keys; stars cream; Milky Way `lavender` at 0.15 |
| F1 | **Far: the Snow Grannies** (`far`, sub-row A) | 0.07 | Peak tips y 110-170, bases hidden by the cloud sea at about 300 | **5 snow peaks**, each a rounded triangle. **Corner radius 20-25% of peak height, never more**, so they read as mountains, not marshmallows.<br>**Sizes:** 120-190 px tall, 220-360 px wide, overlapping. The tallest ("Eldest Granny") sits at about 60% of the screen width.<br>**Asymmetric shoulders:** left flank slope about 0.9, right flank about 0.65. Vary them per peak.<br>**Lit/shade split:** a gentle S-curve runs from the summit down. The sun side (right) is `snow`; the shade side (left) is `snow-shade`.<br>**Rock wedges:** 2 rounded wedges on each shaded face, lower half only.<br>**Cloud banner:** by day, a soft one streams right off the tallest summit.<br>**Alpenglow mask:** a vertical gradient over the top 30% of each peak at dawn and dusk. | `snow` `#EEF0F4`, `snow-shade` `#C8C5DB`, rock `ridge-far` `#A9B0CC`, `alpenglow` `#F2C4B8` |
| M1 | **Mist A: cloud sea** | 0.08-0.1 | y 274-330 (38-45% of height, the eye's resting line) | **The signature horizon:** 2 sub-rows of overlapping circles (r 40-90) with a flat bottom, drifting in opposite directions at ±3 px/s.<br>It hides the snow bases. A per-key height parameter raises it at dawn, in rain and on misty mornings. | `cloud-sea` `#E4E3EE`, tops tinted by the key |
| F2 | **Far ridges** (`far`, sub-row B) | 0.1 | Crests y 250-320 | **Ridgelines:** two overlapping smooth lines (low-frequency sine plus noise) with tiny tree-dome bumps (r 4-8) on the crests.<br>**Cloud spill** (from "ghats"): a saddle between two humps where a soft cloud tongue pours through. Its lower edge creeps downhill at 2 px/s and dissolves, on a 40 s loop. It is thicker in rain and on misty mornings, and faint at night. | `ridge-far` `#A9B0CC`, spill `cloud-spill` `#ECEBF2` |
| M2 | **Mist B: valley ribbons** | 0.18 and 0.35 | y 330-360 and y 390-420 | 2 strips of 3 long soft ellipses each (600-1200 × 30-60), alpha 0.25-0.45, drifting 4-8 px/s. The lower strip hides the mid ridge's base. | `lavender` at 30% over `cream` |
| M | **Mid: tea and hill-town ridge** (`mid`) | 0.25 | Crest y 300-360, base hidden at about 400 | **Ridge:** one nearer ridge, kept **few and broad**.<br>**Tea terraces:** on its sunlit right flank, **4 terrace stripes** (10-12 px thick contour bands with round ends) alternating `tea-green` with a shade 8% darker.<br>**Hill houses:** **4 tiny houses**, each a 14 × 10 rounded rect with a roof wedge in `tin-blue`, `tin-rose`, `tin-mint` or `butter`.<br>**Window necklace:** 5 window dots (r 2, `glow` with bloom) switch **on one by one, 0.4 s apart, at dusk** and off one by one at dawn.<br>**Waterfall threads** (from "ghats"/"open"): **2 silver threads** (2 px, alpha 0.5) with a dashed shimmer scrolling down and a 3-circle mist puff at the base. They become **5 in rain** (fading in over 20 s), and 3 remain at the dawn after rain. | `ridge-near` `#8F9DB8`, `tea-green` `#A9C29A`, `tin-blue` `#A3B8CC`, `tin-rose` `#D4A9A6`, `tin-mint` `#A8C9BB`, threads `water-thread` `#E9EEF0` |
| N | **Near trees: the far-shore forest** (`near`) | 0.5 | Crowns y 330-440, base at the lake horizon y 452 (hidden by the lake mist and reed line) | **Exactly 3 species**, from one `treelineBand(seed)` generator:<br>(1) **Dhupi** (cryptomeria) cones: rounded teardrops 30-46 w × 90-140 h, in clusters of 2-4.<br>(2) **Rhododendron domes**: 3-5 circle masses in `moss`, each with at most 3 small gurans dabs (3-dot clusters, r 2-3).<br>(3) **Malingo bamboo fans**: 8-12 long arcs from one base, with leaf dabs.<br>**Reed line:** a pale line where the forest meets the water.<br>**Rain:** 3-5 **steam curls** (soft teardrops rising 4 px/s, then fading) lift off the canopy (from "open").<br>**Dusk:** a **junkiri ribbon**, a wavy line of 20 tiny glow dots on a slow sine, rises out of the forest once (15 s) (from "open"'s bat ribbon). | `dhupi` `#6F8E86`, `moss`, `gurans` `#D98F96`, `malingo` `#A3B88F`, reeds `reed` `#C9C29E` |
| W | **Water: Jun Pokhari** (`water`) | 0.5 at the far edge, 1.0 at the near edge (strips interpolate) | From y 452 down: a strip behind the clearing, the full depth past the shore | **Body:** vertical gradient from `lake-jade` (top) to `lake-deep` (near edge).<br>**Reflections:** the far, mid and near bands mirrored about y 452 at alpha 0.3-0.4, pre-rendered and cut into 6 px rows. Each row shifts on a slow sine (2-4 px).<br>**Sun or moon path:** a vertical stack of short horizontal dashes.<br>**Day sparkles:** cream 4-point glints. **Rain:** rings in 2 sizes.<br>**Shore foam:** rounded cream dashes.<br>**Under-glow** (clue 1 and the finale): an additive radial in `lake-glow` that lights the water from below (section 5.4). | `lake-jade` `#93B5B3` → `lake-deep` `#6E8A99`, `lake-glow` `#CFE6E2` |
| M3 | **Mist C: lake-breath** | 0.55-0.6 | Lies on the water, y 440-500 | Low wisps that curl up off the water. They **hide every near-tree base**. They are thick at dawn, on misty mornings, in rain and on guardian nights, and thin by day. **Lore:** this is Kuhiro breathing. | `cream` at 0.3-0.5 |
| G | **Ground and camp** (`ground`) | 1.0 | y 500 to the bottom | Scalloped grass top edge (sage over moss), round mossy boulders, the stone slabs, the firepit, tent spots, forage spots, the Bud Bush, pebbles, the dock, the shop corner, and the **two framing rhododendrons** (hammock point). Each framing tree has a trunk of 3 merged rounded curves and a canopy of 3-4 big domes carrying at most 8 gurans clusters; their tops leave the frame.<br>Ground shadows are soft `moss` at 25% alpha, never grey. | `sage`, `moss`, `bark`, stones `stone` `#B9B1B4` / `stone-shade` `#9C9298`, `pebble` `#CFC6C3`, dock `shop-wood` `#C9AE92` |
| FG | **Foreground** (`fg`) | 1.3 | Bottom corners, y 610-720 | **Exactly 3 species**, covering at most 20% of the frame, at alpha 0.9:<br>(1) **Big rhododendron leaves**: long rounded ovals 140-200 × 50-70 with a midrib, entering from the bottom corners. In rain, **rain beads** (cream circles r 3-5 with a highlight) slide to the leaf tip and drop every 1-3 s with a tiny bounce (from "ghats").<br>(2) **Grass blades with soft seed heads**, with per-blade sway. At golden hour the seed heads are **backlit** with a butter rim and glow (from "meghalaya").<br>(3) **Fiddlehead curls**: spiral strokes, 2-3 of them. | `moss` darkened 8%, `sage`, `butter` rim |

**Composition**

- The snows, cloud sea and ridges fill the top 40% of the frame.
- Tuki stands on the lower third.
- The cloud sea at 38-45% of the height is the soft horizon line the eye rests on.

**Cut on purpose (judge 1, "over-dressed")**

- Tree ferns, the magnolia branch, the orchid spray, lichen drapes, oak and katus domes in the near band, primula, and the bamboo leaf spray.
- Most gurans clusters.
- 2 of the 6 houses and 2-4 of the tea stripes.

### 3.5 Mist placement (summary)

1. **Cloud sea** (M1), between the snows and the far ridges: always present, and it rises in rain or mist.
2. **Valley ribbons** (M2), between the far ridges and the mid ridge (0.18) and between the mid ridge and the near trees (0.35).
3. **Lake-breath** (M3), on the water, hiding the near-tree bases.
4. **Ground mist** (parallax 1.0, alpha 0.5), **misty mornings only**: it drifts between the tents and the shore and burns off between in-game 10:00 and 12:00.
5. **Walking mist** (rain only): 2-3 big slow wisps cross the near band and the ground band's framing trees at 6 px/s.

---

## 4. Lighting keys in this world

The sky top and horizon colours are the spec keys. The table gives the target base colour of each band per key; the engine reaches it by multiply tint and haze. All values are at or below 40% HSB saturation (checked).

| Key | Snow, lit / shade | Far ridge | Mid ridge | Near trees | Lake | Mist colour @ alpha |
| --- | --- | --- | --- | --- | --- | --- |
| Dawn | `#F2C4B8` top 30% / `#C8BEDA` | `#B7ADCB` | `#A8A6BC` | `#8E9C94` | `#D9C3CC` | `#F4E1D6` @0.6 |
| Day | `#EEF0F4` / `#C8C5DB` | `#A9B0CC` | `#9DAFAA` | `#7E9C82` | `#9DBDC0` | `#EEF2F0` @0.35 |
| Golden hour | `#F3E2BC` / `#C9B9C9` | `#CDB9B3` | `#C4BB9A` | `#8E9A76` | `#E2CFA4` | `#F6E3B4` @0.3 |
| Dusk | `#E3B5B8`, then `#A79BC0` climbing / `#A79BC0` | `#9C8FB8` | `#8F8DA8` | `#5F6E72` | `#A99AB8` | `#D8B8C4` @0.4 |
| Night | `#C9D2E6` @0.35 (ghost range) / `#5A6088` | `#444A70` | `#4B5A6E` | `#3E4C5A` | `#4E5A7A` | `#6A6F96` @0.35 |
| Rain (overlay) | snows at alpha 0.1 | `#A3A9BA` | `#9DA8A3` | `#7F8E86` | `#8E9BAB` | `#C4CAD4` @0.55 |
| Misty morning | hidden | ghost `#D8D6E2` | ghost `#CFCFDA` | `#B3BDB5` @0.35 | `#DCE0E2` | `#EEF0F0` @0.7 |

**Dawn: "The Grannies blush first."**

- **Sky and sun:** lavender to peach. A peach sun disc rises behind the Eldest Granny's right shoulder, in low, cool light.
- **Peaks:** the alpenglow mask covers the top 30% of every peak in `alpenglow`, while the lower snow stays lavender.
- **Ridges:** each far-ridge crest gets a 3 px peach rim on its sun side.
- **Mist:** the cloud sea is lavender-cream with peach-kissed tops and sits high. The lake-breath is at its thickest: 3-4 slow curls rise off the water.
- **Hill town:** the window necklace switches **off** one by one, 0.4 s apart.
- **Water:** a pale pink-mauve mirror with lavender peak reflections. Mist wisps slide across it.
- **Camp:**
  - Dew glints (cream 4-point twinkles) on the foreground rhododendron leaves.
  - Forage spots sparkle once as they refresh.
  - The last 3-4 junkiri wink out.
  - Boju's chimney puffs its first smoke at the shop corner.
- **Sound:** a single soft barbet call.

**Day: everything legible and airy.**

- **Sky:** clear `#A9C9E3`, with 2-3 pillow cumulus clouds parked above the snows.
- **Shadows:** light, tinted `moss`, never grey.
- **Peaks:** crisp cream snows with powder-lavender shade faces, and the cloud banner streaming off the Eldest Granny. The cloud sea is bright cream and sits low.
- **Mid and near bands:**
  - The tea stripes are clear tea-green, and the tin roofs read as candy chips.
  - 2 waterfall threads shimmer.
  - The rhododendron domes are in bloom.
- **Water:** jade with cream sparkle glints and a crisp mirror of the ridges.
- **Particles:** drifting **gurans petals** (rose ellipses tumbling, at most 12 on screen).
- **Sound:** laughingthrush chatter. In the music, soft brushed drums with light madal pats.

**Golden hour: warm halos on everything round.**

- **Sky:** warm, low sun from the right.
- **Two-tone rim** (from "open"):
  - A 2-3 px `butter` rim on the sun side of every rounded mass: peaks, ridge crests, tree domes, the tent, Tuki's ears and the doko rim.
  - Shade sides go lavender.
- **Peaks:** butter-gold (`#F3E2BC`), with the rock wedges going peach. The cloud sea turns honey.
- **Mid band:** the tin roofs flash tiny butter glints.
- **Foreground:** backlit grass seed heads glow (from "meghalaya").
- **Water:** a butter sun path of stacked dashes, with long gold reflections of the peaks.
- **Camp:** long soft `moss`-tinted shadows, floating pollen motes, and a gold glow on the chimney smoke at the shop corner.
- **Golden evening weather:** extends this key and adds a 10% butter haze.

**Dusk: last light climbs the peaks; first lights dot the ridge.**

- **Sky:** purple-pink, with the first 6-10 stars fading in.
- **Peaks:** they go rose (`#E3B5B8`), then a **lavender shadow climbs from base to summit over about 20 s**: the alpenglow mask is driven in reverse. The cloud sea turns lilac.
- **Mid band:** the **window necklace switches on one by one, 0.4 s apart** ("the ridge puts on its necklace").
- **Near band:** plum-sage. The **junkiri ribbon** rises once.
- **Water:** a pink-lavender mirror with the first star reflections.
- **Camp:**
  - The first 8-10 junkiri appear low over the clearing.
  - The fire comes into its own.
  - The shop-corner window warms.

**Night: the whole valley twinkles.**

- **Sky:** soft indigo, never black. Dense stars, the Milky Way strip, and the Gurans constellation over the lake. A cream moon with a lavender halo hangs above the snows.
- **Three tiers of light:**
  - **Above:** stars.
  - **Across the valley:** the window dots flicker gently. The snows glow faintly moon-blue (`#C9D2E6`, alpha 0.35) as a pale ghost range.
  - **Below:** 20-40 junkiri, the firelight pool (additive radial), tent glow and laltin pools.
- **Ridges:** deep indigo-lavender cut-outs with a cool moon rim on their top-left edges.
- **Water:** a moon path of ripple dashes, plus a warm firelight reflection near the shore.
- **First night only:** the clue-1 glow (section 5.4).
- **Sound:** crickets and a trickling stream. No drums.

**Rain overlay: the monsoon, moody and intimate.**

- **Base:** the spec's 40% blend toward `#9AA6B8` with 30% desaturation.
- **Sky:** a low pewter-lavender cloud ceiling.
- **Far bands:**
  - The snows vanish (alpha 0.1).
  - The cloud sea **rises to swallow the far ridges**, and the cloud spill pours twice as fast.
- **Mid band:** becomes a ghost ridge. Waterfall threads multiply **2 → 5** over 20 s.
- **Mist and near band:**
  - **Walking mist** crosses the near band and the framing trees.
  - Dhupi tops vanish into cloud.
  - Steam curls rise off the canopy.
- **Water:** rings everywhere, a softened mirror (alpha 0.2) and splash puffs on the dock planks.
- **Rain particles:** 2 layers, fine far streaks at alpha 0.3 and bolder near streaks.
- **Drips and sheen:**
  - Drips fall from leaf tips, the tent edge and the dock rail.
  - Foreground leaves bead and drop.
  - Wet gloss (a cream highlight dot) sits on blossoms and leaves, so the gurans still read rose.
- **Characters:** Tuki wears the **ghum** rain-hood (section 5.1).
- **Shop:** the shop-corner roof **plinks**.
- **Tent:** its doorway glows warm, the coziest place in the world (rain is the reward).
- **Rainy night:** indigo plus rain, with drip sparkles under every lamp. This is the finale stage.

**Misty morning: "Kuhiro is breathing hard today."**

- **Sky and sun:** a pale butter sun disc diffused behind the mist.
- **Cloud sea:** sits **at camp level**. The snows, far ridges and mid ridge are hidden or ghosted.
- **Near band:** ghost silhouettes at alpha 0.35.
- **Ground mist:** drifts between the tents and the shore.
- **Water:** the lake fully steams. Reflections are hidden.
- **Timing:** the mist bands slide down and thin out by in-game midday.
- **Rare moment:** the first time, **Cloud-Sea Dawn** plays.
- **Fishing:** the Petal Katle window (misty dawn).

---

## 5. Cast sheets

**Common rules (all four characters)**

- **Outlines:** a darker shade of the fill, 2.5 px at 1x, never ink-black.
- **Eyes:** ink `#4A4250` ovals with 1-2 cream highlight dots.
- **Blush:** ovals in `blush` at 60% alpha.
- **Nose:** none realistic.
- **Parts:** every character is built from separate parts (head, body, ears, eyes, limbs, tail, props), so each animates on its own. Each is drawn once at 2x into textures.
- **Base idles** follow SPEC §8: breathing scaleY 1.00-1.03 on a 2.4 s sine, a blink every 2-5 s, and an eye glance toward nearby interactables.
- **Coordinates:** 1x px, origin between the feet, y negative upward, +x = the facing direction.

### 5.1 Hero: Tuki, a large-eared pika

**Basics**

- **Species:** large-eared pika (*Ochotona macrotis*). It is a real high-Himalayan species: a round, tailless rabbit relative.
- **Real habit:** in late summer pikas "hay". They gather flowers and grass into little haypiles for winter.
- **Name:** *tuki* = a little tin oil-lamp in Nepali, which echoes the Contentment lamp in the HUD.
- **Size:** 104 px from feet to ear tip, 110 px including the tallest doko item. Readable at 90-120 px.
- **Silhouette:**
  - One round "tea-bun" bean (head merged with body).
  - Two big round ears with pale rims.
  - **No tail.**
  - A **cone basket (doko) always poking up behind the back shoulder.** It is the identity marker and must be visible in every pose and lighting.

**Construction** (facing right, 3/4 front view)

| Part | Shape and position | Fill / outline |
| --- | --- | --- |
| Body | Ellipse rx 30, ry 24 at (0, -24). Lower 40% shades to oat-shade. | `oat` `#D8C3A5` → `oat-shade` `#C4AC8C` |
| Head | Circle r 34 at (0, -60). Unioned with the body into one silhouette, with one outline path around both. Head (68) ≥ body (60 × 48). | `oat`; outline `oat-line` `#A48B6E` 2.5 px |
| Ears | Ellipses rx 9, ry 12: far ear at (-17, -91) rotated -16°, near ear at (+19, -91) rotated +12°.<br>Inner ovals rx 5.5, ry 8 in `peach`.<br>**A 1.5 px cream inner rim along the top edge of each ear** (a real large-eared-pika trait). **No dark tips, ever.** | `oat`, inner `peach` `#F2B8A0`, rim `cream` |
| Muzzle | A cream "cloud" of two circles r 9 at (-3, -46) and (+9, -46). No snout point. | `cream` `#F6EFE6`, outline `cream-line` `#D8C9B8` |
| Belly | Ellipse rx 18, ry 14 at (+2, -20) | `cream` |
| Eyes | Ink ellipses rx 4.5, ry 6 at (-9, -60) and (+15, -60). Highlights r 2.5 at (+1.5, -2.5) and r 1.2 at (-1.5, +2.5) relative to each eye. | `ink`, `cream` |
| Mouth | A tiny "ω" 6 px wide at (+3, -47), 1.5 px with round caps | `ink` |
| Whisker dots | 3 dots r 0.9 per side at (-14, -48) and (+21, -48) | `ink` at 60% |
| Blush | Ellipses rx 6, ry 3.5 at (-20, -49) and (+25, -49) | `blush` @60% |
| Front paws | Ellipses rx 6, ry 5 at (-10, -10) and (+14, -10) | `oat-shade` |
| Feet | Ellipses rx 8, ry 4.5 at (-13, -2) and (+15, -2) | `oat-shade` |
| **Doko** (cone basket) | An inverted rounded cone (corner radius 6): rim width 46, base width 22, height 48.<br>Centred at (-27, -54), rotated -10°.<br>**Its rim and items stand 14-18 px clear of the head outline** on the back side.<br>Rim ellipse rx 23, ry 5.<br>3 curved weave bands (3 px) at 30%, 55% and 80% of the height.<br>4 vertical stake lines at alpha 0.35. | `doko` `#A88A6A`, bands and rim `doko-band` `#C2A483`, outline `doko-line` `#8A7058` |
| Doko items | Up to 5 slots poking 8-14 px above the rim, each at least 10 px so it reads at 100 px:<br>(1) grass tuft (3 `sage` blades)<br>(2) gurans puff (5-dot cluster r 3 in `gurans`, butter centre)<br>(3) fern curl (2.5 px `moss` spiral)<br>(4) butter primula (5 `butter` dots)<br>(5) lavender sprig. | Palette and accents |
| Namlo (head strap) | A 7 px jute band across the crown between the ears, from (-14, -90) to (+16, -91) following the head curve, with 2 stitch dots. Two 2.5 px cords run back to the doko rim. Dropped below 64 px (icons). | `jute` `#D9C49A` |
| **Ghum** (rain only) | A folded cane-and-leaf rain shield: a real Nepali farmer's hands-free rain gear.<br>Drawn as a **peaked hood**: front brim point at (+8, -94), rounded peak (radius 10) at (-14, -110), back tail tip at (-58, -50) covering the doko top, underside edge returning to (+4, -86).<br>Outer panel `ghum-cane` with 4 diagonal weave lines (alpha 0.4). A 4 px `ghum-leaf` lining band shows along the front brim.<br>**The ears render in front of the brim**, so the ear silhouette stays.<br>A drip falls from the tail tip every 0.7 s.<br>When dry, it rides folded flat behind the doko, invisible from the front. | `ghum-cane` `#C9B283`, `ghum-leaf` `#A3B58F`, outline `ghum-line` `#7F9271` |

**Personality:** a gentle, proud little collector. Easily delighted, and very pleased with its basket.

**Idle quirk: "the haymaker"** (every 12-20 s, about 2.9 s total)

1. **Glance down:** eyes look down at a spot (0.3 s).
2. **Hop:** a little hop with squash 0.92 / 1.06 (0.35 s).
3. **Pluck:** a 6-8 px stem or petal appears in the paw (0.3 s).
4. **Admire:** sparkle eyes (0.5 s).
5. **Tuck:** Tuki reaches over the shoulder and tucks it into the doko. The doko bounces 2 px and a new item pops up at the rim with easeOutBack (0.5 s).
6. **Pat:** pats the basket twice (0.4 s).
7. **"Eep!":** a pika squeak SFX with a visual "!" puff.

**How the doko fills**

- Items accumulate through the day and empty at dawn: Tuki "dries" them overnight.
- *Optional, cut first:* a tiny haypile beside the tent grows across the 7 days.
- **Contentment tiers set the fill cap and the flourish** (from "open"):

  | Tier | Item cap | Flourish |
  | --- | --- | --- |
  | Cozy | 1 (grass) | Plain "eep" |
  | Content | 3 | 2 hum notes after the eep |
  | Glowing | 5 | A sparkle trail on each tuck |
  | Blissful | 5 (full bouquet) | A **gurans tucked behind the near ear**, eyes closed during the pat, floating hearts |

**Story hooks**

- **Clue 2 through the quirk** (from "open"/"meghalaya"): Tuki finds the Moon Scale by haying it.
  - Tuki plucks it off the shore pebbles, admires it, and tucks it into the doko.
  - **The doko then glows faintly** (a `fish-glow` rim halo, alpha 0.3, 3 s pulse) until Tuki enters Boju's shop.
  - After the legend, Boju hands it back ("Keep it close, close."). It rides in the doko and glows softly on rainy nights.
- **Guardian-night tell** (from "meghalaya"):
  - **When:** the night is raining, Contentment ≥ 70 and clue 3 is done.
  - **What:** at the end of a haying loop, Tuki freezes mid-pat. **Both ears swivel and perk toward the lake** (rotation +20° toward +x), a small "?" puff appears, and Tuki holds the look for 1.5 s.
  - No text. It is a quiet hint.

**Rain:** Tuki reaches back, unfolds the **ghum** overhead with a little bounce (0.6 s, soft "fwump" SFX) and wears it while walking and fishing. Kopila, once befriended, walks under its back tip. **No leaf umbrella, ever.**

**Expressions**

| Expression | Look |
| --- | --- |
| Neutral | Default face |
| Happy | ^ ^ arcs |
| Blissful | Closed ∪ eyes, blush ×1.4, floating hearts, gurans behind the ear |
| Surprised (on a bite) | **Ears shoot straight up** (rotation to 0°, +4 px), eyes ×1.25 and round, "o" mouth |
| Sleepy (night) | Half lids, ears droop sideways ±35°, leaning back against the doko when sitting |
| Munching | Cheeks puff (muzzle circles r 9 → 11), paws to mouth. Munching is a pika specialty. |

**Movement**

- **Walk:** a bouncy hop-walk with a 5 px bob and landing squash 0.92 / 1.06. The doko lags 2 frames and bounces. Tiny dust puffs.
- **Fishing pose:** both paws on the rod, sitting at the dock edge, legs dangling.

**Portrait card:** Tuki tilts its head; one gurans tips out of the doko and floats down.

### 5.2 Shopkeeper: Boju, the grandmother yak

**Basics**

- **Species:** domestic yak, a *dri* (a female yak, as she will kindly remind you). Yaks are the high-camp animal of these hills and the source of churpi and butter.
- **Name:** *boju* = "granny" in Darjeeling and Sikkim Nepali.
- **Size and view:** a bust behind the counter, about 250 px visible (1.7× Tuki's full height in apparent mass).
- **Personality:**
  - Big, slow, woolly and kind.
  - Speaks in a **doubled-word cadence** ("Come in, come in").
  - Knits constantly.
  - Proud of being a yak. Gently funny.
- **Signature:** **knitted horn cosies.** She has knitted little rose-and-butter striped sleeves, each with a pom-pom, for her own horn tips. She wears **no spectacles**: judge 2 noted spectacled grannies are the least distinctive choice.

**Construction** (origin at the counter-top centre, y negative upward)

| Part | Shape and position | Fill / outline |
| --- | --- | --- |
| Fur body | A "haystack" mound 220 w × 150 h centred at (0, -60), with a cumulus-scallop outline (9 soft bumps, never spiky). Lower half shaded. | `yak` `#9C8580` → `yak-shade` `#87716E`; outline `yak-line` `#6F5D5B` |
| Head | Rounded squircle 150 × 130 centred at (0, -170) | `yak` |
| Fringe | 5 rounded tufts (r 16-20) across the brow from x -55 to +55 at y -215. **Their bottoms end at y -200, always above the eyes** (avoids Zootopia's Yax and Bouffalant). | `yak`, highlight arcs `yak` +8% |
| Horns | Short crescents 34 px long, 12 px at the root tapering to 7 px, with round tips. Roots at (±58, -225), curving up and out. | `horn` `#EADFC8`, outline `horn-line` `#BFB197` |
| **Horn cosies** | The outer 45% of each horn sits in a knitted sleeve: `rose` with 2 `butter` stripes and 3 tiny knit "V" ticks, plus a cream pom-pom r 5 at the tip. | `rose`, `butter`, `cream` |
| Ears | Leaf ovals 30 × 14 at (±78, -200), angled down 15°, with inner `rose`. Ear flick every 6-9 s. | `yak` |
| Face | A big cream muzzle oval 84 × 58 at (0, -150), filling the lower face (domestic yaks often have white faces). No nostrils. | `yak-face` `#F1E6DA` |
| Eyes | Ink ovals 10 × 13 at (±30, -180). Default kindly half-lidded: a `yak` upper lid covers the top 30%. One highlight r 2.5. | `ink`, `cream` |
| Blush and mouth | Blush ellipses 18 × 9 at (±48, -155). A soft 12 px smile at (0, -138). | `blush` @60%, `yak-line` |
| Muffler | A band 150 w × 22 h around the neck at y -105, with a knot and two tails (20 × 46) hanging front-left. 3 `butter` stripes on the tails. | `rose`, `butter` |
| Bell | A small brass bell r 9 on a cord at (14, -95) | `bell` `#D9BE8C`, shading `copper` |
| Hooves on counter | Rounded mittens 30 × 24 at (±60, -8), with horn-coloured tip crescents | `yak-shade`, `horn` |
| Knitting | Two 3 px cream needles with butter knobs, a 30 × 18 swatch of rose knitting, and a **wool ball r 14** on the counter | `cream`, `rose`, `wool-ball` `#D9B3B8` |

**Idles**

- **Breathing:** slow and big (3 s sine, scale 1.00-1.02).
- **Knitting:** the needles cross with a soft click every 4 s, and the wool ball wobbles. This is where the Wool Bunting and Shawl Hammock come from.
- **Nod:** a slow nod every 10-14 s swings the bell with a soft **"tonk"**.
- **Greeting:** when Tuki enters, she pours chiya from the kettle into a little glass on the counter. The pour is one animated arc in `peach`.

**Expressions**

| Expression | Look |
| --- | --- |
| Warm smile | Default |
| Happy | Closed ^ ^ eyes |
| Talking | Head bob and bell sway |
| Surprised (the Moon Scale) | Fringe tufts puff up, eyes go round and wide, needles freeze mid-stitch, and **the wool ball rolls off the counter** |

**Boju's 10 greetings and tips** (doubled-word cadence; every tip is true to the systems)

1. "Come in, come in, out of the mist. The kettle's just boiled."
2. "Petal Katle only rise on misty dawns. Early, early, little one."
3. "Rain tonight? Good, good. The chyau will be fat by morning."
4. "Fold momo edges like tucking in a baby. Gently, gently."
5. "Cook first, then sell. A dish fetches more than its bits and pieces."
6. "Junkiri Glowfin bite after dark, and only on a springy rattan rod."
7. "Yaks don't moo, dear. We grunt. Very politely."
8. "When the Snow Grannies blush at dawn, make a wish. Mine came true."
9. "Someone small gets hungry after dark. Keep a dish handy."
10. "No rush, no rush. The mountains have waited ages; they don't mind."

**Other Boju lines**

- **Spare lines** (rotation only, not counted): "Mind the third step. It's wobbled since I was a calf." / "Sisnu stings the paws but never the tummy."
- **Spec literals, unchanged:** "Saving up for that one?" / "First trip? You'll want a tent, a rod and something to cook in." / "Sure you're ready?"
- **After the legend:** "My grandmother called it Kuhiro. The mist on the lake? That's its breath." Then, handing the scale back: "Keep it close, close."

### 5.3 Companion: Kopila, a Chinese pangolin pup

**Basics**

- **Species:** Chinese pangolin (*Manis pentadactyla*). It is shy and nocturnal and lives in the forests just below the camp. It walks on its hind legs with its tail out for balance (true).
- **Name:** *kopila* = "flower bud". Curled up, Kopila looks exactly like a closed rhododendron bud. Real rhododendron flower buds are wrapped in overlapping rose-brown scales.
- **Size:**
  - **48 px standing** (about 46% of Tuki's height: small and shy).
  - **34 px curled.**
- **Personality:** timid, curious, food-motivated, and delighted by small kindnesses.

**Construction** (facing right)

| Part | Shape and position | Fill / outline |
| --- | --- | --- |
| Body | Egg rx 16, ry 14 at (0, -14), wider at the bottom | `pango` `#BFA09A`; outline `pango-line` `#9A7D78` |
| Head | Circle r 17 at (+3, -33). Head (34) ≥ body (32). | `pango` |
| Face | Ellipse rx 11, ry 9 at (+8, -30). Soft snout nub rx 5, ry 4 at (+17, -29) with a `rose` dot tip r 1.5. | `pango-face` `#F2DCD3` |
| Eyes | Big shy ink ovals rx 3.5, ry 4.5 at (+2, -34) and (+11, -34), each with 2 highlights | `ink`, `cream` |
| Blush | Ellipses rx 3.5, ry 2 at (-1, -27) and (+15, -27) | `blush` @60% |
| Scales | 3 rows of overlapping **scallop petals** (rounded teardrops about 10 × 9): crown 3, upper back 4, hip 5. Each has a `pango-light` highlight arc along its top edge and a 1.5 px outline. | `pango`, `pango-light` `#D9C1B8` |
| Tail | A thick tapering tail of 4 shrinking petals, curling from (-14, -8) around the front to (+8, -2) | `pango` |
| Legs | Stubby nubs rx 4, ry 3.5 at (-6, -1) and (+8, -1). **No visible claws.** | `pango-face` |
| Ball sprite | A 34 px circle with the petals in a 2-turn spiral and the tail tip tucked in. **One gap** in the spiral where a single eye can open. | Same colours |

**The Bud Bush**

- A low rhododendron on the clearing's back rim (x 1060): 3 `moss` domes, 90 × 50 overall.
- It carries **3 closed buds drawn with Kopila's ball sprite** (exactly the same shape and colours, at 0.85-1.0 scale) and a few leaves.
- The colours match exactly so the camouflage gag reads (judge 2's note on "meghalaya").

**Behaviour** (spec logic unchanged)

1. **Peek**
   - **When:** Contentment ≥ 40 (content), at dusk or night, while Tuki holds a dish.
   - **What shows:** only the eyes, snout tip and two crown scales rise over the Bud Bush. A slow blink every 3 s, and the eyes glance at the dish.
   - **Toast:** "Something is peeking from the bushes..."
2. **Tapped before befriended: "spot the bud that blinks"** (from "meghalaya"'s pinecone gag)
   - Kopila curls into a ball with a soft "tuck" SFX, rolls into the Bud Bush and settles among the real buds as a fourth bud.
   - Every 3-4 s, **one bud opens a single eye** through the gap in its scales and blinks (Kopila's one-eye peek). Then it re-curls.
   - Tapping it again just makes it curl tighter. There is no minigame.
3. **Share**
   - Kopila sniffs and nibbles, and every scale row ripples in a happy wave (each row's sine is phase-offset by 0.15 s).
   - Little hearts appear.
   - **Toast:** "It nibbled the {Dish} and looked very pleased."
4. **Befriended** (shares on 3 different days)
   - **Toast:** "Kopila wants to stay with you!"
   - **Then it:**
     - Follows Tuki 40 px behind **on its hind legs, tail out for balance**, in a waddle-hop.
     - **Dock:** sits on the edge with its tail dangling and swinging while Tuki fishes; on a bite, its crown scales flick up.
     - **Fire:** sleeps there as a bud-ball that rises and falls.
     - **Rain:** walks under the back tip of Tuki's ghum.
     - **When Tuki eats:** wiggles with the scale-row wave.
     - **At blissful:** does a tiny happy roll.
   - **Friends tab:** 3 hearts. Journal line: "Pangolins are shy and very rare. Kopila trusts you."
5. **Never:** Kopila is never held, carried, caged, petted by hand or shown in distress. It always chooses to come closer. (Pangolins are the world's most trafficked mammal.)

### 5.4 Guardian: Kuhiro, the great mist-fish of Jun Pokhari

**Basics**

- **Concept:** a huge, soft, glowing **fish as big as a whale**: round, slow and calm.
  - Its back is covered in soft scallop scales that look like the cloud sea seen from above.
  - Its gills breathe out the lake's mist.
  - It belongs to campers' folklore ("Old campers say...").
  - **It is a nature spirit and an old neighbour.** It is not a deity, not a serpent or naga, not a dragon, and not a koi.
- **Name:** *kuhiro* = mist or fog. Used only after the legend.
- **Design simplification (judge 2):** no whiskers or barbels, no blowhole, no horns, no mane. That makes it one coherent creature (a fish) and keeps it away from Haku, sky-whale tropes and Magikarp's lips.

**Size and pose**

- About 560 × 300 visible above the water when risen; the rest of the body is implied below.
- It faces left toward the dock in 3/4 view with **two eyes** (kawaii).

**Construction**

| Part | Shape and notes | Colours |
| --- | --- | --- |
| Body | One enormous rounded bean. A soft dome forehead on the left, flowing right into a broad body that disappears into the water. Vertical gradient: back → flank → belly. | `mist-lavender` `#A99EC8` (spine) → `mistfish` `#B8C6DE` (flank) → `moonmilk` `#EEF1F2` (belly) |
| Cloud-scale back | 3 staggered rows of big scallops (r 34-40) over the upper back, from behind the head to the waterline. Each is a lighter arc (`moonmilk` at alpha 0.35) with a `fish-glow` inner edge. **The scallops echo the cloud sea's circle shapes.** A shimmer sweep runs head → tail every 4 s. The Moon Scale is one of these, shed. | `moonmilk`, `fish-glow` `#DCE8F5` |
| **Gurans freckles** (signature) | **6 glow freckles in a flower** on the flank behind the eye: 5 in a ring of radius 22 (r 5 each) around 1 centre freckle (r 6). **This is the same shape as the Gurans constellation in the night sky.** Plus 8-12 small scattered freckles (r 2-3). Each pulses on its own phase (2-4 s). | `glow` `#FFD59A` core with a `fish-glow` halo |
| Eyes | Huge, kind ink ovals 34 × 40, with cream highlights r 7 and r 3.5 and a faint `moon-snow` crescent reflection at alpha 0.3.<br>**Slow blink:** `mistfish` lids lower over 0.8 s, hold 0.4 s, lift over 0.9 s, every 6-9 s. | `ink`, `cream` |
| Mouth | A small serene smile. Becomes a round "o" for eating and for the big breath. | `mistfish-line` |
| Gills | 3 soft curved lines behind the cheek (alpha 0.5). **Every 6-8 s it breathes:** 3-5 mist curls puff from the gill lines and drift out across the lake. This is the lake-breath lore. | `mistfish-line` `#8F8AAE`, mist `cream` |
| Pectoral fins | **Shaped like rhododendron petals**: round with a tiny notch, translucent (alpha 0.55), with 3 soft radial veins and a glowing rim. They paddle slowly. | `mist-lavender`, rim `fish-glow` |
| Dorsal and tail | A low rounded crest mid-back. A broad soft two-lobed fish tail lifts out of the water at the far right during the rise and flips gently as it sinks. | `mist-lavender` |
| Blush | Giant ovals 60 × 28 that brighten when it is happy | `blush` @60% → @80% |
| Heart-glow | A warm radial deep in the chest: a campfire seen through fog | `glow` at alpha 0.35 |
| Halo | Additive radial, 1.5× the body size, alpha 0.35 → 0 | `fish-glow-edge` `#C9D9EE` |
| Outline | 3 px. **The only cool-toned outline in the cast** (from "ghats"). | `mistfish-line` `#8F8AAE` |
| Lake under-glow | An additive radial on the water plane, centred under Kuhiro, up to alpha 0.5. It lights the lake from below: dock posts become silhouettes and a few shore pebbles show (from "meghalaya"). | `lake-glow` `#CFE6E2` |

**Idle while risen:** breathing scale 1.00-1.02 on a 5 s sine, fin paddles, freckle pulses and a gill-mist breath every 6-8 s.

**Clue 1 (first night, about 6 s, only while Tuki is outside)**

- Far out (about x 2700, y 470), a soft oval glow 60 × 20 sits under the surface with a faint `lake-glow` under-glow.
- 3 of the Gurans freckles blink.
- It drifts slowly and pulses like breathing (6 s cycle), with a tiny mist puff on each breath.
- Then it fades, and ripple rings mark where it was.
- Casting near the glow never hooks anything: the glow just drifts away.

**Finale choreography** (about 45 s, skippable on replays)

- **Trigger:** a rainy night, Contentment glowing (≥ 70), and Tuki carrying Moonlight Momos onto the dock. The "Leave an offering" bubble appears.
- **Culture rule:** the "offering" is a neighbourly gift of food. Tuki sets the dish down and **sits** on the dock edge, legs dangling. No bowing, no folded paws, no kneeling, no lamps, incense, scarves or garlands, and no circling the lake.

| Time | Beat |
| --- | --- |
| 0-5 s | Tuki sets the momos (in their steamer tier) at the dock end and sits. The rain thins to 40%. The music crossfades to the finale (or `finale.mp3`). |
| 5-11 s | The glow wells up under the dock. The **lake lights from below** (under-glow up to 0.5) and ripple rings spread. The lake-breath mist thickens and rolls in. Tuki's ears perk. |
| 11-17 s | **Kuhiro rises** over 5 s (easeInOutSine). Water sheets off in strings of cream drops, the cloud-scale back gleams, and the freckles pulse. |
| 17-21 s | **Slow-blink at Tuki** (0.8 / 0.4 / 0.9 s). **Tuki slow-blinks back** (from "ghats"). This is the emotional beat. |
| 21-25 s | **It nuzzles the dock:** an 8° head tilt, then a soft bump. The planks bob and Tuki wobbles. If Kopila is a friend, it curls into a bud-ball in awe, then peeks with one eye. |
| 25-30 s | The momos float to its "o" mouth on a sparkle trail. It eats them with a **happy rumble**: a low hum (sine about 55 Hz plus soft bubbles) shown as expanding ripple rings. The blush brightens and **the 6 Gurans freckles light one by one**. |
| 30-37 s | It tilts its face up and **breathes out one great plume of mist** straight up. The plume rises and **parts the clouds like curtains**, revealing the stars, **the Gurans constellation directly above (the same 6-star flower as its freckles)** and a **moonbow** arching over the lake. Junkiri swirl up from the near band. |
| 37-42 s | **One freckle-light lifts from its flank**, drifts down to the dock and settles into the **Moon Scale** in Tuki's doko. The scale lights from within: it is now **Kuhiro's Lantern**. A last slow blink. |
| 42-45 s | It sinks in widening rings with a gentle tail flip. The under-glow fades; the moonbow and stars stay. Banner "A moonbow... that's rare." Journal: "I met the guardian. I think it said thank you." Sunthala Bend appears on the Trip Album map. |

### 5.5 Resemblance checks (done against Pokemon, Sanrio, Sumikko Gurashi, Ghibli, Animal Crossing, Turning Red, Aggretsuko, Kung Fu Panda, Zootopia, Avatar)

- **Tuki**
  - **Not Pikachu:** never yellow, no black ear tips, no red cheek circles, no tail.
  - **Not Totoro:** not grey, no belly chevrons, **no leaf umbrella**.
  - **Not Hamtaro** (orange-white blaze), **not Chiikawa** (white).
  - **Not a mouse:** no tail, no pointed snout.
  - **Identity:** oat colour, pale-rimmed big round ears, the always-visible doko with flowers, and the ghum in rain.
- **Boju**
  - **Not Zootopia's Yax:** the fringe sits above the eyes; she is a grandmother with a cream face.
  - **Not Bouffalant:** small 5-tuft fringe, not an afro.
  - **Not Kung Fu Panda's Master Ox** (a bull with long horns and a warrior build).
  - **Identity:** knitted horn cosies, muffler and bell, knitting, a haystack fur body. No Animal Crossing yaks exist.
- **Kopila**
  - **Not Sandshrew:** rose-taupe petal scales, not a yellow brick grid, no claws, a wrapping tail.
  - **Not Sonic:** never spin-dashes; it curls and stays put.
  - **Identity:** the bud-ball and its one-eye peek.
- **Kuhiro**
  - **Not Wailord or Wailmer:** fish fins and scales, lavender-moon colours, no giant mouth.
  - **Not Kyogre:** no line markings.
  - **Not Haku or any dragon:** no whiskers, horns or serpentine body.
  - **Not Avatar's Tui and La:** a single fish, not a circling koi pair, no koi patches.
  - **Not Ponyo or Granmamare:** no humanoid features.
  - **Not Magikarp or Whiscash:** small smile, no lips, no barbels.
  - **Not a naga:** not a serpent at all.

---

## 6. Regional details

**Foods** (all real, everyday Eastern Himalayan hill food)

- **Momos:** steamed dumplings, the region's best-loved food.
- **Chiya:** milky hill tea, served in small glasses.
  - Masala chiya is made with big cardamom; Sikkim is the world's leading large-cardamom grower.
  - Darjeeling first-flush tea is picked "two leaves and a bud".
- **Soups and porridge:** *thukpa*; *jaulo* (soft rice porridge for tired or unwell people); *jhol* (broth).
- **Grill and pan:** *sekuwa* (skewers grilled over coals); *malpua* (syrupy pancakes).
- **Sweet and steamed:** *tingmo* (swirly steamed bun); *khir* (rice pudding).
- **Snacks and seasoning:** *churpi* (hard yak-cheese chews); *timur* (tingly Himalayan pepper).
- **Wild foods:**
  - *Sisnu* (stinging nettle, eaten as soup).
  - *Ainselu* (golden wild raspberry, *Rubus ellipticus*).
  - *Katus* (tiny wild chestnuts, *Castanopsis*, that kids roast).
  - *Chyau* (mushrooms) after monsoon showers.
- **Excluded:** no meat apart from fish, and no alcohol (no tongba or chhang).

**Objects**

- **Baskets:** the *doko* (conical bamboo back-basket) and its *namlo* (head strap).
- **Rain gear:** the *ghum* (folded cane-and-leaf hands-free rain shield).
- **Cookware:** aluminium momo steamers, dented aluminium kettles, copper *kasaudi* pots, iron *tawa*.
- **Home:**
  - The *pirka* (low wooden stool by the kitchen fire) and *radi* (thick hand-woven wool rugs).
  - The *laltin* (hurricane lamp for monsoon power cuts).
  - Tea chests reused for everything, and geraniums in old ghee tins.
- **Buildings:** pastel corrugated tin roofs.
- **Craft:** hand-knit woollens, and *lokta* (handmade bark paper, used for the journal).

**Plants** (each band's species are limited per section 3.4)

- **Trees:** rhododendron (*gurans*: rose, peach and white; white is *chimal*), cryptomeria (*dhupi*), *malingo* hill bamboo, katus (*Castanopsis*).
- **Shrubs, grasses and ferns:** ainselu bramble, sisnu nettle, tea bushes, fiddlehead ferns, mountain grasses with seed heads.
- **Garden:** geraniums in tins.

**Weather**

- The monsoon cloud sea.
- Alpenglow on the snows at dawn.
- Mist that walks through forests.
- Sudden soft rain.
- Monsoon waterfalls appearing on ridges.
- Rainbows over valleys.
- Hill-town lights glittering across ridges at night.

**Wildlife and sounds**

- **Day:** laughingthrush chatter and a soft barbet call (at dawn).
- **Water:** a trickling stream and water lapping at the dock.
- **Night:** crickets.
- **Rain:** rain on tin roofs, near the shop.
- **Camp:** Boju's soft yak bell ("tonk"), the kettle whistle, the steamer lid rattle.
- **New SFX:**
  - Tuki's "eep", the doko-tuck rustle and the ghum "fwump".
  - Kopila's curl "tuck" and a tiny squeak.
  - A mica twinkle.
  - Kuhiro's low rumble and gill-mist breath (a soft filtered-noise exhale).
- **Ambience:** crossfades by time, weather and Tuki's position, with a muffled rain variant in the tent doorway.

**Lead music instrument: bamboo flute (bansuri, called *murali* in Nepali), played in a breathy Nepali hill-folk style**

- **Why it fits:** it sounds like mist and wind, sits beautifully over felt piano and Rhodes, and AI music generators render it reliably.
- **Supporting instruments:**
  - Felt piano and warm Rhodes (the bed).
  - Soft brushed drums with light **madal** pats by day. The madal is the secular Nepali folk hand-drum.
  - Sparse pentatonic plucks.
  - A warm string pad and gentle chimes for the finale only.
  - A soft shaker in rain.
  - No drums at night.
- **Scale:** D major pentatonic (D E F# A B), the same scale as the code fallback's plucks, over the spec's Imaj7 / vi7 / IVmaj7 / V loop.

**`MUSIC_BRIEF.md` seeds** (every loop: "loop-friendly: no fade in or out, ends on the tonic")

| File | Brief |
| --- | --- |
| `music_day.mp3` | "Instrumental lo-fi, 76 BPM, D major pentatonic, breathy Nepali bamboo flute (bansuri) lead with gentle hill-folk ornaments, felt piano, warm Rhodes, soft brushed drums with a light madal hand-drum pattern, misty Himalayan morning, cozy and unhurried, 120-150 s." |
| `music_rain.mp3` | "72 BPM, D major pentatonic, bansuri in its low register, Rhodes and felt piano like dripping eaves, soft shaker only, no hi-hats, rainy monsoon afternoon, 120-150 s." |
| `music_night.mp3` | "68-70 BPM, no drums, distant reverbed bansuri, sparse felt piano, faint pentatonic plucks, indigo calm, 120-150 s." |
| `finale.mp3` | "40-60 s, bansuri melody blossoms over a warm string pad and gentle chimes, wonder and gratitude, swells then settles, ends on the tonic." |

**Fallback flute voice in Web Audio** (recipe from "ghats"), added beside the kalimba plucks:

- **Tone:** a sine plus a quiet triangle second partial, with band-passed noise "breath" at 1.5-3 kHz, about -24 dB.
- **Expression:** a 60 ms soft attack, 5 Hz ±12-cent vibrato fading in after 250 ms, and 90 ms portamento between notes.
- **Phrasing:** sparse pentatonic phrases.
- **Madal pat (day only):** a short pitched body thump (about 120 Hz decaying) plus a filtered slap.

**UI touches** (code-drawn, low detail)

- **Journal:** "Tuki's Journal" is a **lokta-paper** notebook: `lokta` `#EFE4D2` with faint fibre specks and a wobbly deckled rounded edge, tied with a `jute` string. Catch cards use the same paper.
- **Contentment lamp (HUD):** a tiny tin **tuki lamp** whose flame grows each tier. It is literally Tuki's "little lamp".
- **Shop:** Day-1 essentials get a small **gurans-leaf tag**.
- **Currency coin:** described in section 2.
- **Basket tray icon:** a mini doko.

**Never** (this setting; added to SPEC §8's Never list)

- **Religious and ritual imagery:**
  - Prayer flags (*lungta*), chortens or stupas, mani stones or walls, prayer wheels, monastery or temple roofs.
  - Butter lamps, singing bowls, khadas or any scarf offering, ritual masks.
  - Om or any script, lotus motifs, nagas or serpent spirits, depictions of any deity.
- **Real places:** sacred or real places by name (Kanchenjunga, Khecheopalri, Tsomgo, Gurudongmar, Jor Pokhari, Panch Pokhari).
- **Dress and props:**
  - Ethnic costume dressed onto animals (no bakhu, no Dhaka topi; knitwear only).
  - Khukuri knives. Alcohol. Porter imagery: Tuki's doko only ever holds flowers, grass and the scale.
- **Shapes to avoid:**
  - Bunting that reads as prayer flags: Wool Bunting is always **triangle** pennants in 3 muted colours on one curved line, never 5-colour rectangles or vertical strings.
  - **Any character holding a leaf as an umbrella.**
- **At the offering:** no altar, incense, lamp, garland, bowing or circling. Kuhiro is never caught, cooked, hooked or shown in a net, and casting near its glow does nothing.

---

## 7. Reskin tables (every number unchanged from SPEC §6)

### 7.1 Gear

| Spec name | In-game name | Tab | Price | Effect (unchanged) | Flavour line |
| --- | --- | --- | --- | --- | --- |
| Leaf Tent | **Fern Tent** | Camp | ₹40 | Basic shelter; tent bonus +0; 2 hang points | "Small, green, and smells of the forest." |
| Dome Tent | **Monsoon Dome** | Camp | ₹90 | Tent bonus +5; 4 hang points; rain sounds extra cozy inside | "Rain on its roof sounds like a lullaby." |
| Little Cabin Kit | **Tin-Roof Cabin** | Camp | ₹220 | Tent bonus +10; 6 hang points; a lit window at night | "A pocket hill-home. Its window glows at night." |
| Bamboo Rod | **Malingo Rod** | Fishing | ₹25 | Catches every fish not marked Rattan Rod+ | "Thin hill bamboo. Bendy and kind." |
| Willow Rod | **Rattan Rod** | Fishing | ₹80 | Bite window 1.9 s; catches Rattan Rod+ fish | "Springy forest cane, wound in rose thread." |
| Moonlight Rod | **Firefly Rod** | Fishing | ₹180 | Rattan Rod perks; glows at night; rare fish twice as likely | "Glows at night, like a junkiri on a stick." |
| Wiggly Bait (x5) | **Atta Bait (x5)** | Fishing | ₹5 | Bites come 40% sooner | "Little atta dough balls. Fish love a snack." |
| Sparkle Bait (x3) | **Mica Lure (x3)** | Fishing | ₹15 | Rare fish 3x as likely | "River mica flakes that wink underwater." |
| Kettle | **Chiya Kettle** | Kitchen | ₹15 | Drinks | "Dented aluminium, always ready for chiya." |
| Clay Pot | **Copper Kasaudi** | Kitchen | ₹20 | Soups, porridge, pudding | "A round-bellied copper pot. Soup, jaulo, khir." |
| Skillet | **Iron Tawa** | Kitchen | ₹30 | Grills, pancakes, skewers | "A flat iron griddle for flips and sizzles." |
| Bamboo Steamer | **Momo Steamer** | Kitchen | ₹45 | Buns and dumplings; appears after mystery clue 3 | "Three stacked tiers of steam. Boju's spare." |

**Gear notes**

- **Bait:** one per cast, from the toggle beside the rod: **None / Atta / Mica**.
- **Cookware roles** are unchanged: kettle = drinks; kasaudi (pot) = soups, porridge, pudding; tawa (skillet) = grills, pancakes, skewers; steamer = buns and dumplings.
- **Day-1 essentials** (gurans-leaf tags): Fern Tent ₹40 + Malingo Rod ₹25 + Copper Kasaudi ₹20 = ₹85, leaving ₹35.

### 7.2 Pantry staples (1 portion each)

| Spec name | In-game name | Price | Flavour line |
| --- | --- | --- | --- |
| Rice | **Hill Rice** | ₹4 | "Grown on terraces that climb like stairs." |
| Flour | **Maida Flour** | ₹4 | "Soft white flour for momos, malpua and tingmo." |
| Tea leaves | **First-Flush Tea** | ₹5 | "Spring leaves, picked two-and-a-bud." |
| Honey | **Comb Honey** | ₹6 | "From the bee boxes behind Boju's shop." |
| Spice pouch | **Masala Pouch** | ₹3 | "Big cardamom, timur and a pinch of ginger." |

### 7.3 Fish (8)

Base size is new data: the spec gives ±30% variation but no base. Every other value is unchanged. "Day" means morning through golden hour.

| Spec name | In-game name | Rarity | When | Rod | Sell | Base size | Look (code shapes, hex) | Flavour line |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pebble Minnow | **Pebble Garra** | Common | Any time | Any | ₹6 | 7 cm | Small round teardrop in `garra` `#B5B6A3`, with a rose sucker-lip disc under the chin and 2 faint darker saddles | "Clings to river stones with kissy lips. Mwah." |
| Bubble Carp | **Bubble Barb** | Common | Any time | Any | ₹8 | 12 cm | Plump oval in `bubble-barb` `#C9C0AE` with butter-tinted fins and 3 cream bubbles trailing | "A round hill barb that thinks out loud in bubbles." |
| Blushing Trout | **Blushing Asala** | Common | Day | Any | ₹9 | 24 cm | Slim silver `asala` `#C3CBD3` body, a peach cheek, 6 tiny `ridge-near` speckles | "Asala: the hill snow-trout. Pink from the cold." |
| Dusk Perch | **Twilight Danio** | Uncommon | Dusk | Any | ₹18 | 9 cm | Slim `danio` `#B9AACB` body with 3 horizontal `danio-bar` `#978BB3` stripes and a butter fin edge | "Its violet stripes come out with the evening." |
| Rain Loach | **Monsoon Loach** | Uncommon | Rain, any time | Any | ₹20 | 10 cm | Long bean in `loach` `#A7B29A` with 5 soft moss bands, flat round fins and 4 tiny whiskers | "Only dances when rain drums the lake." |
| Night Glowfin | **Junkiri Glowfin** | Uncommon | Night | Rattan Rod+ | ₹24 | 14 cm | Indigo `glowfin` `#7E8AA8` body with 5 pulsing `glow` freckles and translucent fins | "Junkiri means firefly. It glows like a jarful." |
| Petal Koi | **Petal Katle** | Rare | Misty dawn | Rattan Rod+ | ₹45 | 38 cm | Deep body in `katle` `#E7C9C6` with `gurans` mottles at 50% and 2 rows of big rounded scale arcs | "A rare katle, pink as gurans in the fog." |
| Golden Whisker | **Golden Mahseer** | Rare | Any time, 1% per bite | Any | ₹60 | 55 cm | Big `mahseer` `#E6CF94` body, 3 rows of large rounded scale arcs, butter highlights, 2 short cream barbels | "The river's old tiger, wearing sunlight." |

**Fish notes**

- **Rod hint, unchanged:** "Something big is down there... a sturdier rod might help."
- **Golden Mahseer:** endangered in real life, so its catch card adds a soft extra sparkle on "Let go". This is cosmetic; the numbers are unchanged.
- **Real basis:**
  - *Garra*: real stone-clinging Himalayan fish.
  - *Asala*: snow trout, *Schizothorax*.
  - Twilight Danio: the giant danio of Sikkim streams, with its blue-violet stripes.
  - *Katle*: chocolate mahseer.
  - Golden Mahseer: *Tor putitora*.

### 7.4 Forage (5)

| Spec name | In-game name | Where (spot art) | When | Sell | Flavour line |
| --- | --- | --- | --- | --- | --- |
| Sweet Berries | **Ainselu Berries** | 2 ainselu bushes: low `sage` domes of 3 circles with 3-5 golden berry clusters (5-7 dots r 3 in `ainselu` `#E6C392`). Picked clusters vanish until dawn. | Day | ₹2 | "Golden wild raspberries. Every hill kid's snack." |
| Puffcap Mushrooms | **Puffcap Chyau** | 2 mossy logs: a `bark` capsule with a moss cap, carrying 3 `chyau` `#D7B7A0` domed caps with cream gill lines. After rain, 6 caps. | Any time; double yield after rain | ₹3 | "Chyau means mushroom. They pop up after showers." |
| Wild Herbs | **Sisnu Nettles** | 1 nettle patch: a clump of 7-9 scalloped, never jagged, leaves in `sisnu` `#9DB38F` | Any time | ₹2 | "Wild nettle. Stings to pick, sweet to eat." |
| Forest Nuts | **Katus Nuts** | 1 katus tree: a short trunk and a crown of 4 `moss` domes, with burrs drawn as soft pom-poms (`katus` `#A88870` with a lighter fuzz ring) | Day | ₹3 | "Tiny wild chestnuts. Roast some, share some." |
| Moon Blossom | **Moon Gurans** | 1 shore bush by the dock root: a small rhododendron. Its white 5-petal truss (`moon-gurans` `#F3EEF5`, `fish-glow` halo) opens only at night after clue 3; by day it is a closed bud. | Night, after clue 3 | Not sellable | "A white rhododendron that opens for the moon." |

### 7.5 Recipes (16)

Matching uses the cookware plus the exact ingredient set, order ignored. "Any fish" accepts any species. The 1.25× ingredient-value floor is unchanged.

| # | Spec name | In-game name | Cookware | Ingredients | Sell | Contentment | Journal hint | Flavour line |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Herb Tea | **Sisnu Tea** | Chiya Kettle | Sisnu Nettles | ₹8 | +8 | Just leaves and hot water | "Green and gentle. The sting boils away." |
| 2 | Honey Tea | **Honey Chiya** | Chiya Kettle | First-Flush Tea, Comb Honey | ₹14 | +10 | Golden and sweet | "Chiya means tea. This one comes with a hug." |
| 3 | Berry Cordial | **Ainselu Sharbat** | Chiya Kettle | Ainselu Berries, Comb Honey | ₹14 | +10 | Sunny and sweet | "Warm golden-berry cordial, sipped slow." |
| 4 | Spiced Tea | **Masala Chiya** | Chiya Kettle | First-Flush Tea, Masala Pouch | ₹12 | +12 | Warms you to the toes | "Cardamom, timur, ginger. Toes: toasty." |
| 5 | Mushroom Soup | **Chyau Soup** | Copper Kasaudi | Puffcap Chyau, Sisnu Nettles | ₹16 | +12 | Earthy and green | "Forest-floor soup with nettle greens." |
| 6 | Fish Congee | **Fish Jaulo** | Copper Kasaudi | Any fish, Hill Rice | ₹20 | +14 | Soft rice and something from the water | "Jaulo is what grannies cook for tired campers." |
| 7 | Campfire Stew | **Campfire Jhol** | Copper Kasaudi | Any fish, Puffcap Chyau, Sisnu Nettles | ₹30 | +18 | The woods and the water in one pot | "Jhol means broth. Brothy, cozy, steamy." |
| 8 | Berry Rice Pudding | **Ainselu Khir** | Copper Kasaudi | Hill Rice, Ainselu Berries, Comb Honey | ₹24 | +16 | Dessert from the pot | "Creamy rice pudding with golden berries." |
| 9 | Nutty Porridge | **Katus Porridge** | Copper Kasaudi | Hill Rice, Katus Nuts, Comb Honey | ₹22 | +14 | A crunchy breakfast | "Sticky rice, honey and roasted katus." |
| 10 | Grilled Fish | **Tawa Fish** | Iron Tawa | Any fish | Fish price ×1.5 | +10 | Simple and smoky | "Fish, fire, a pinch of salt. Perfect." |
| 11 | Herb-Butter Fish | **Timur Fish** | Iron Tawa | Any fish, Sisnu Nettles, Masala Pouch | ₹30 | +16 | Fancy fish | "Tingly timur and nettle butter. Very fancy." |
| 12 | Fluffy Pancakes | **Honey Malpua** | Iron Tawa | Maida Flour, Comb Honey | ₹16 | +12 | Flip, flip! | "Syrupy hill pancakes, crisp at the edges." |
| 13 | Berry Pancakes | **Ainselu Malpua** | Iron Tawa | Maida Flour, Ainselu Berries, Comb Honey | ₹22 | +14 | Fluffy, with a sunny surprise | "Malpua hiding sunny little berries." |
| 14 | Mushroom Skewers | **Chyau Sekuwa** | Iron Tawa | Puffcap Chyau, Masala Pouch | ₹14 | +10 | On a stick, over the flames | "Sekuwa means skewers. Smoky and spicy." |
| 15 | Cloud Buns | **Katus Tingmo** | Momo Steamer | Maida Flour, Comb Honey, Katus Nuts | ₹26 | +16 | Soft as a cloud | "A swirly steamed bun, sweet with nuts." |
| 16 | Moonlight Dumplings | **Moonlight Momos** | Momo Steamer | Maida Flour, Moon Gurans, Junkiri Glowfin | Not sellable | +25 | The legend's favorite | "Folded gently, steamed with moonlight. They glow a little." |

**Recipe notes**

- **Hint changes:** hints #3 and #13 change "pink" to "sunny" only because ainselu are golden. Meaning and length are kept.
- **No match:** Mystery Mush stays as it is: "Mystery Mush... it's... edible?", sells for ₹2, +3 Contentment, not a recipe.
- **Plate art:**

  | Dish type | Plate |
  | --- | --- |
  | Drinks | A small chiya glass (rounded rect, `cream` at 70% alpha) |
  | Soups and porridge | A copper-rimmed bowl |
  | Malpua | A golden disc stack |
  | Sekuwa | 3 cubes on a bamboo stick |
  | Tingmo | A cream swirl bun |
  | Moonlight Momos | 4 cream pleated momos in a steamer tier, each with a `fish-glow` core |

### 7.6 Decor (Cozy tab, 11)

| Spec name | In-game name | Price | Placement | Behaviour (unchanged) | Flavour line |
| --- | --- | --- | --- | --- | --- |
| Potted Flower | **Geranium Tin** | ₹10 | Ground | Nods in the wind | "Every hill window grows one in an old ghee tin." |
| Paper Lantern | **Little Laltin** | ₹12 | Hang | Sways; warm light pool at night | "A hurricane lamp for cozy power cuts." |
| Floor Cushion | **Pirka Stool** | ₹12 | Ground | Tuki sits on it by the fire | "A low wooden seat: the best spot by any fire." |
| Bunting Flags | **Wool Bunting** | ₹15 | Hang | Flutters in gusts (triangles only) | "Knitted triangles from Boju's needles." |
| Wind Chime | **Bamboo Chime** | ₹18 | Hang | Clonks and tinkles in gusts | "Hollow malingo that sings in the breeze." |
| Woven Rug | **Radi Rug** | ₹25 | Ground | Colours warm up at night | "Thick hill-sheep wool, striped and snug." |
| String Lights | **Junkiri Lights** | ₹30 | Hang, spans two points | Twinkle at night | "Blinky lights that think they're fireflies." |
| Little Bookshelf | **Tea-Chest Shelf** | ₹40 | Ground | Tuki reads there at night (counts as sitting by the fire) | "An old tea chest, now full of storybooks." |
| Hammock | **Shawl Hammock** | ₹60 | Two-tree point | Tuki naps in it (counts as sitting by the fire) | "Boju's spare shawl, slung between two rhodos." |
| Star Telescope | **Brass Star-Scope** | ₹120 | Ground | Shooting-star chance +15% | "Sees the snows by day and stars by night." |
| Guardian Lantern | **Kuhiro's Lantern** | Gift | Hang | Never goes out; adds +5 to the baseline instead of +2 | "Its own scale, with one of its stars inside." |

### 7.7 Rare moments (6)

| Spec name | In-game name | Trigger (unchanged) | Chance (unchanged) | Banner string | Flavour line (journal) |
| --- | --- | --- | --- | --- | --- |
| Shooting star | **Wishing Star** | Clear night | 8% a night; +15% with the Brass Star-Scope; always when blissful | "A shooting star! Make a wish." | "It slid down right behind the Snow Grannies." |
| Rainbow | **Monsoon Rainbow** | Dawn after a rainy night | 50% | "A rainbow over the Jun Pokhari!" | "The valley wore it like a woolly muffler." |
| Firefly swirl | **Junkiri Dance** | Clear night, after 20 s sitting by the fire | 25% | "The fireflies are dancing." | "Hundreds of little moon-insects, waltzing." |
| Misty sunrise | **Cloud-Sea Dawn** | Misty dawn | Always, first time only | "Everything is wrapped in soft mist." | "The valley filled with cloud; only the snows peeked out." |
| Golden Whisker | **Golden Mahseer** | Catching one | 1% per bite | "A Golden Mahseer! It's practically glowing." | "Old fishers say it's lucky to let it go." |
| Moonbow | **Moonbow** | Rainy night when blissful | Always; also appears in the mystery finale | "A moonbow... that's rare." | "A rainbow spun from moonlight, pale as milk tea." |

### 7.8 Glimmering Scale equivalent

| Spec name | In-game name | Look | Flavour line |
| --- | --- | --- | --- |
| Glimmering Scale | **Moon Scale** | A palm-sized rounded scallop (24 × 20 px in the world, 64 px on its card). Gradient `moonmilk` → `fish-glow`, with a `scale-glow` `#E9EEF7` rim. A soft pulse (alpha 0.6-1.0, 2.5 s) and a 4-point twinkle every 3 s. It sits on the shore pebbles at x 2180. Once in the doko it glows faintly at the rim. At the finale it becomes Kuhiro's Lantern. | "Warm as a cup of chiya. It hums when it rains." |

### 7.9 Mystery strings (meaning and length kept)

| Clue | Spec string | In-game string |
| --- | --- | --- |
| 1 journal | "A soft glow, far out on the water. The moon? It moved like it was breathing." | "A soft glow, far out on the Jun Pokhari. The moon? It moved like it was breathing." |
| 2 journal | "A scale, warm to the touch. Too big for any fish I know." | "A scale, warm as chiya. Too big for any fish I know." |
| 3 legend line 1 | "Oh my. Where did you find this scale?" | "Oh my. Where did you find this scale?" (unchanged) |
| 3 legend line 2 | "Old campers say a gentle guardian lives in the {Water}. It rises on rainy nights, for someone truly content." | "Old campers say a gentle guardian lives in the Jun Pokhari. It rises on rainy nights, for someone truly content." |
| 3 legend line 3 | "And they say it loves Moonlight Dumplings. Here, take my old recipe card." | "And they say it loves Moonlight Momos. Here, take my old recipe card." |
| 3 lore (new, after the card) | none | "My grandmother called it Kuhiro. The mist on the lake? That's its breath." / "Keep it close, close." |
| 3 journal | "The guardian rises on rainy nights for someone truly content. It's fond of Moonlight Dumplings." | "The guardian rises on rainy nights for someone truly content. It's fond of Moonlight Momos." |
| 3 unlocks | Bamboo Steamer and Moon Blossom spot | **Momo Steamer** (Kitchen tab) and the **Moon Gurans** shore spot |
| 4 journal | "Moonlight Dumplings. They glow a little." | "Moonlight Momos. They glow a little." |
| 5 bubble | "Leave an offering" | "Leave an offering" (unchanged; framed as a neighbourly gift) |
| 5 journal | "I met the guardian. I think it said thank you." | "I met the guardian. I think it said thank you." (unchanged) |
| Album, done | "You met the guardian of {Water}." | "You met the guardian of Jun Pokhari." |
| Album, not done | "The glow is still out there..." | "The glow is still out there..." (unchanged) |
| Postcard | "Next trip: {Next campsite}. Coming soon." | "Next trip: Sunthala Bend. Coming soon." |

**Guarantees, unchanged**

- Once step 4 is done, the next night rains.
- If the mystery is unfinished by Day 7, it carries into free play.
- Night 4 rains if no rainy night has happened yet.

---

## 8. Accent colours added beyond the base palette

All accents are at or below 40% HSB saturation, verified by script on 30 Oct 2026. Each must be added to `ACCENTS` in `src/palette.ts`, checked by `checkAccents()`, and logged in `DECISIONS.md`. Base tokens (cream, butter, peach, rose, blush, lavender, powder, sage, moss, bark, ink, ember, glow) are used as-is.

**World and sky**

| Token | Hex | S% | Use |
| --- | --- | --- | --- |
| snow | #EEF0F4 | 2.5 | Snow Grannies, lit faces |
| snow-shade | #C8C5DB | 10.0 | Snow shade faces |
| alpenglow | #F2C4B8 | 24.0 | Dawn and dusk peak blush |
| moon-snow | #C9D2E6 | 12.6 | Night ghost range; the moon reflection in Kuhiro's eye |
| ridge-far | #A9B0CC | 17.2 | Far ridges, snow rock wedges |
| ridge-near | #8F9DB8 | 22.3 | Mid ridge base, asala speckles |
| cloud-sea | #E4E3EE | 4.6 | Cloud sea |
| cloud-spill | #ECEBF2 | 2.9 | Cloud spill through the saddle |
| tea-green | #A9C29A | 20.6 | Tea-terrace stripes |
| tin-blue | #A3B8CC | 20.1 | Shop roof, hill-house roofs |
| tin-rose | #D4A9A6 | 21.7 | Hill-house roofs |
| tin-mint | #A8C9BB | 16.4 | Hill-house roofs |
| water-thread | #E9EEF0 | 2.9 | Monsoon waterfall threads |

**Water**

| Token | Hex | S% | Use |
| --- | --- | --- | --- |
| lake-jade | #93B5B3 | 18.8 | Lake body, top |
| lake-deep | #6E8A99 | 28.1 | Lake near edge, depth |
| lake-glow | #CFE6E2 | 10.0 | Under-glow (clue 1, finale) |
| reed | #C9C29E | 21.4 | Reed line, shore grasses |

**Plants, ground and forage**

| Token | Hex | S% | Use |
| --- | --- | --- | --- |
| dhupi | #6F8E86 | 21.8 | Cryptomeria cones |
| malingo | #A3B88F | 22.3 | Hill bamboo, Malingo Rod, Bamboo Chime |
| gurans | #D98F96 | 34.1 | Rhododendron blooms: the main pop colour |
| gurans-deep | #C07A84 | 36.5 | Bloom shading, logo outline, coin emboss |
| moon-gurans | #F3EEF5 | 2.9 | Moon Gurans petals, logo moon |
| stone | #B9B1B4 | 4.3 | Fire ring, stone slabs |
| stone-shade | #9C9298 | 6.4 | Stone shading and outlines |
| pebble | #CFC6C3 | 5.8 | Shore pebbles |
| ainselu | #E6C392 | 36.5 | Golden raspberries, Sunthala postcard fruit |
| katus | #A88870 | 33.3 | Wild chestnut burrs |
| chyau | #D7B7A0 | 25.6 | Mushroom caps |
| sisnu | #9DB38F | 20.1 | Nettle leaves |

**Kitchen, shop and UI**

| Token | Hex | S% | Use |
| --- | --- | --- | --- |
| shop-wood | #C9AE92 | 27.4 | Shop planks, dock planks, Tea-Chest Shelf |
| copper | #C99A7E | 37.3 | Copper Kasaudi, coin, bell shading |
| copper-line | #9E7A64 | 36.7 | Coin ₹ stamp, copper outlines |
| tawa-iron | #6B6070 | 14.3 | Iron Tawa (plum-grey, never black) |
| steamer | #C9CDD3 | 4.7 | Aluminium steamer, kettle, ghee tins, logo pleats |
| lokta | #EFE4D2 | 12.1 | Journal and catch-card paper |
| bell | #D9BE8C | 35.5 | Boju's bell, Brass Star-Scope |
| cream-line | #D8C9B8 | 14.8 | Outline for cream parts |

**Tuki**

| Token | Hex | S% | Use |
| --- | --- | --- | --- |
| oat | #D8C3A5 | 23.6 | Tuki base fur |
| oat-shade | #C4AC8C | 28.6 | Lower body, paws, feet |
| oat-line | #A48B6E | 32.9 | Tuki outline |
| doko | #A88A6A | 36.9 | Doko basket |
| doko-band | #C2A483 | 32.5 | Doko weave bands and rim |
| doko-line | #8A7058 | 36.2 | Doko outline |
| jute | #D9C49A | 29.0 | Namlo strap, journal string |
| ghum-cane | #C9B283 | 34.8 | Ghum outer panel |
| ghum-leaf | #A3B58F | 21.0 | Ghum leaf lining |
| ghum-line | #7F9271 | 22.6 | Ghum outline |

**Boju**

| Token | Hex | S% | Use |
| --- | --- | --- | --- |
| yak | #9C8580 | 17.9 | Boju's fur (warm mauve-brown, never grey) |
| yak-shade | #87716E | 18.5 | Fur shading, hooves |
| yak-line | #6F5D5B | 18.0 | Boju outline |
| yak-face | #F1E6DA | 9.5 | Cream face |
| horn | #EADFC8 | 14.5 | Horns, hoof tips |
| horn-line | #BFB197 | 20.9 | Horn outline |
| wool-ball | #D9B3B8 | 17.5 | Wool ball, knitting |

**Kopila**

| Token | Hex | S% | Use |
| --- | --- | --- | --- |
| pango | #BFA09A | 19.4 | Kopila scales; Bud Bush buds |
| pango-light | #D9C1B8 | 15.2 | Scale highlight arcs |
| pango-line | #9A7D78 | 22.1 | Kopila outline |
| pango-face | #F2DCD3 | 12.8 | Face, snout, legs |

**Kuhiro**

| Token | Hex | S% | Use |
| --- | --- | --- | --- |
| mistfish | #B8C6DE | 17.1 | Kuhiro flank, eyelids |
| mist-lavender | #A99EC8 | 21.0 | Kuhiro spine, fins, tail |
| mistfish-line | #8F8AAE | 20.7 | Kuhiro outline (the only cool outline), gills |
| moonmilk | #EEF1F2 | 1.7 | Belly, scale arcs, Moon Scale |
| fish-glow | #DCE8F5 | 10.2 | Freckle halos, fin rims, doko glow, momo cores |
| fish-glow-edge | #C9D9EE | 15.5 | Outer halo |
| scale-glow | #E9EEF7 | 5.7 | Moon Scale rim |

**Fish**

| Token | Hex | S% | Use |
| --- | --- | --- | --- |
| garra | #B5B6A3 | 10.4 | Pebble Garra |
| bubble-barb | #C9C0AE | 13.4 | Bubble Barb |
| asala | #C3CBD3 | 7.6 | Blushing Asala |
| danio | #B9AACB | 16.3 | Twilight Danio body |
| danio-bar | #978BB3 | 22.3 | Twilight Danio stripes |
| loach | #A7B29A | 13.5 | Monsoon Loach |
| glowfin | #7E8AA8 | 25.0 | Junkiri Glowfin |
| katle | #E7C9C6 | 14.3 | Petal Katle |
| mahseer | #E6CF94 | 35.7 | Golden Mahseer |

**Lighting-key band tints** (section 4, all ≤ 40%)

Dawn `#C8BEDA` 12.8, `#B7ADCB` 14.8, `#A8A6BC` 11.7, `#8E9C94` 9.0, `#D9C3CC` 10.1, `#F4E1D6` 12.3 · Day `#9DAFAA` 10.3, `#9DBDC0` 18.2, `#EEF2F0` 1.7 · Golden `#F3E2BC` 22.6, `#C9B9C9` 8.0, `#CDB9B3` 12.7, `#C4BB9A` 21.4, `#8E9A76` 23.4, `#E2CFA4` 27.4 · Dusk `#E3B5B8` 20.3, `#A79BC0` 19.3, `#9C8FB8` 22.3, `#8F8DA8` 16.1, `#5F6E72` 16.7, `#A99AB8` 16.3, `#D8B8C4` 14.8 · Night `#5A6088` 33.8, `#444A70` 39.3, `#4B5A6E` 31.8, `#3E4C5A` 31.1, `#4E5A7A` 36.1, `#6A6F96` 29.3 · Rain `#A3A9BA` 12.4, `#9DA8A3` 6.5, `#7F8E86` 10.6, `#8E9BAB` 17.0, `#C4CAD4` 7.5 · Misty `#D8D6E2` 5.3, `#CFCFDA` 5.0, `#B3BDB5` 5.3, `#DCE0E2` 2.7, `#EEF0F0` 0.8.

---

## 9. Decisions

| Area | Chosen | Rejected 1 | Rejected 2 | Why |
| --- | --- | --- | --- | --- |
| **Overall winner** | **"himalaya" (25.5)**, revised. Every judge problem is fixed and grafts are taken from all three runners-up (Appendix A). | **"ghats", Little Monsoon (23.5).** Best hero tail, best currency (kaasu) and a lovely finale payoff, but the finale (rice dumplings on a banana leaf at monsoon river steps for a giant mahseer) collides with the Karkidaka Vavu bali rite, temple-fish feeding and the kozhukattai offering to Ganesha. Its tea rows moiré on iPad, its night is single-tier, and the karimeen is in the wrong habitat. Its best ideas are grafted instead. | **"meghalaya", Little Cloud Camp (21.5).** The Glasswater's see-through riverbed fights the side view and the mirror water. Flat plateaus give weak vertical rhythm, the root bridge reads as spaghetti linework, the hero reads as a generic kitten, the kadai is a pancake mismatch, and names mix languages. ("open", Pebble & Ember, 19.5: not Indian, a "&" title that reads as a brand, the weakest finale, and "k" for kip reads as thousands.) | Top total, and the top pick of 2 of 3 judges. It is the only concept where the mystery dish, the region's own food and the title are one word, and where every lighting state has its own code-native spectacle (alpenglow mask, window necklace, ghost range, cloud sea swallowing ridges). Its night has three tiers of light, and its lore (mist = breath) ties the weather, clue 1 and the finale together. Judge 2's cast concerns (Totoro umbrella, Pikachu/hamster read, generic guardian) were fixable, and are fixed. |
| **Setting** | **Junkiri Danda / Jun Pokhari**: a fictional rhododendron-ringed high lake on a Sikkim/Darjeeling-style monsoon ridge, above a cloud sea, with a tea-and-hill-town ridge and pillow snows behind | **Darjeeling tea-garden slope.** Tea rows are rigid fine stripes that fight rounded shapes, there is only a thin stream (no dock, no guardian room), and plantation labour history is an uneasy cozy backdrop. Tea survives as 4 broad far stripes. | **Teesta-style warm river valley** with orange orchards. It loses the stacked snow ridges and cloud sea that make the parallax sing, and a rope suspension bridge is fine detail. Saved as the next campsite, Sunthala Bend. | Natural depth bands made of simple shapes (peaks, cloud sea, ridges, cones, domes), mist that belongs there, monsoon rain as the reward, a fully native cast, and food that maps onto every cookware role. |
| **Hero** | **Tuki the large-eared pika**: a round, tailless haymaker with an always-visible doko and the ghum in rain | **Red panda.** Sikkim's state animal, but it reads instantly as Aggretsuko's Retsuko, Turning Red's Mei and Kung Fu Panda's Shifu. | **Himalayan marmot.** A generic brown groundhog blob at 100 px, it lives on bare slopes rather than in rhododendron forest, and its bulk crowds the shopkeeper's scale. | A native, naturally round, tailless body. Real haying behaviour becomes a readable, tier-scaled idle that also finds clue 2. The doko gives a silhouette no famous character has. Pale ear rims and no tail keep it away from Pikachu and mice. |
| **Shopkeeper** | **Boju the grandmother yak** with knitted horn cosies, muffler, bell and knitting | **Himalayan black bear.** The cozy-genre default; its chest crescent reads as a symbol, and bears are feared in real hill villages. | **Takin.** Bhutan's national animal pulls the setting east, and its heavy Roman nose resists kawaii proportions. | The high-camp animal and source of churpi. Slow and woolly. The horn cosies, knitting (the source of the Wool Bunting and Shawl Hammock) and doubled-word voice make her a character. Spectacles were dropped because every Indian concept used them. |
| **Companion** | **Kopila the Chinese pangolin pup**: a bud-ball that hides among real rhododendron buds | **Collared owlet.** "Ullu" is a common insult in India, the owl is a sacred mount, and owls are cozy-game defaults (Blathers). | **Bengal slow loris.** The perfect peeker, but viral "cute loris" media feeds the illegal pet trade, and it is a lowland species. | Shy and nocturnal (matches the dusk/night rule). Tap-to-hide becomes curling into a ball. Its name means "bud", so the camouflage gag is built into the world. It is a gentle nod to the most trafficked mammal, and is never shown handled. |
| **Guardian** | **Kuhiro, the great mist-fish**: one round, whale-sized fish with a cloud-scale back, petal fins and Gurans freckles. Its gill-breath is the lake mist. | **Serpent or naga lake spirit.** Nagas are living objects of devotion around Himalayan lakes (a real faith), and a long water-serpent reads as Haku. | **Giant golden mahseer or koi.** Too close to fish the player catches and cooks; mahseer are temple-fed in parts of India; a glowing koi echoes Tui and La. (The concept's own sky-whale with whiskers and a blowhole was also dropped: judge 2 found it an incoherent hybrid with Haku-like whiskers, generic.) | The mist-is-breath lore links weather, clue 1 and the finale. The freckles matching the night constellation give a two-way payoff players can discover. It is huge, round, slow-blinking and clearly a nature spirit. |
| **Title** | **Moonlight Momos** | **Cloud & Kettle.** No game found and cozy, but generic: it says nothing about the region or the guardian, and an "&" is fiddly to say, search and draw. | **Junkiri.** One word (the spec asks for 2-3), unparseable for most players, and already used by a Nepali library and writing platform. Repurposed in the place name. (Also passed over: "Little Monsoon", from a crowded "Little ___" pattern and too close to the working title.) | 2 words, alliterative, instantly regional, warm for an Indian player (momos are beloved street food), and it names the mystery dish. No existing game found (section 1). The subtitle carries "camping". |
| **Currency** | **Rupees, written ₹120** | **Cowrie shells.** Historically traded in the hills, but they are ocean shells in a mountain game and carry ritual and divination uses. | **Paisa.** "120 paisa" reads as ₹1.20 to any Indian player and breaks the budget. (Kaasu, from "ghats", is Tamil and Malayalam: the wrong region.) | Honest and instantly understood by an Indian owner. The spec allows it, and a chubby copper coin with a gurans emboss makes it cute. The format rules (no decimals, "Rs" or "k") prevent misreads. |
| **Lead instrument** | **Bamboo flute (bansuri/murali), Nepali hill-folk style**, with felt piano, Rhodes, brushed drums and light madal pats | **Nepali sarangi.** Local and lovely, but its bowed, nasal tone turns melancholy over long loops, and generators flatten it into a generic violin. | **Tungna** (Sikkimese plucked lute). Authentic, but generators don't know it, and its plucks clash with the fallback's pentatonic plucks. (Singing bowls are excluded outright as a ritual object.) | It sounds like mist and wind, renders reliably in AI generators, and is easy to fake well in Web Audio (the "ghats" recipe). The madal adds regional colour by day. |
| Place / water / next site | **Junkiri Danda / Jun Pokhari / Sunthala Bend** | **"Gurans Danda"**: likely to collide with real Nepali hill names. | **English-only "Firefly Ridge / Moon Lake"**: loses the regional voice, and "Moon Lake" is a common real place name. | Fictional, easy to say, and checked against real places (section 1). The moon and firefly words echo the mystery. |
| Rain gear | **Ghum** (a real Nepali folded cane-and-leaf rain shield) worn as a hood | **Rhododendron-leaf umbrella** (the concept's original): Totoro's most iconic image, flagged by all 3 judges. | **Flipped doko as a hat**: an upside-down cone reads as a conical hat (national-costume cliché) and spills the flowers. | Regional, hands-free, keeps the ears visible, and shelters Kopila under its tail. |
| Flour name | **Maida Flour** | **Momo Flour**: odd when it makes malpua and tingmo (judge 3). | **Atta**: whole-wheat flour, wrong for momos, and already the bait name. | Maida is the everyday Indian word for the fine white flour that momos, malpua and tingmo all use. |
| Common fish #2 | **Bubble Barb** (native hill barb) | **Mirror Carp**: an introduced European fish (judge 3). | **A third mahseer**: the roster already has Petal Katle and Golden Mahseer. | Native and round, and keeps the "bubble" charm of the spec fish. |

---

## Appendix A: Judge fixes and grafts applied

**Fixes to the winner**

| # | Raised by | Problem | Fix (section) |
| --- | --- | --- | --- |
| 1 | J1, J2, J3 | Leaf umbrella = Totoro | Replaced with the ghum; leaf umbrellas added to Never (5.1, 6) |
| 2 | J1 | Peaks risk a marshmallow read | Corner radius 20-25%, asymmetric shoulders, clean lit/shade split (3.4) |
| 3 | J1 | Near and foreground bands over-dressed | Max 3 species per band, one generator per band, mist hides bases; cut ferns, magnolia, orchid, lichen, primula and most gurans (3.4) |
| 4 | J1 | Mid ridge fine detail | 4 broad tea stripes, 4 houses, 5 windows, 2 threads (3.4) |
| 5 | J1, J2 | Hero reads as mouse or hamster; doko may hide | Doko enlarged and always 14-18 px clear of the head; items ≥ 10 px; pale ear rims; no tail or snout; namlo 7 px (5.1) |
| 6 | J1 | 12-band plan heavy | 10 layers (3 of them mist strips), baked to strips, relit by tint (3.4) |
| 7 | J2 | Kuhiro an incoherent, generic sky-whale hybrid with Haku-like whiskers | One coherent fish: no whiskers or blowhole; cloud-scale back; gill-breath; Gurans freckles (5.4) |
| 8 | J2 | Kopila lacks a gag; altitude stretch | Bud-ball camouflage in the Bud Bush; wanders up from the forest below on monsoon nights; camp set at about 3,000 m; shrunk to 48 px (3.1, 5.3) |
| 9 | J2 | Boju's duplicated "knees" line; generic spectacles | Line replaced with a yak-grunt fact; spectacles swapped for horn cosies (5.2) |
| 10 | J3 | Mirror Carp is non-native | Swapped for the native Bubble Barb (7.3) |
| 11 | J3 | "Momo Flour" used for malpua and tingmo | Renamed Maida Flour (7.2) |
| 12 | J3 | Real lake veneration nearby | No lamps, scarves, bowing or circling; the gift is food on the dock; Jor and Panch Pokhari named in Never (5.4, 6) |
| 13 | J3 | Rupees read literally | `₹120` format: no decimals, "Rs" or "k"; Baloo 2 for the glyph (2) |
| 14 | — | Language rule broken | "Machha Jhol" had 2 hill words; renamed Campfire Jhol (7.5) |

**Grafts from runners-up**

| Source | Idea | Where in this file |
| --- | --- | --- |
| "ghats" | Cloud spill through a ridge saddle | 3.4 |
| "ghats" | Waterfall threads that multiply in rain | 3.4, 4 |
| "ghats" | Foreground leaves with sliding rain beads | 3.4 |
| "ghats" | Guardian freckles that reappear as stars when the clouds part | 3.4, 5.4 |
| "ghats" | The hero slow-blinks back | 5.4 |
| "ghats" | Cool-toned guardian outline | 5.4 |
| "ghats" | Web Audio flute recipe; "never abbreviate the currency" rule | 6, 2 |
| "meghalaya" | Guardian glow lighting the water from below | 5.4 |
| "meghalaya" | Hero perks toward the water on eligible nights | 5.1 |
| "meghalaya" | Windows lighting 0.4 s apart | 3.4, 4 |
| "meghalaya" | Backlit grass heads at golden hour | 3.4, 4 |
| "meghalaya" | Companion camouflage gag | 5.3 |
| "meghalaya" | The guardian's light ends up inside the lantern | 5.4 |
| "open" | Quirk fill scales with the Contentment tier | 5.1 |
| "open" | Clue 2 found through the quirk | 5.1 |
| "open" | Steam curls rising in rain | 3.4, 4 |
| "open" | Two-tone golden rim | 4 |
| "open" | Dusk ribbon (as junkiri) | 3.4, 4 |
| "open" | Shopkeeper line that nudges toward the companion | 5.2 |
