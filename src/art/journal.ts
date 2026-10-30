/**
 * Tuki's Journal (WORLD 6 UI touches): a lokta-paper notebook with faint
 * fibre specks, a wobbly deckled rounded edge, tied with a jute string;
 * bookmark tabs; a round ink stamp; badges. Namespace "journal_".
 */
import { Baker, artRng, ellipsePath, fillOutline, heartPath, roundRectPath, smoothClosed, softShadow, starPath, withState, type Ctx } from './kit';
import { A, P, mix, rgba, shade } from '@/palette';

function deckled(ctx: Ctx, x: number, y: number, w: number, h: number, seed: number): void {
  const r = artRng(seed);
  const pts: [number, number][] = [];
  const step = 26;
  const wob = () => (r() - 0.5) * 3.2;
  const rad = 22;
  for (let px = x + rad; px <= x + w - rad; px += step) pts.push([px, y + wob()]);
  pts.push([x + w - 6, y + 6]);
  for (let py = y + rad; py <= y + h - rad; py += step) pts.push([x + w + wob(), py]);
  pts.push([x + w - 6, y + h - 6]);
  for (let px = x + w - rad; px >= x + rad; px -= step) pts.push([px, y + h + wob()]);
  pts.push([x + 6, y + h - 6]);
  for (let py = y + h - rad; py >= y + rad; py -= step) pts.push([x + wob(), py]);
  pts.push([x + 6, y + 6]);
  smoothClosed(ctx, pts, 0.3);
}

function paper(ctx: Ctx, x: number, y: number, w: number, h: number, seed: number): void {
  const lok = A.lokta;
  ctx.beginPath();
  deckled(ctx, x, y, w, h, seed);
  fillOutline(ctx, lok, mix(lok, P.bark, 0.35), 2.2);
  // Fibre specks + soft fibres.
  const r = artRng(seed + 3);
  withState(ctx, () => {
    ctx.beginPath();
    deckled(ctx, x, y, w, h, seed);
    ctx.clip();
    for (let i = 0; i < (w * h) / 900; i++) {
      ctx.fillStyle = rgba(r() < 0.5 ? P.bark : P.cream, 0.05 + r() * 0.06);
      ctx.beginPath();
      ctx.ellipse(x + r() * w, y + r() * h, 0.6 + r() * 1.6, 0.4 + r(), r() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = rgba(P.bark, 0.06);
    ctx.lineWidth = 1;
    for (let i = 0; i < (w * h) / 6000; i++) {
      const sx = x + r() * w;
      const sy = y + r() * h;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx + 10, sy + (r() - 0.5) * 8, sx + 16 + r() * 14, sy + (r() - 0.5) * 10);
      ctx.stroke();
    }
  });
}

export function bake(b: Baker): void {
  // Open two-page spread.
  b.tex('journal_spread', 980, 620, (ctx, w, h) => {
    softShadow(ctx, w / 2, h - 14, w * 0.48, 22, 0.22);
    // Cover board peeking behind the pages.
    ctx.beginPath();
    roundRectPath(ctx, 6, 10, w - 12, h - 20, 28);
    fillOutline(ctx, mix(P.rose, P.bark, 0.25), shade(mix(P.rose, P.bark, 0.25), 0.3), 2.5);
    paper(ctx, 22, 20, w / 2 - 26, h - 44, 11);
    paper(ctx, w / 2 + 4, 20, w / 2 - 26, h - 44, 23);
    // Spine shadow.
    withState(ctx, () => {
      const g = ctx.createLinearGradient(w / 2 - 40, 0, w / 2 + 40, 0);
      g.addColorStop(0, rgba(P.bark, 0));
      g.addColorStop(0.5, rgba(P.bark, 0.18));
      g.addColorStop(1, rgba(P.bark, 0));
      ctx.fillStyle = g;
      ctx.fillRect(w / 2 - 40, 24, 80, h - 52);
    });
    // Stitches on the spine.
    ctx.strokeStyle = A.jute;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let y = 70; y < h - 60; y += 90) {
      ctx.beginPath();
      ctx.moveTo(w / 2, y);
      ctx.lineTo(w / 2, y + 24);
      ctx.stroke();
    }
  });

  // Closed cover with the jute string.
  b.tex('journal_cover', 520, 620, (ctx, w, h) => {
    softShadow(ctx, w / 2, h - 12, w * 0.46, 20, 0.22);
    ctx.beginPath();
    roundRectPath(ctx, 10, 10, w - 20, h - 24, 30);
    fillOutline(ctx, mix(P.rose, P.bark, 0.18), shade(mix(P.rose, P.bark, 0.18), 0.3), 2.8);
    paper(ctx, 40, 54, w - 80, h - 120, 41);
    // Gurans emboss in the corner.
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ellipsePath(ctx, w / 2 - 20 + Math.cos(a) * 9, 32 + Math.sin(a) * 9, 6.5, 6.5);
      ctx.fillStyle = rgba(A.gurans, 0.55);
      ctx.fill();
    }
    ctx.fillStyle = rgba(P.butter, 0.8);
    ctx.beginPath();
    ctx.arc(w / 2 - 20, 32, 4, 0, Math.PI * 2);
    ctx.fill();
    // Jute string wrapping around.
    ctx.strokeStyle = A.jute;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(w - 30, 10);
    ctx.lineTo(w - 30, h - 14);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w - 30, h * 0.5);
    ctx.bezierCurveTo(w - 70, h * 0.5 + 30, w - 90, h * 0.5 - 10, w - 60, h * 0.5 + 60);
    ctx.stroke();
  });

  // Bookmark tab (white mask, tinted per tab).
  b.tex('journal_tab', 120, 64, (ctx) => {
    ctx.beginPath();
    roundRectPath(ctx, 4, 4, 112, 60, [18, 18, 0, 0]);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = 'rgba(74,66,80,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // Round ink stamp (discovered entries).
  b.tex('journal_stamp', 72, 72, (ctx) => {
    ctx.strokeStyle = rgba(A['gurans-deep'], 0.75);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(36, 36, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.arc(36, 36, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = rgba(A['gurans-deep'], 0.7);
    ctx.beginPath();
    starPath(ctx, 36, 37, 13);
    ctx.fill();
  });

  // Badges.
  b.tex('journal_badgeCamper', 110, 110, (ctx) => {
    ctx.beginPath();
    ellipsePath(ctx, 55, 55, 46, 46);
    fillOutline(ctx, mix(P.sage, P.cream, 0.3), P.moss, 3);
    // little tent
    ctx.beginPath();
    ctx.moveTo(30, 74);
    ctx.quadraticCurveTo(55, 18, 80, 74);
    ctx.closePath();
    fillOutline(ctx, P.butter, shade(P.butter, 0.3), 2.5);
    ctx.beginPath();
    ctx.moveTo(48, 74);
    ctx.quadraticCurveTo(55, 52, 62, 74);
    ctx.closePath();
    ctx.fillStyle = mix(P.glow, P.ember, 0.3);
    ctx.fill();
  });
  b.tex('journal_badgeGuardian', 110, 110, (ctx) => {
    ctx.beginPath();
    ellipsePath(ctx, 55, 55, 46, 46);
    fillOutline(ctx, mix(A.mistfish, P.cream, 0.3), A['mistfish-line'], 3);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.fillStyle = P.glow;
      ctx.beginPath();
      ctx.arc(55 + Math.cos(a) * 18, 55 + Math.sin(a) * 18, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(55, 55, 7, 0, Math.PI * 2);
    ctx.fill();
  });

  b.tex('journal_heart', 40, 40, (ctx) => {
    ctx.beginPath();
    heartPath(ctx, 20, 19, 14);
    fillOutline(ctx, P.blush, A['gurans-deep'], 2.5);
  });
  b.tex('journal_heartEmpty', 40, 40, (ctx) => {
    ctx.beginPath();
    heartPath(ctx, 20, 19, 14);
    ctx.strokeStyle = rgba(A['gurans-deep'], 0.5);
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
  });
}
