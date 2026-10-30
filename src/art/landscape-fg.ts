/**
 * Landscape bakers, foreground band (FG, parallax 1.3): big rhododendron
 * leaves, grass blades with soft seed heads, fiddlehead curls, rain beads.
 * Each piece is its own small texture so blades sway one by one.
 */
import { Baker, Ctx, artRng, rGrad, vGrad, withState } from './kit';
import { A, P, mix, rgba, shade, tint } from '@/palette';

const LEAF = shade(P.moss, 0.08);

function leafShape(c: Ctx, len: number, wid: number, cy: number): void {
  c.moveTo(4, cy);
  c.bezierCurveTo(len * 0.22, cy - wid * 0.62, len * 0.62, cy - wid * 0.58, len - 4, cy - 1);
  c.quadraticCurveTo(len, cy, len - 4, cy + 1.5);
  c.bezierCurveTo(len * 0.62, cy + wid * 0.56, len * 0.22, cy + wid * 0.6, 4, cy);
  c.closePath();
}

function bakeLeaf(b: Baker, key: string, len: number, wid: number, seed: number): void {
  const h = Math.ceil(wid + 10);
  b.tex(key, len, h, (ctx) => {
    const cy = h / 2;
    const r = artRng(seed);
    withState(ctx, () => {
      ctx.beginPath();
      leafShape(ctx, len, wid, cy);
      ctx.fillStyle = vGrad(ctx, cy - wid / 2, cy + wid / 2, [
        [0, mix(LEAF, P.sage, 0.42)],
        [0.48, mix(LEAF, P.sage, 0.18)],
        [0.52, LEAF],
        [1, shade(LEAF, 0.1)],
      ]);
      ctx.fill();
      ctx.clip();
      // veins
      ctx.strokeStyle = rgba(tint(LEAF, 0.3), 0.45);
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';
      for (let i = 1; i < 7; i++) {
        const x = len * (0.1 + i * 0.12);
        const up = i % 2 === 0;
        ctx.beginPath();
        ctx.moveTo(x, cy);
        ctx.quadraticCurveTo(x + 10, cy + (up ? -1 : 1) * wid * 0.22, x + 20 + r() * 4, cy + (up ? -1 : 1) * wid * 0.42);
        ctx.moveTo(x + 4, cy);
        ctx.quadraticCurveTo(x + 14, cy + (up ? 1 : -1) * wid * 0.22, x + 24, cy + (up ? 1 : -1) * wid * 0.42);
        ctx.stroke();
      }
      // soft sheen along the upper half
      ctx.fillStyle = rgba(P.cream, 0.12);
      ctx.beginPath();
      ctx.ellipse(len * 0.45, cy - wid * 0.22, len * 0.3, wid * 0.12, -0.02, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.beginPath();
    leafShape(ctx, len, wid, cy);
    ctx.strokeStyle = shade(LEAF, 0.3);
    ctx.lineWidth = 2.4;
    ctx.lineJoin = 'round';
    ctx.stroke();
    // midrib
    ctx.strokeStyle = rgba(tint(LEAF, 0.45), 0.85);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(2, cy + 0.5);
    ctx.quadraticCurveTo(len * 0.5, cy - 1, len - 8, cy - 0.5);
    ctx.stroke();
  });
}

/** Grass blade, base at bottom centre. head: seed head at the tip. */
function bakeBlade(b: Baker, key: string, w: number, h: number, lean: number, head: boolean, seed: number): void {
  b.tex(key, w, h, (ctx) => {
    const r = artRng(seed);
    const bx = w / 2;
    const tipX = bx + lean;
    const tipY = head ? 22 : 3;
    const col = mix(P.sage, P.moss, 0.35);
    const hw = head ? 3.6 : 4.6;
    ctx.beginPath();
    ctx.moveTo(bx - hw, h);
    ctx.bezierCurveTo(bx - hw * 0.9 + lean * 0.15, h * 0.6, tipX - 1.5, tipY + h * 0.15, tipX, tipY);
    ctx.bezierCurveTo(tipX + 1.2, tipY + h * 0.15, bx + hw * 0.8 + lean * 0.2, h * 0.6, bx + hw, h);
    ctx.closePath();
    ctx.fillStyle = vGrad(ctx, tipY, h, [
      [0, tint(col, 0.3)],
      [0.6, col],
      [1, shade(col, 0.14)],
    ]);
    ctx.fill();
    ctx.strokeStyle = rgba(shade(col, 0.32), 0.85);
    ctx.lineWidth = 1.3;
    ctx.stroke();
    // light midline
    ctx.strokeStyle = rgba(tint(col, 0.45), 0.5);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(bx, h - 4);
    ctx.quadraticCurveTo(bx + lean * 0.2, h * 0.55, tipX, tipY + 8);
    ctx.stroke();
    if (head) {
      // soft seed head: fuzzy oval of tiny seeds
      const hx = tipX;
      const hy = tipY - 2;
      ctx.fillStyle = rGrad(ctx, hx, hy, 0, 12, [
        [0, mix(P.butter, P.cream, 0.4), 0.9],
        [1, P.butter, 0],
      ]);
      ctx.beginPath();
      ctx.ellipse(hx, hy, 6.5, 14, lean * 0.02, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 22; i++) {
        const t = r();
        const a = r() * Math.PI * 2;
        const sx = hx + Math.cos(a) * 4.2 * Math.sin(t * Math.PI);
        const sy = hy - 12 + t * 24;
        ctx.fillStyle = i % 3 === 0 ? mix(P.butter, P.sage, 0.4) : mix(P.cream, P.butter, 0.5);
        ctx.beginPath();
        ctx.ellipse(sx, sy, 1.5, 2.4, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = rgba(shade(P.butter, 0.25), 0.55);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(hx, hy, 5.6, 13, lean * 0.02, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}

function bakeFiddle(b: Baker): void {
  b.tex('land_fiddle', 56, 104, (ctx) => {
    const col = mix(A.sisnu, P.sage, 0.3);
    ctx.strokeStyle = shade(col, 0.28);
    ctx.lineCap = 'round';
    const path = (c: Ctx) => {
      c.moveTo(24, 104);
      c.bezierCurveTo(22, 74, 14, 52, 22, 32);
      // spiral
      const cx = 32;
      const cy = 26;
      let a = Math.PI;
      let rr = 11;
      for (let i = 0; i < 40; i++) {
        a += 0.24;
        rr *= 0.955;
        c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
    };
    ctx.lineWidth = 6.4;
    ctx.beginPath();
    path(ctx);
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = 3.8;
    ctx.beginPath();
    path(ctx);
    ctx.stroke();
    ctx.strokeStyle = rgba(tint(col, 0.4), 0.7);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(25, 100);
    ctx.bezierCurveTo(23, 74, 15.5, 52, 23, 33);
    ctx.stroke();
    // tiny fuzz
    ctx.fillStyle = rgba(P.butter, 0.5);
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.arc(18 + (i % 3) * 2, 40 + i * 6, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

export function bakeFgBand(b: Baker): void {
  bakeLeaf(b, 'land_leafA', 196, 54, 1501);
  bakeLeaf(b, 'land_leafB', 158, 64, 1502);
  bakeBlade(b, 'land_bladeA', 26, 128, 3, true, 1510);
  bakeBlade(b, 'land_bladeB', 22, 104, -5, false, 1511);
  bakeBlade(b, 'land_bladeC', 30, 138, 7, true, 1512);
  bakeFiddle(b);
  b.tex('land_bead', 12, 12, (ctx) => {
    ctx.fillStyle = rGrad(ctx, 6, 6, 0, 5, [
      [0, P.cream, 0.55],
      [0.8, P.cream, 0.75],
      [1, P.cream, 0.95],
    ]);
    ctx.beginPath();
    ctx.arc(6, 6, 4.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = P.cream;
    ctx.beginPath();
    ctx.arc(4.6, 4.4, 1.4, 0, Math.PI * 2);
    ctx.fill();
  });
}
