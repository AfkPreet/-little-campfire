/**
 * Camp: the world scene (spec sections 3, 5, 7). Builds the landscape, props
 * and cast; routes taps (walk / interact / fish); runs the soft clock, night
 * events, the tent, forage, fire and sleep flows. Fishing, decor mode and the
 * finale live in their own controllers (src/camp/*.ts) and share a CampCtx.
 */
import { pinToScreen } from '@/ui/pin';
import Phaser from 'phaser';
import { directLaunch } from '@/core/debug';
import { DEPTH, SCENES } from '@/config';
import { bus } from '@/core/bus';
import { anyParam, markReady, param, registerDebug } from '@/core/debug';
import { go, openOverlay } from '@/core/flow';
import { layout, setupCamera } from '@/core/layout';
import { applyDebugOnce } from '@/core/presets';
import { reduceMotion } from '@/core/settings';
import { autosave, S, save } from '@/core/state';
import { Hero, type Tier } from '@/chars/Hero';
import { BudBush, Kopila } from '@/chars/Kopila';
import { CAMP } from '@/data/camp';
import { STR } from '@/data/dialogue';
import { FORAGE, FORAGE_SPOTS } from '@/data/forage';
import { FORAGE_SPOT_IDS, type ForageSpotId, type MomentId } from '@/data/ids';
import { DECOR } from '@/data/decor';
import { sparkleBurst, sparkleTrail, dustPuff } from '@/fx/particles';
import { EASE } from '@/fx/juice';
import { setAmbience, setMusicMood, musicMoodFor, playSfx } from '@/audio/engine';
import { BubbleGroup, Dialog, fmt } from '@/ui';
import { Landscape } from '@/world/Landscape';
import { CampfireProp, DecorProp, ForageSpotProp, ScaleSparkle, TentProp } from '@/world/props';
import { chooseTentSpot, snapPoints, tapPeg } from '@/systems/camp';
import { tickFireSit, tickRainRest, tier } from '@/systems/contentment';
import { clockPaused, dawn, sleep as endDay, tickClock, type SleepSummary } from '@/systems/day';
import { pick, spotReady, spotVisible } from '@/systems/forage';
import { canPeek, befriended } from '@/systems/companion';
import { fireflyCheck, nightMoment, triggerMoment } from '@/systems/moments';
import { pickUpScale, shouldShowGlow, glowSeen } from '@/systems/mystery';
import { ownedTent } from '@/systems/shop';
import { dishName } from '@/systems/inventory';
import { CampLight } from './CampLight';
import { Interactables } from './Interactables';
import type { CampCtx } from './ctx';
import { controllerFactories, shotHandlers } from './registry';
import './controllers';

type Updater = (time: number, delta: number) => void;

/** Item icon texture key (src/art/items.ts bakes 'item_<id>'). */
const iconKey = (id: string): string => `item_${id}`;

export interface CampData {
  /** Arriving from the shop: start at the path. */
  fromShop?: boolean;
  /** A dawn moment to play right away (after sleeping). */
  dawnMoment?: MomentId | null;
  /** Just woke up (show the dawn reveal). */
  woke?: boolean;
}

export default class Camp extends Phaser.Scene {
  ctx!: CampCtx;
  private hero!: Hero;
  private landscape!: Landscape;
  private light!: CampLight;
  private inter = new Interactables();
  private fire!: CampfireProp;
  private tents: TentProp[] = [];
  private forageProps = new Map<ForageSpotId, ForageSpotProp>();
  private decorProps: DecorProp[] = [];
  private scaleSparkle?: ScaleSparkle;
  private bush!: BudBush;
  kopila: Kopila | null = null;
  private bubbleGroup: BubbleGroup | null = null;
  private busy = 0;
  private focusX: number | null = null;
  private updaters = new Set<Updater>();
  private controllers: { destroy?: () => void }[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private keyWalkDir = 0;
  private lastSave = 0;
  private walkToken = 0;
  private nightEventsAt = -1;
  private momentAt = -1;
  private glowAt = -1;
  private sitSecs = 0;
  private peekCheckT = 0;
  private dialog: Dialog | null = null;
  private tapInterceptor: ((wx: number, wy: number) => boolean) | null = null;
  private litWindowTimer = 0;
  activity: CampCtx['activity'] = 'idle';

  constructor() {
    super({ key: SCENES.camp });
  }

  init(): void {
    this.inter = new Interactables();
    this.tents = [];
    this.forageProps = new Map();
    this.decorProps = [];
    this.updaters = new Set();
    this.controllers = [];
    this.busy = 0;
    this.focusX = null;
    this.bubbleGroup = null;
    this.kopila = null;
    this.activity = 'idle';
    this.nightEventsAt = -1;
    this.momentAt = -1;
    this.glowAt = -1;
    this.sitSecs = 0;
    this.dialog = null;
    this.tapInterceptor = null;
  }

  create(data: CampData = {}): void {
    applyDebugOnce();
    setupCamera(this);
    const s = S();
    s.scene = 'camp';

    this.landscape = new Landscape(this, { worldW: CAMP.worldW, variant: 'camp' });
    this.light = new CampLight(this);
    this.light.add(this.landscape);

    this.buildProps();
    this.buildCast(data);
    this.buildInput();
    this.buildCtx();
    for (const f of controllerFactories) {
      const c = f(this.ctx);
      if (c) this.controllers.push(c);
    }
    this.registerHooks();

    // Camera starts on Tuki.
    this.snapCamera();
    this.light.update(0, 16);
    if (!directLaunch()) this.cameras.main.fadeIn(reduceMotion() ? 200 : 600, 47, 53, 88);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());

    if (data.dawnMoment) this.time.delayedCall(1800, () => triggerMoment(data.dawnMoment!));
    if (data.woke) {
      // Tuki 'dries' the doko flowers overnight.
      this.hero.emptyDoko();
      this.time.delayedCall(400, () => bus.emit('hud:hint', { text: null }));
    }

    // First visit with a tent but nothing pitched: hint.
    this.time.delayedCall(900, () => this.hintTentIfNeeded());

    const shot = anyParam('shot');
    const handler = shot ? shotHandlers.get(shot) : undefined;
    if (shot === 'fire') this.time.delayedCall(200, () => this.sitByFire(true));
    if (handler) this.time.delayedCall(300, () => void handler(this.ctx));
    markReady(this, shot ? 1600 : 900);
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  private buildProps(): void {
    const s = S();
    const gy = CAMP.groundY;

    // Fire.
    this.fire = new CampfireProp(this, CAMP.fire.x, gy);
    this.light.add(this.fire);
    this.light.warmthAt = (x) => this.fire.lightPoolAt(x);
    this.inter.add({
      id: 'fire',
      standX: () => CAMP.fire.x + (this.hero && this.hero.x < CAMP.fire.x ? -70 : 70),
      hit: () => this.fire.hitArea(),
      actions: () => {
        const night = S().p >= 1;
        const a = [STR.actions.cook];
        if (night) a.push(STR.actions.sit);
        if (night && !S().camp.pitched) a.push(STR.actions.sleep);
        return a;
      },
      act: (a) => {
        if (a === STR.actions.cook) this.openCooking();
        else if (a === STR.actions.sit) this.sitByFire();
        else if (a === STR.actions.sleep) this.askSleep();
      },
      highlight: (on) => this.fire.setHighlight(on),
      bubbleAt: () => ({ x: CAMP.fire.x, y: gy - 120 }),
    });

    // Tents: one prop per spot.
    CAMP.tentSpots.forEach((spot, i) => {
      const t = new TentProp(this, spot.x, gy);
      this.tents.push(t);
      this.light.add(t);
      this.inter.add({
        id: `tent${i}`,
        standX: () => (S().camp.pitched ? t.doorPoint().x : spot.x),
        hit: () => t.hitArea(),
        enabled: () => this.tentInteractable(i),
        actions: () => this.tentActions(i),
        act: (a) => this.tentAct(i, a),
        highlight: (on) => t.setHighlight(on),
        bubbleAt: () => ({ x: spot.x, y: gy - (S().camp.pitched ? 190 : 70) }),
        priority: 1,
      });
    });
    this.refreshTents();

    // Forage spots.
    for (const id of FORAGE_SPOT_IDS) {
      const x = CAMP.forage[id].x;
      const p = new ForageSpotProp(this, id, x, gy);
      this.forageProps.set(id, p);
      this.light.add(p);
      this.inter.add({
        id: `forage:${id}`,
        standX: () => x + (this.hero && this.hero.x < x ? -46 : 46),
        hit: () => p.hitArea(),
        enabled: () => spotVisible(id),
        actions: () => (spotReady(id) ? [STR.actions.forage] : []),
        act: () => this.forage(id),
        highlight: (on) => p.setHighlight(on),
        bubbleAt: () => ({ x, y: gy - 110 }),
      });
    }
    this.refreshForage();

    // Moon Scale on the shore (clue 2).
    this.scaleSparkle = new ScaleSparkle(this, CAMP.scaleSpot.x, gy);
    this.light.add(this.scaleSparkle);
    this.scaleSparkle.setVisible(s.mystery.scaleOnShore);
    this.inter.add({
      id: 'scale',
      standX: () => CAMP.scaleSpot.x - 40,
      hit: () => this.scaleSparkle!.hitArea(),
      enabled: () => S().mystery.scaleOnShore,
      actions: () => (S().mystery.scaleOnShore ? [STR.actions.pickUp] : []),
      act: () => this.pickUpScale(),
      priority: 2,
    });

    // Shop path.
    this.inter.add({
      id: 'shop',
      standX: () => CAMP.shopExitX,
      hit: () => new Phaser.Geom.Rectangle(CAMP.shopCorner.x0, 380, CAMP.shopCorner.x1 - CAMP.shopCorner.x0, CAMP.groundY - 380),
      actions: () => [STR.actions.shop],
      act: () => this.toShop(),
      near: 200,
    });

    this.rebuildDecor();
  }

  private buildCast(data: CampData): void {
    const s = S();
    const startX = data.fromShop ? CAMP.heroArriveX : s.hero.x > 0 ? s.hero.x : CAMP.heroStartX;
    this.hero = new Hero(this, Phaser.Math.Clamp(startX, 40, CAMP.dock.x1 - 20), this.walkYAt(startX));
    this.hero.setDepth(DEPTH.actors);
    this.hero.onStep = (x, y) => {
      dustPuff(this, x, y);
      playSfx('step', { vol: 0.5 });
    };
    this.hero.onEep = () => playSfx('squeak', { vol: 0.5, pitch: 1.3 });
    this.hero.setRain(s.weather.raining);
    this.hero.setTier(tier() as Tier);
    this.hero.setScaleGlow(s.mystery.hasScale && s.mystery.step < 5);
    this.light.addActor(this.hero);
    if (data.fromShop) this.time.delayedCall(250, () => this.walkTo(CAMP.heroArriveX + 220));

    this.bush = new BudBush(this, CAMP.budBush.x, CAMP.budBush.y + 6);
    this.bush.setDepth(DEPTH.props - 2);
    this.light.addActor({ x: CAMP.budBush.x, setLightTint: (c: number) => this.bush.setLightTint(c) });
    this.bush.onTuck = () => playSfx('squeak', { vol: 0.35 });
    this.inter.add({
      id: 'bush',
      standX: () => CAMP.budBush.x + 60,
      hit: () => new Phaser.Geom.Rectangle(CAMP.budBush.x - 50, CAMP.budBush.y - 50, 100, 60),
      enabled: () => this.bush.isPeeking(),
      actions: () => (this.bush.isPeeking() ? ['Hide'] : []),
      act: () => void this.bush.hide(),
      priority: 1,
      near: 0,
    });

    if (s.companion.befriended) this.spawnFriend();
  }

  private spawnFriend(): void {
    if (this.kopila) return;
    this.kopila = new Kopila(this, this.hero.x - 50, CAMP.groundY);
    this.kopila.setDepth(DEPTH.actors - 1);
    this.kopila.setMode('follow');
    this.light.addActor(this.kopila);
  }

  private buildInput(): void {
    const l = layout();
    const zone = this.add.zone(0, 0, l.w, l.h).setOrigin(0).setScrollFactor(0).setDepth(-1000).setInteractive();
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => this.onWorldTap(p));
    this.events.on('resize-zone', () => zone.setSize(layout().w, layout().h));
    const kb = this.input.keyboard;
    if (kb) {
      this.keys = kb.addKeys('A,D,LEFT,RIGHT,E,SPACE,J,B,ESC') as Record<string, Phaser.Input.Keyboard.Key>;
      kb.on('keydown-E', () => this.interactNearest());
      kb.on('keydown-SPACE', () => this.interactNearest());
      kb.on('keydown-J', () => openOverlay(SCENES.journal));
      kb.on('keydown-B', () => bus.emit('hud:bounce', { target: 'backpack' }));
      kb.on('keydown-ESC', () => openOverlay(SCENES.settings));
    }
  }

  private buildCtx(): void {
    const self = this;
    this.ctx = {
      scene: this,
      hero: this.hero,
      landscape: this.landscape,
      light: this.light,
      inter: this.inter,
      fire: this.fire,
      tent: () => {
        const i = S().camp.tentSpot;
        return i === null ? null : this.tents[i];
      },
      walkTo: (x) => this.walkTo(x),
      setBusy: (b) => this.setBusy(b),
      isBusy: () => this.busy > 0,
      bubbles: (x, y, items) => this.showBubbles(x, y, items),
      closeBubbles: () => this.closeBubbles(),
      basketPoint: () => ({ x: layout().w - 150, y: layout().h - 70 }),
      focus: (x) => {
        this.focusX = x;
      },
      rebuildDecor: () => this.rebuildDecor(),
      decorHit: (wx, wy) => {
        for (const d of this.decorProps) {
          const r = d.hitArea();
          if (r.contains(wx, wy)) return (d as unknown as { point?: string }).point ?? null;
        }
        return null;
      },
      setTapInterceptor: (fn) => {
        this.tapInterceptor = fn;
      },
      onUpdate: (fn) => {
        this.updaters.add(fn);
        return () => this.updaters.delete(fn);
      },
      get activity() {
        return self.activity;
      },
      set activity(a) {
        self.setActivity(a);
      },
    };
  }

  private registerHooks(): void {
    registerDebug('sleepNow', () => this.sleepSequence(true));
    registerDebug('heroX', () => this.hero.x);
    registerDebug('walk', ((x: number) => this.walkTo(x)) as never);
    registerDebug('sitFire', () => this.sitByFire(true));
    // World point -> CSS pixel point on the page (for input tests).
    registerDebug('w2s', ((x: number, y: number) => {
      const cam = this.cameras.main;
      const l = layout();
      return { x: ((x - cam.scrollX) * l.zoom) / l.dpr, y: ((y - cam.scrollY) * l.zoom) / l.dpr };
    }) as never);
    registerDebug('interAt', ((x: number, y: number) => {
      const it = this.inter.at(x, y);
      return it ? { id: it.id, actions: it.actions(), hit: it.hit() } : null;
    }) as never);
    registerDebug('campInfo', () => ({
      heroX: this.hero.x,
      activity: this.activity,
      busy: this.busy,
      bubbles: this.bubbleGroup ? this.bubbleGroup.bubbles.map((b) => (b as unknown as { label: string }).label) : [],
      tentPegs: S().camp.tentSpot !== null ? this.tents[S().camp.tentSpot!].pegPositions() : [],
    }));
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------

  private onWorldTap(p: Phaser.Input.Pointer): void {
    if (this.busy > 0) return;
    const cam = this.cameras.main;
    const wp = cam.getWorldPoint(p.x, p.y);
    const wx = wp.x;
    const wy = wp.y;
    if (this.tapInterceptor && this.tapInterceptor(wx, wy)) return;
    if (this.bubbleGroup) {
      // A tap on a bubble belongs to the bubble (its own handler acts on release).
      if (this.bubbleGroup.bubbles.some((b) => b.active && b.getBounds().contains(wx, wy))) return;
      this.closeBubbles();
    }
    // Leave sitting/resting with any tap.
    if (this.activity === 'sit' || this.activity === 'rest' || this.activity === 'read' || this.activity === 'nap') this.standUp();

    const hit = this.inter.at(wx, wy);
    if (hit) {
      this.useInteractable(hit.id);
      return;
    }
    // Water: let the fishing controller handle it.
    if (wx >= CAMP.waterX && wy > CAMP.lakeHorizon + 20) {
      bus.emit('camp:activity', { activity: 'waterTap:' + Math.round(wx) + ',' + Math.round(wy) });
      return;
    }
    // Ground: walk there.
    const tx = Phaser.Math.Clamp(wx, 30, CAMP.dock.x1 - 16);
    void this.walkTo(tx).then((arrived) => {
      if (arrived && tx <= CAMP.shopExitX + 4) this.toShop();
    });
  }

  private useInteractable(id: string): void {
    const it = this.inter.get(id);
    if (!it) return;
    const actions = it.actions();
    if (!actions.length) return;
    void this.walkTo(it.standX()).then((arrived) => {
      if (!arrived) return;
      this.hero.face(this.hero.x < it.hit().centerX ? 1 : -1);
      const now = it.actions();
      if (now.length === 1) it.act(now[0]);
      else if (now.length > 1) {
        const at = it.bubbleAt?.() ?? { x: it.hit().centerX, y: it.hit().y - 20 };
        this.showBubbles(
          at.x,
          at.y,
          now.map((a) => ({ label: a, onTap: () => it.act(a) })),
        );
      }
    });
  }

  private interactNearest(): void {
    if (this.busy > 0) return;
    const it = this.inter.nearest(this.hero.x);
    if (it) this.useInteractable(it.id);
  }

  private showBubbles(x: number, y: number, items: { label: string; onTap: () => void; icon?: string }[]): void {
    this.closeBubbles();
    this.bubbleGroup = new BubbleGroup(
      this,
      x,
      y,
      items.map((i) => ({ label: i.label, icon: i.icon, onTap: i.onTap })),
    );
    this.bubbleGroup.setDepth(DEPTH.ui - 5);
  }

  private closeBubbles(): void {
    if (this.bubbleGroup) {
      const g = this.bubbleGroup;
      this.bubbleGroup = null;
      if (g.active) g.close();
    }
  }

  // ---------------------------------------------------------------------------
  // Walking + camera
  // ---------------------------------------------------------------------------

  private walkYAt(x: number): number {
    if (x <= CAMP.dock.x0) return CAMP.groundY;
    if (x >= CAMP.dock.x0 + 30) return CAMP.dock.y;
    return Phaser.Math.Linear(CAMP.groundY, CAMP.dock.y, (x - CAMP.dock.x0) / 30);
  }

  walkTo(x: number): Promise<boolean> {
    const token = ++this.walkToken;
    if (this.activity === 'fish') bus.emit('camp:activity', { activity: 'leaveFishing' });
    return new Promise((resolve) => {
      if (Math.abs(this.hero.x - x) < 6) {
        resolve(true);
        return;
      }
      this.setActivity('walk');
      this.hero.setPose('stand');
      this.hero.walkTo(x, () => {
        if (token === this.walkToken) {
          this.setActivity('idle');
          resolve(true);
        } else resolve(false);
      });
      // Interrupted by another walk: resolve false.
      const check = () => {
        if (token !== this.walkToken) {
          resolve(false);
          return;
        }
        if (this.hero.walking) this.time.delayedCall(100, check);
      };
      this.time.delayedCall(100, check);
    });
  }

  private snapCamera(): void {
    const cam = this.cameras.main;
    const w = layout().w;
    cam.scrollX = Phaser.Math.Clamp(this.hero.x - w * 0.45, 0, Math.max(0, CAMP.worldW - w));
    cam.scrollY = 0;
  }

  private updateCamera(dt: number): void {
    const cam = this.cameras.main;
    const w = layout().w;
    const target = this.focusX ?? this.hero.x;
    const goal = Phaser.Math.Clamp(target - w * 0.45, 0, Math.max(0, CAMP.worldW - w));
    if (reduceMotion()) cam.scrollX = goal;
    else cam.scrollX += (goal - cam.scrollX) * Math.min(1, dt * 3.2);
    cam.scrollY = 0;
  }

  // ---------------------------------------------------------------------------
  // Busy + activity
  // ---------------------------------------------------------------------------

  private setBusy(b: boolean): void {
    this.busy = Math.max(0, this.busy + (b ? 1 : -1));
    if (b) this.closeBubbles();
  }

  private setActivity(a: CampCtx['activity']): void {
    if (this.activity === a) return;
    this.activity = a;
    if (a !== 'sit' && a !== 'read' && a !== 'nap') this.sitSecs = 0;
    bus.emit('camp:activity', { activity: a });
  }

  private standUp(): void {
    this.hero.setPose('stand');
    this.setActivity('idle');
  }

  // ---------------------------------------------------------------------------
  // Tent
  // ---------------------------------------------------------------------------

  private tentInteractable(i: number): boolean {
    const c = S().camp;
    if (c.pitched) return c.tentSpot === i;
    if (c.tentSpot !== null) return c.tentSpot === i;
    return ownedTent() !== null;
  }

  private tentActions(i: number): string[] {
    const s = S();
    const c = s.camp;
    if (!c.pitched) {
      if (c.tentSpot === null) return ownedTent() ? ['Pitch here'] : [];
      return c.tentSpot === i ? ['Pegs'] : [];
    }
    if (c.tentSpot !== i) return [];
    const a = [STR.actions.rest];
    if (s.p >= 1) a.push(STR.actions.sleep);
    a.push(STR.actions.decorate);
    return a;
  }

  private tentAct(i: number, a: string): void {
    if (a === 'Pitch here') this.pitchAt(i);
    else if (a === STR.actions.rest) this.rest();
    else if (a === STR.actions.sleep) this.askSleep();
    else if (a === STR.actions.decorate) bus.emit('camp:activity', { activity: 'decorate' });
    else if (a === 'Pegs') this.showPegs(i);
  }

  private refreshTents(): void {
    const c = S().camp;
    const owned = ownedTent();
    this.tents.forEach((t, i) => {
      if (c.pitched && c.tentSpot === i && c.tent) t.setState('pitched', c.tent);
      else if (!c.pitched && c.tentSpot === i && owned) {
        t.setState('flat', owned);
        c.pegs.forEach((p, k) => p && t.tapPeg(k));
      } else if (!c.pitched && c.tentSpot === null && owned) t.setState('spot', owned);
      else t.setState('hidden');
    });
    const tent = this.ctx?.tent?.() ?? (c.tentSpot !== null ? this.tents[c.tentSpot] : null);
    if (c.pitched && tent) {
      const e = tent.dripEdge();
      this.light.rain.setDrips(e.x0, e.x1, e.y);
    } else this.light.rain.clearDrips();
  }

  private hintTentIfNeeded(): void {
    const c = S().camp;
    if (!c.pitched && ownedTent()) bus.emit('hud:hint', { text: c.tentSpot === null ? STR.camp.pickSpot : STR.camp.tapPegs });
  }

  private pitchAt(i: number): void {
    chooseTentSpot(i);
    this.refreshTents();
    playSfx('pop');
    this.showPegs(i);
  }

  private pegIds: string[] = [];
  private showPegs(i: number): void {
    const t = this.tents[i];
    bus.emit('hud:hint', { text: STR.camp.tapPegs });
    for (const id of this.pegIds) this.inter.remove(id);
    this.pegIds = [];
    t.pegPositions().forEach((pp, k) => {
      const id = `peg${k}`;
      this.pegIds.push(id);
      this.inter.add({
        id,
        standX: () => this.hero.x,
        hit: () => new Phaser.Geom.Rectangle(pp.x - 30, pp.y - 46, 60, 60),
        enabled: () => !S().camp.pitched && !S().camp.pegs[k],
        actions: () => (S().camp.pegs[k] ? [] : ['Peg']),
        act: () => this.tapPegAt(i, k),
        priority: 3,
        near: 0,
      });
    });
  }

  private tapPegAt(i: number, k: number): void {
    const t = this.tents[i];
    t.tapPeg(k);
    playSfx('tok', { pitch: 1 + k * 0.08 });
    const pp = t.pegPositions()[k];
    sparkleBurst(this, pp.x, pp.y - 10, { count: 6, depth: DEPTH.fx });
    if (!reduceMotion()) this.cameras.main.shake(70, 0.0012);
    const done = tapPeg(k);
    if (done) {
      for (const id of this.pegIds) this.inter.remove(id);
      this.pegIds = [];
      this.setBusy(true);
      void t.springUp().then(() => {
        playSfx('spring');
        this.refreshTents();
        sparkleBurst(this, t.x, CAMP.groundY - 90, { count: 16, depth: DEPTH.fx, spread: 1.4 });
        bus.emit('banner', { text: STR.camp.home });
        bus.emit('hud:hint', { text: null });
        this.setBusy(false);
        save('pitched');
      });
    }
  }

  private rest(): void {
    const t = this.ctx.tent();
    if (!t) return;
    const d = t.doorPoint();
    void this.walkTo(d.x).then((ok) => {
      if (!ok) return;
      this.hero.face(1);
      this.hero.setPose('rest');
      this.setActivity('rest');
    });
  }

  // ---------------------------------------------------------------------------
  // Fire
  // ---------------------------------------------------------------------------

  private openCooking(): void {
    this.setActivity('cook');
    this.hero.setPose('sit');
    openOverlay(SCENES.cooking, { companionNear: this.bush.isPeeking() || !!this.kopila });
    const off = bus.on('overlay:close', (e) => {
      if (e.key !== SCENES.cooking) return;
      off();
      if (this.scene.isActive()) {
        this.standUp();
        this.refreshForage();
      }
    });
  }

  private sitByFire(instant = false): void {
    const x = CAMP.fire.x - 70;
    const sit = () => {
      this.hero.face(1);
      this.hero.setPose('sit');
      this.setActivity('sit');
    };
    if (instant) {
      this.hero.x = x;
      this.snapCamera();
      sit();
    } else void this.walkTo(x).then((ok) => ok && sit());
  }

  // ---------------------------------------------------------------------------
  // Forage
  // ---------------------------------------------------------------------------

  private forage(id: ForageSpotId): void {
    const prop = this.forageProps.get(id)!;
    this.setBusy(true);
    this.hero.setPose('pick');
    this.time.delayedCall(320, () => {
      const res = pick(id);
      const from = prop.pickAnim();
      if (res) {
        playSfx('pop');
        const item = FORAGE[res.item];
        for (let k = 0; k < res.n; k++) this.flyToBasket(iconKey(res.item), from[k % from.length] ?? { x: prop.hitArea().centerX, y: prop.hitArea().y }, k * 110);
        this.time.delayedCall(700 + res.n * 110, () => {
          bus.emit('toast', { text: fmt(STR.toasts.foraged, { n: res.n, item: item.name }), icon: iconKey(res.item) });
        });
      }
      this.refreshForage();
      this.time.delayedCall(380, () => {
        this.hero.setPose('stand');
        this.setBusy(false);
      });
    });
  }

  private refreshForage(): void {
    const rainy = S().weather.lastNightRainy;
    for (const [id, p] of this.forageProps) {
      const item = FORAGE[FORAGE_SPOTS[id].item];
      if (id === 'moon_spot') {
        if (!spotVisible(id)) p.setState(S().p >= 1 || !item.needsClue ? 'hidden' : 'bud');
        else p.setState(spotReady(id) ? 'open' : 'picked');
        if (S().mystery.step < 3) p.setState('hidden');
        else if (S().p < 1) p.setState('bud');
        continue;
      }
      p.setState(spotReady(id) ? 'ready' : 'picked', !!item.rainBonus && rainy);
    }
  }

  /** An item icon arcs from a world point into the HUD basket (screen space). */
  flyToBasket(key: string, from: { x: number; y: number }, delay = 0): void {
    const cam = this.cameras.main;
    const img = this.add.image(from.x, from.y, key).setDepth(DEPTH.ui - 1).setScale(0.0001);
    const target = this.ctx.basketPoint();
    const trail = sparkleTrail(this, img, DEPTH.ui - 2);
    const k = 1 / (this.textures.get(key).source[0].width / 40);
    const o = { t: 0 };
    const sx = from.x;
    const sy = from.y;
    this.tweens.add({
      targets: o,
      t: 1,
      delay,
      duration: reduceMotion() ? 450 : 800,
      ease: EASE.in,
      onStart: () => img.setScale(k),
      onUpdate: () => {
        const tx = cam.scrollX + target.x;
        const ty = cam.scrollY + target.y;
        const t = o.t;
        const mx = (sx + tx) / 2;
        const my = Math.min(sy, ty) - 140;
        img.x = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * mx + t * t * tx;
        img.y = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * my + t * t * ty;
        img.setScale(k * (1 - t * 0.4));
      },
      onComplete: () => {
        trail.stop();
        this.time.delayedCall(500, () => trail.destroy());
        img.destroy();
        playSfx('basket');
        bus.emit('hud:bounce', { target: 'backpack' });
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Mystery bits
  // ---------------------------------------------------------------------------

  private pickUpScale(): void {
    if (!this.scaleSparkle) return;
    this.setBusy(true);
    this.hero.setPose('pick');
    void this.scaleSparkle.pickUp().then(() => {
      pickUpScale();
      sparkleBurst(this, CAMP.scaleSpot.x, CAMP.groundY - 20, { count: 14, color: '#DCE8F5', depth: DEPTH.fx });
      playSfx('chime');
      this.hero.setScaleGlow(true);
      this.hero.setPose('stand');
      this.setBusy(false);
    });
  }

  // ---------------------------------------------------------------------------
  // Decor
  // ---------------------------------------------------------------------------

  rebuildDecor(): void {
    for (const d of this.decorProps) {
      this.light.remove(d);
      d.destroy();
    }
    this.decorProps = [];
    const pts = snapPoints();
    const tentIdx = S().camp.tentSpot;
    for (const p of S().camp.placed) {
      const sp = pts.find((x) => x.id === p.point);
      if (!sp) continue;
      let to: { x: number; y: number } | undefined;
      let x = sp.x;
      let y = sp.y;
      if (sp.kind === 'span' && sp.ends) {
        const a = pts.find((q) => q.id === sp.ends![0])!;
        const b = pts.find((q) => q.id === sp.ends![1])!;
        x = a.x;
        y = a.y;
        to = { x: b.x, y: b.y };
      }
      // Tent hang points follow the tent prop's own geometry when available.
      if (p.point.startsWith('tent:') && tentIdx !== null) {
        const hp = this.tents[tentIdx].hangPoint(Number(p.point.split(':')[1]));
        x = hp.x;
        y = hp.y;
      }
      const d = new DecorProp(this, p.id, x, y, to ? { to } : undefined);
      (d as unknown as { point?: string }).point = p.point;
      d.onChime = () => playSfx('tinkle', { vol: 0.5 });
      this.decorProps.push(d);
      this.light.add(d);
    }
    void DECOR;
  }

  // ---------------------------------------------------------------------------
  // Sleep
  // ---------------------------------------------------------------------------

  private askSleep(): void {
    if (this.dialog) return;
    const noTent = !S().camp.pitched;
    this.setBusy(true);
    this.dialog = new Dialog(this, layout().w / 2, layout().h / 2, {
      title: noTent ? STR.camp.noTent : STR.camp.sleepAsk,
      confirm: STR.camp.sleep,
      cancel: STR.camp.stayUp,
      onConfirm: () => {
        this.dialog = null;
        this.setBusy(false);
        this.sleepSequence();
      },
      onCancel: () => {
        this.dialog = null;
        this.setBusy(false);
      },
      depth: DEPTH.overlay,
    } as never);
    pinToScreen(this.dialog);
  }

  private sleeping = false;
  sleepSequence(auto = false): void {
    if (this.sleeping) return;
    this.sleeping = true;
    this.setBusy(true);
    this.closeBubbles();
    const t = this.ctx.tent();
    const finish = () => {
      const summary: SleepSummary = endDay(highlightLines);
      save('sleep');
      openOverlay(SCENES.summary, { summary, auto });
      const off = bus.on('overlay:close', (e) => {
        if (e.key !== SCENES.summary) return;
        off();
        this.afterSummary(summary);
      });
    };
    const lieDown = () => {
      this.hero.setPose('sleep');
      this.setActivity('sleep');
      playSfx('page', { vol: 0.3 });
      this.cameras.main.fadeOut(auto ? 200 : 1400, 47, 53, 88);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, finish);
    };
    if (auto) lieDown();
    else if (t && S().camp.pitched) void this.walkTo(t.doorPoint().x).then(lieDown);
    else lieDown();
  }

  private afterSummary(summary: SleepSummary): void {
    if (summary.tripOver) {
      go(SCENES.album, {}, 0);
      return;
    }
    const m = dawn();
    S().hero.x = this.ctx.tent()?.doorPoint().x ?? CAMP.heroStartX;
    this.scene.restart({ dawnMoment: m, woke: true } satisfies CampData);
  }

  // ---------------------------------------------------------------------------
  // Shop
  // ---------------------------------------------------------------------------

  private toShop(): void {
    if (this.busy > 0) return;
    S().hero.x = CAMP.heroArriveX;
    save('toShop');
    go(SCENES.shop);
  }

  // ---------------------------------------------------------------------------
  // Night events
  // ---------------------------------------------------------------------------

  private onNightStart(): void {
    const ns = S().nightSecs;
    this.nightEventsAt = ns;
    if (shouldShowGlow()) this.glowAt = 6 + Math.random() * 6;
    this.momentAt = 15 + Math.random() * 25;
    this.refreshForage();
    this.refreshTents();
  }

  private updateNight(dt: number): void {
    const s = S();
    if (s.p < 1) return;
    if (this.nightEventsAt < 0) this.onNightStart();
    const ns = s.nightSecs;
    // First-night glow (needs the hero outside, not sleeping).
    if (this.glowAt > 0 && ns > this.glowAt && this.activity !== 'sleep' && shouldShowGlow()) {
      this.glowAt = -1;
      bus.emit('camp:activity', { activity: 'glowSighting' });
      // The guardian controller plays the visual; if none is registered, record anyway.
      this.time.delayedCall(6200, () => {
        if (shouldShowGlow()) glowSeen();
      });
    }
    // Rare moment of the night (also re-checked when blissful is reached).
    if (this.momentAt > 0 && ns > this.momentAt && this.activity !== 'sleep') {
      const m = nightMoment();
      if (m) {
        this.momentAt = -1;
        triggerMoment(m);
      } else if (s.contentment.value < 100) this.momentAt = -1;
    }
    if (this.momentAt < 0 && s.contentment.value >= 100 && this.activity !== 'sleep') {
      const m = nightMoment();
      if (m) triggerMoment(m);
    }
    // Sitting by the fire / hammock / bookshelf: +1 per 10 s (max 10 a night) and the firefly swirl.
    if (this.activity === 'sit' || this.activity === 'read' || this.activity === 'nap') {
      this.sitSecs += dt;
      tickFireSit(dt);
      if (fireflyCheck(this.sitSecs)) {
        this.light.fireflies.swirl(CAMP.fire.x, CAMP.groundY - 150);
        triggerMoment('firefly_swirl');
      }
    }
  }

  private updateCompanion(dt: number): void {
    this.peekCheckT -= dt;
    if (this.peekCheckT > 0) return;
    this.peekCheckT = 1;
    if (befriended()) {
      if (!this.kopila) this.spawnFriend();
      return;
    }
    const want = canPeek(false) && Math.abs(this.hero.x - CAMP.budBush.x) < 700;
    if (want && !this.bush.isPeeking() && !S().companion.seenToday) {
      this.bush.peek(true);
      S().companion.seenToday = true;
      bus.emit('toast', { text: STR.companion.peek });
    } else if (want && !this.bush.isPeeking() && S().companion.seenToday && Math.random() < 0.15) {
      this.bush.peek(true);
    }
    if (this.bush.isPeeking()) this.bush.lookAt(this.hero.x);
  }

  // ---------------------------------------------------------------------------
  // Frame
  // ---------------------------------------------------------------------------

  override update(time: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    const s = S();

    // Keyboard walking.
    if (this.keys && this.busy === 0) {
      const left = this.keys.A?.isDown || this.keys.LEFT?.isDown;
      const right = this.keys.D?.isDown || this.keys.RIGHT?.isDown;
      const dir = left ? -1 : right ? 1 : 0;
      if (dir !== 0) {
        if (this.activity === 'sit' || this.activity === 'rest') this.standUp();
        const tx = Phaser.Math.Clamp(this.hero.x + dir * 90, 30, CAMP.dock.x1 - 16);
        if (dir !== this.keyWalkDir || !this.hero.walking) void this.walkTo(tx);
        else this.hero.walkTo(tx);
        if (this.hero.x <= CAMP.shopExitX + 2 && dir < 0) this.toShop();
      } else if (this.keyWalkDir !== 0) {
        this.hero.stopWalk(false);
        this.setActivity('idle');
      }
      this.keyWalkDir = dir;
    }

    // Clock (pauses for overlays; never while sleeping).
    if (!clockPaused() && this.activity !== 'sleep') {
      const ev = tickClock(dt);
      if (ev.night) this.onNightStart();
      if (ev.label) this.refreshForage();
    }

    // Hero follows the dock height; rain hood; tier.
    this.hero.y = this.walkYAt(this.hero.x);
    this.hero.tick(time, delta);
    if (this.kopila) {
      const kx = this.hero.x - 46 * this.hero.facing;
      const following = !['fish', 'sit', 'sleep'].includes(this.activity);
      if (following && Math.abs(this.kopila.x - kx) > 30 && !this.kopila.walking) this.kopila.walkTo(kx);
      this.kopila.y = this.walkYAt(this.kopila.x);
      this.kopila.tick(time, delta);
    }
    this.bush.tick(time, delta);

    this.light.update(time, delta);
    this.updateCamera(dt);

    // Proximity glow + glance.
    const suppress = this.busy > 0 || this.activity === 'fish' || this.activity === 'sleep' || this.activity === 'decor';
    this.inter.updateGlow(this.hero.x, suppress);
    const near = suppress ? null : this.inter.nearest(this.hero.x, 220);
    this.hero.lookAt(near ? near.hit().centerX : null);

    // Contentment trickles.
    if (this.activity === 'rest' && s.weather.raining) tickRainRest(dt);
    this.updateNight(dt);
    this.updateCompanion(dt);

    // Expression by tier / time.
    this.updateExpression();

    // Audio.
    const fireDist = Math.abs(this.hero.x - CAMP.fire.x);
    setAmbience({
      scene: 'camp',
      p: s.p,
      raining: s.weather.raining,
      inTent: this.activity === 'rest',
      nearFire: Phaser.Math.Clamp(1 - fireDist / 600, 0, 1),
      nearWater: Phaser.Math.Clamp((this.hero.x - 1800) / 500, 0, 1),
    });
    setMusicMood(musicMoodFor(s.p, s.weather.raining, this.activity === 'finale'));

    for (const fn of this.updaters) fn(time, delta);
    this.landscape.update(time, delta);
    for (const d of this.decorProps) d.update(time, delta);
    for (const p of this.forageProps.values()) p.update(time, delta);
    for (const t of this.tents) t.update(time, delta);
    this.fire.update(time, delta);
    this.scaleSparkle?.update(time, delta);

    // Tent coziness: doorway glow at night / in rain; cabin window.
    this.litWindowTimer -= dt;
    if (this.litWindowTimer <= 0) {
      this.litWindowTimer = 0.5;
      const t = this.ctx.tent();
      if (t && s.camp.pitched) t.setDoorGlow(Math.max(this.light.light.night, this.light.rainAmount * 0.7));
      this.hero.setRain(s.weather.raining);
      this.hero.setTier(tier() as Tier);
      if (this.scaleSparkle) this.scaleSparkle.setVisible(s.mystery.scaleOnShore);
    }

    // Periodic position save.
    if (time - this.lastSave > 4000) {
      this.lastSave = time;
      s.hero.x = Math.round(this.hero.x);
      autosave('pos');
    }
  }

  private lastExpr = '';
  private updateExpression(): void {
    if (this.activity === 'sleep') {
      if (this.lastExpr !== 'sleep') this.hero.setExpression('sleepy');
      this.lastExpr = 'sleep';
      return;
    }
    const t = tier();
    const night = S().p >= 1;
    const e = t === 'blissful' ? 'blissful' : t === 'glowing' ? 'happy' : night && (this.activity === 'sit' || this.activity === 'rest') && t === 'cozy' ? 'sleepy' : t === 'content' ? 'happy' : 'neutral';
    if (e !== this.lastExpr) {
      this.lastExpr = e;
      this.hero.setExpression(e);
    }
  }

  private cleanup(): void {
    for (const c of this.controllers) c.destroy?.();
    this.controllers = [];
    this.updaters.clear();
    this.landscape?.destroy();
    this.sleeping = false;
    S().hero.x = Math.round(this.hero?.x ?? CAMP.heroStartX);
  }
}

/** Up to 3 highlight lines for the day summary card. */
function highlightLines(log: import('@/core/state').DayLog): string[] {
  const out: string[] = [];
  if (log.fishCaught > 0) out.push(fmt(STR.summary.caught, { n: log.fishCaught }));
  const cooked = Object.entries(log.cooked) as [string, number][];
  if (cooked.length) {
    const newOne = log.newRecipes[0];
    if (newOne) out.push(fmt(STR.summary.cookedNew, { dish: dishName(newOne) }));
    else {
      const [id] = cooked.sort((a, b) => b[1] - a[1])[0];
      out.push(fmt(STR.summary.cooked, { dish: dishName(id as never) }));
    }
  }
  for (const m of log.moments) out.push(fmt(STR.summary.moment, { moment: momentName(m) }));
  if (log.shared) out.push(STR.summary.shared);
  if (log.foraged > 0) out.push(fmt(STR.summary.foraged, { n: log.foraged }));
  if (!out.length) out.push(STR.summary.quiet);
  return out.slice(0, 3);
}

import { MOMENTS } from '@/data/moments';
function momentName(id: MomentId): string {
  return MOMENTS[id].name;
}

void param;
