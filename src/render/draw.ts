import { ARCHETYPES, PRODUCT_BY_ID } from "../data/catalog";
import type { Customer, Particle, Run } from "../game/sim";
import type { ProductId } from "../types";
import { applyShelfOrder, contains, type PlayLayout, type Rect } from "./layout";

export type PointerGhost = { x: number; y: number; id: ProductId } | null;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function drawShop(
  ctx: CanvasRenderingContext2D,
  run: Run,
  layout: PlayLayout,
  t: number,
  ghost: PointerGhost,
  selectedId: number | null,
): void {
  const { w, h } = layout;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  if (run.shake > 0.4) {
    ctx.translate((Math.random() - 0.5) * run.shake, (Math.random() - 0.5) * run.shake);
  }

  paintWall(ctx, w, h, layout, t);
  paintFloor(ctx, layout);
  paintQueueZone(ctx, layout);
  for (const c of run.customers) drawCustomer(ctx, c, layout, t);
  paintCounter(ctx, layout, t);
  drawClerk(ctx, layout, run, t);
  paintShelves(ctx, layout, run, t);
  if (run.chaos?.kind === "gato") drawCat(ctx, layout, run, t);
  drawParticles(ctx, run.particles, layout);
  if (ghost) drawProduct(ctx, ghost.id, ghost.x, ghost.y, Math.min(56, layout.w * 0.08), t, true);
  if (run.chaos?.kind === "apagao") {
    ctx.fillStyle = "rgba(12, 8, 6, 0.46)";
    ctx.fillRect(0, 0, w, h);
    const gx = w * (0.35 + Math.sin(t * 0.7) * 0.08);
    const gy = h * 0.42;
    const g = ctx.createRadialGradient(gx, gy, 20, gx, gy, 220);
    g.addColorStop(0, "rgba(255, 220, 140, 0.16)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  if (run.hint) drawHint(ctx, layout, run.hint);
  if (selectedId != null) {
    const c = run.customers.find((x) => x.id === selectedId);
    if (c) {
      const r = layout.slots[c.slot];
      if (r) {
        ctx.strokeStyle = "rgba(227, 178, 60, 0.9)";
        ctx.lineWidth = 3;
        roundRect(ctx, r.x - 2, r.y - 2, r.w + 4, r.h + 4, 16);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function paintWall(ctx: CanvasRenderingContext2D, w: number, h: number, layout: PlayLayout, t: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#d9b07a");
  g.addColorStop(0.45, "#c9965c");
  g.addColorStop(1, "#8a5a32");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#b07a44";
  ctx.fillRect(0, 0, w, layout.hud.h + 6);
  // neon ABERTO
  const nx = w - 86;
  const ny = layout.hud.h + (layout.landscape ? 18 : 8);
  ctx.save();
  ctx.shadowColor = "rgba(80, 220, 120, 0.8)";
  ctx.shadowBlur = 12 + Math.sin(t * 6) * 2;
  ctx.fillStyle = "#1a3d24";
  roundRect(ctx, nx, ny, 72, 26, 4);
  ctx.fill();
  ctx.fillStyle = "#7dff9a";
  ctx.font = "800 12px Nunito, sans-serif";
  ctx.fillText("ABERTO", nx + 36, ny + 18);
  ctx.restore();
}

function paintFloor(ctx: CanvasRenderingContext2D, layout: PlayLayout): void {
  const y0 = layout.queue.y;
  const tile = 28;
  for (let y = y0; y < layout.h; y += tile) {
    for (let x = 0; x < layout.w; x += tile) {
      const on = ((x / tile) | 0) % 2 === ((y / tile) | 0) % 2;
      ctx.fillStyle = on ? "#e8d2a8" : "#dcc39a";
      ctx.fillRect(x, y, tile, tile);
    }
  }
  ctx.fillStyle = "rgba(42, 29, 18, 0.12)";
  ctx.fillRect(0, layout.counter.y - 8, layout.w, layout.h);
}

function paintQueueZone(ctx: CanvasRenderingContext2D, layout: PlayLayout): void {
  ctx.fillStyle = "rgba(90, 50, 24, 0.18)";
  roundRect(ctx, layout.queue.x, layout.queue.y, layout.queue.w, layout.queue.h, 18);
  ctx.fill();
}

function paintCounter(ctx: CanvasRenderingContext2D, layout: PlayLayout, t: number): void {
  const r = layout.counter;
  ctx.fillStyle = "#5c3318";
  roundRect(ctx, r.x, r.y, r.w, r.h, 10);
  ctx.fill();
  ctx.fillStyle = "#8a5230";
  if (layout.landscape) {
    ctx.fillRect(r.x + 8, r.y + 10, 14, r.h - 20);
  } else {
    ctx.fillRect(r.x + 10, r.y + 8, r.w - 20, 16);
  }
  ctx.strokeStyle = "rgba(250, 220, 170, 0.25)";
  ctx.lineWidth = 2;
  roundRect(ctx, r.x + 4, r.y + 4, r.w - 8, r.h - 8, 8);
  ctx.stroke();
  const gleam = 0.15 + Math.sin(t * 2) * 0.05;
  ctx.fillStyle = `rgba(255, 230, 180, ${gleam})`;
  if (!layout.landscape) ctx.fillRect(r.x + 18, r.y + 10, r.w * 0.3, 6);
}

function paintShelves(ctx: CanvasRenderingContext2D, layout: PlayLayout, run: Run, t: number): void {
  const s = layout.shelves;
  ctx.fillStyle = "#3d2a18";
  roundRect(ctx, s.x - 6, s.y - 6, s.w + 12, s.h + 12, 14);
  ctx.fill();
  ctx.fillStyle = "#2f6b4f";
  roundRect(ctx, s.x, s.y, s.w, s.h, 12);
  ctx.fill();
  const cells = applyShelfOrder(layout.cells, run.shelfOrder.length === layout.cells.length ? run.shelfOrder : layout.cells.map((c) => c.id));
  for (const cell of cells) {
    const blocked = catBlocks(run, layout, cell.rect);
    ctx.fillStyle = blocked ? "rgba(20, 20, 20, 0.35)" : "rgba(247, 236, 212, 0.92)";
    roundRect(ctx, cell.rect.x, cell.rect.y, cell.rect.w, cell.rect.h, 10);
    ctx.fill();
    if (run.holding === cell.id) {
      ctx.strokeStyle = "#e3b23c";
      ctx.lineWidth = 3;
      roundRect(ctx, cell.rect.x, cell.rect.y, cell.rect.w, cell.rect.h, 10);
      ctx.stroke();
    }
    const cx = cell.rect.x + cell.rect.w / 2;
    const cy = cell.rect.y + cell.rect.h * 0.42;
    const size = Math.min(cell.rect.w, cell.rect.h) * 0.42;
    drawProduct(ctx, cell.id, cx, cy, size, t, false);
    const p = PRODUCT_BY_ID[cell.id];
    ctx.fillStyle = "#2a1d12";
    ctx.font = `800 ${Math.max(10, Math.min(13, cell.rect.w * 0.16))}px Nunito, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(p.short, cx, cell.rect.y + cell.rect.h - 10, cell.rect.w - 8);
  }
}

function catBlocks(run: Run, layout: PlayLayout, rect: Rect): boolean {
  if (run.chaos?.kind !== "gato") return false;
  const cx = layout.shelves.x + run.catX * layout.shelves.w;
  const cy = layout.catY;
  return contains(rect, cx, cy, 18);
}

function drawCat(ctx: CanvasRenderingContext2D, layout: PlayLayout, run: Run, t: number): void {
  const x = layout.shelves.x + run.catX * layout.shelves.w;
  const y = layout.catY + Math.sin(t * 8) * 3;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#2a1d12";
  roundRect(ctx, -18, -8, 36, 16, 8);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(14, -10, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(8, -16);
  ctx.lineTo(12, -24);
  ctx.lineTo(16, -14);
  ctx.moveTo(18, -14);
  ctx.lineTo(24, -22);
  ctx.lineTo(22, -10);
  ctx.fill();
  ctx.fillStyle = "#e3b23c";
  ctx.beginPath();
  ctx.arc(16, -11, 1.6, 0, Math.PI * 2);
  ctx.arc(20, -11, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2a1d12";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.quadraticCurveTo(-28, -16 + Math.sin(t * 10) * 6, -10, -8);
  ctx.stroke();
  ctx.restore();
}

function drawClerk(ctx: CanvasRenderingContext2D, layout: PlayLayout, run: Run, t: number): void {
  const x = layout.clerk.x + Math.sin(t * 2) * 2;
  const y = layout.clerk.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(0, 28, 16, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3b4a6b";
  roundRect(ctx, -14, 2, 28, 24, 6);
  ctx.fill();
  ctx.fillStyle = "#2f6b4f";
  roundRect(ctx, -16, 0, 32, 16, 4);
  ctx.fill();
  ctx.fillStyle = "#f0c9a8";
  ctx.beginPath();
  ctx.arc(0, -10, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a1d12";
  ctx.beginPath();
  ctx.arc(0, -16, 10, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#2a1d12";
  ctx.beginPath();
  ctx.arc(-4, -10, 1.6, 0, Math.PI * 2);
  ctx.arc(4, -10, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2a1d12";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, -6, 4, 0.15, Math.PI - 0.15);
  ctx.stroke();
  if (run.holding) {
    drawProduct(ctx, run.holding, 18, -4, 22, t, true);
  }
  ctx.restore();
}

function drawCustomer(ctx: CanvasRenderingContext2D, c: Customer, layout: PlayLayout, t: number): void {
  const slot = layout.slots[c.slot];
  if (!slot) return;
  const arch = ARCHETYPES.find((a) => a.id === c.arch) ?? ARCHETYPES[0]!;
  let ox = 0;
  let oy = 0;
  if (c.mood === "enter") oy = (1 - c.anim) * (layout.landscape ? 0 : -40);
  if (c.mood === "enter" && layout.landscape) ox = (1 - c.anim) * -50;
  if (c.mood === "leave") oy += c.anim * (layout.landscape ? 0 : -50);
  if (c.mood === "leave" && layout.landscape) ox -= c.anim * 60;
  if (c.mood === "rage") {
    ox += (1 - c.anim) * Math.sin(t * 30) * 4;
    oy += c.anim * 30;
  }
  const cx = slot.x + slot.w / 2 + ox;
  const cy = slot.y + slot.h * 0.62 + oy + Math.sin(t * 3 + c.id) * 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  ctx.beginPath();
  ctx.ellipse(0, 26, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = arch.shirt;
  roundRect(ctx, -16, 0, 32, 26, 8);
  ctx.fill();
  ctx.fillStyle = arch.skin;
  ctx.beginPath();
  ctx.arc(0, -12, 13, 0, Math.PI * 2);
  ctx.fill();
  drawHair(ctx, arch.hairStyle, arch.hair);
  const impatient = c.mood === "wait" && c.patience / c.patienceMax < 0.35;
  ctx.fillStyle = "#2a1d12";
  ctx.beginPath();
  ctx.arc(-4.5, -13, impatient ? 2.1 : 1.7, 0, Math.PI * 2);
  ctx.arc(4.5, -13, impatient ? 2.1 : 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2a1d12";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (c.mood === "happy") ctx.arc(0, -8, 5, 0.15, Math.PI - 0.15);
  else if (c.mood === "rage") ctx.arc(0, -4, 5, Math.PI + 0.2, -0.2);
  else if (impatient) {
    ctx.moveTo(-5, -7);
    ctx.lineTo(5, -7);
  } else ctx.arc(0, -8, 4, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.restore();

  const barW = slot.w - 16;
  const barX = slot.x + 8 + ox;
  const barY = slot.y + 8 + oy;
  ctx.fillStyle = "rgba(42,29,18,0.45)";
  roundRect(ctx, barX, barY, barW, 8, 4);
  ctx.fill();
  const ratio = clamp01(c.patience / c.patienceMax);
  ctx.fillStyle = ratio > 0.5 ? "#2f6b4f" : ratio > 0.28 ? "#e3b23c" : "#c4491d";
  roundRect(ctx, barX, barY, Math.max(4, barW * ratio), 8, 4);
  ctx.fill();

  ctx.fillStyle = "#2a1d12";
  ctx.font = "800 12px Nunito, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(c.special ? `${arch.name} ★` : arch.name, slot.x + slot.w / 2 + ox, barY + 22, slot.w - 8);

  const bubbleW = slot.w - 8;
  const bubbleH = Math.min(88, Math.max(58, slot.h * 0.4));
  const bx = slot.x + 4 + ox;
  const by = slot.y + 28 + oy;
  ctx.fillStyle = c.mood === "rage" ? "#f3d0c6" : "#fff8ea";
  roundRect(ctx, bx, by, bubbleW, bubbleH, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(42,29,18,0.2)";
  ctx.stroke();
  const need = c.order;
  const icon = Math.min(34, (bubbleW - 10) / Math.max(1, need.length) - 6);
  need.forEach((id, i) => {
    const ix = bx + bubbleW / 2 + (i - (need.length - 1) / 2) * (icon + 12);
    drawProduct(ctx, id, ix, by + bubbleH * 0.38, icon * 0.78, t, false);
    ctx.fillStyle = "#2a1d12";
    ctx.font = `800 ${Math.max(9, Math.min(12, bubbleW * 0.12))}px Nunito, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(PRODUCT_BY_ID[id].short, ix, by + bubbleH - 8, icon + 10);
  });
  if (need.length === 0) {
    ctx.fillStyle = "#2f6b4f";
    ctx.font = "800 12px Nunito, sans-serif";
    ctx.fillText("Obrigado!", bx + bubbleW / 2, by + bubbleH * 0.6);
  }
  if (c.phraseT > 0 && c.mood !== "enter") {
    ctx.fillStyle = "rgba(42,29,18,0.86)";
    ctx.font = "700 10px Nunito, sans-serif";
    wrapText(ctx, c.phrase, slot.x + slot.w / 2 + ox, slot.y + slot.h - 10 + oy, slot.w - 8, 12);
  }
}

function drawHair(ctx: CanvasRenderingContext2D, style: string, color: string): void {
  ctx.fillStyle = color;
  if (style === "bald") {
    ctx.beginPath();
    ctx.arc(0, -18, 8, Math.PI, 0);
    ctx.fill();
    return;
  }
  if (style === "bun") {
    ctx.beginPath();
    ctx.arc(0, -22, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -16, 12, Math.PI, 0);
    ctx.fill();
    return;
  }
  if (style === "cap") {
    ctx.fillStyle = "#c4491d";
    roundRect(ctx, -14, -22, 28, 10, 4);
    ctx.fill();
    ctx.fillRect(-16, -14, 32, 4);
    return;
  }
  if (style === "puff") {
    ctx.beginPath();
    ctx.arc(-8, -18, 9, 0, Math.PI * 2);
    ctx.arc(8, -18, 9, 0, Math.PI * 2);
    ctx.arc(0, -22, 8, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.arc(0, -16, 13, Math.PI, 0);
  ctx.fill();
  if (style === "side") {
    roundRect(ctx, 6, -16, 8, 16, 4);
    ctx.fill();
  }
}

export function drawProduct(
  ctx: CanvasRenderingContext2D,
  id: ProductId,
  x: number,
  y: number,
  s: number,
  t: number,
  glow: boolean,
): void {
  ctx.save();
  ctx.translate(x, y);
  if (glow) {
    ctx.shadowColor = "rgba(227,178,60,0.55)";
    ctx.shadowBlur = 12;
  }
  const bob = Math.sin(t * 3 + x * 0.01) * (glow ? 1.5 : 0.4);
  ctx.translate(0, bob);
  switch (id) {
    case "guarana":
      bottle(ctx, s, "#3d8f4a", "#e3b23c");
      leaf(ctx, s);
      break;
    case "guaranaZero":
      bottle(ctx, s, "#1f3d28", "#f6f3ea");
      ctx.fillStyle = "#f6f3ea";
      ctx.font = `800 ${s * 0.28}px Nunito`;
      ctx.textAlign = "center";
      ctx.fillText("0", 0, s * 0.12);
      break;
    case "caju":
      carton(ctx, s, "#e07a2a", "#f6e27a");
      ctx.fillStyle = "#c4491d";
      ctx.beginPath();
      ctx.arc(0, s * 0.05, s * 0.16, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "choco":
      carton(ctx, s, "#6b3a24", "#f0c9a8");
      ctx.fillStyle = "#f0c9a8";
      ctx.beginPath();
      ctx.arc(-s * 0.08, 0, s * 0.06, 0, Math.PI * 2);
      ctx.arc(s * 0.08, 0, s * 0.06, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "agua":
      bottle(ctx, s, "#9fd4ee", "#4d8fbf");
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.arc(-s * 0.08, s * 0.04, s * 0.06, 0, Math.PI * 2);
      ctx.arc(s * 0.1, -s * 0.02, s * 0.05, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "lua":
      pack(ctx, s, "#e3b23c");
      ctx.fillStyle = "#f6f3ea";
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.22, 0.2, Math.PI * 1.6);
      ctx.fill();
      break;
    case "raio":
      pack(ctx, s, "#d4551a");
      ctx.fillStyle = "#f6e27a";
      ctx.beginPath();
      ctx.moveTo(-s * 0.05, -s * 0.22);
      ctx.lineTo(s * 0.08, -s * 0.04);
      ctx.lineTo(0, -s * 0.04);
      ctx.lineTo(s * 0.06, s * 0.22);
      ctx.lineTo(-s * 0.1, 0.02 * s);
      ctx.lineTo(0, 0.02 * s);
      ctx.closePath();
      ctx.fill();
      break;
    case "pao":
      pack(ctx, s, "#f3e1c2");
      ctx.fillStyle = "#d8a07a";
      roundRect(ctx, -s * 0.28, -s * 0.08, s * 0.56, s * 0.22, s * 0.1);
      ctx.fill();
      break;
    case "detergente":
      bottle(ctx, s, "#3b6fb6", "#f6f3ea");
      sun(ctx, s * 0.18);
      break;
    case "amaciante":
      bottle(ctx, s, "#e07a8d", "#f6f3ea");
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.1, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "macarrao":
      pack(ctx, s, "#f0c44c");
      ctx.strokeStyle = "#c4491d";
      ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(-s * 0.2, i * s * 0.08);
        ctx.quadraticCurveTo(0, i * s * 0.08 - s * 0.06, s * 0.2, i * s * 0.08);
        ctx.stroke();
      }
      break;
    case "leite":
      carton(ctx, s, "#f6f3ea", "#4d8fbf");
      break;
    case "picole":
      ctx.fillStyle = "#e8c4a0";
      roundRect(ctx, -s * 0.07, s * 0.05, s * 0.14, s * 0.32, 3);
      ctx.fill();
      ctx.fillStyle = "#ff8a4a";
      roundRect(ctx, -s * 0.16, -s * 0.32, s * 0.32, s * 0.4, 8);
      ctx.fill();
      break;
    case "feijao":
      ctx.fillStyle = "#8a4a2a";
      roundRect(ctx, -s * 0.2, -s * 0.28, s * 0.4, s * 0.56, 6);
      ctx.fill();
      ctx.fillStyle = "#c9a06a";
      ctx.fillRect(-s * 0.2, -s * 0.06, s * 0.4, s * 0.12);
      break;
    case "esponja":
      ctx.fillStyle = "#c6d94e";
      roundRect(ctx, -s * 0.28, -s * 0.16, s * 0.56, s * 0.22, 4);
      ctx.fill();
      ctx.fillStyle = "#5a8a3a";
      roundRect(ctx, -s * 0.28, 0.02 * s, s * 0.56, s * 0.14, 4);
      ctx.fill();
      break;
    case "cafe":
      pack(ctx, s, "#7a1f16");
      ctx.fillStyle = "#e3b23c";
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
  ctx.restore();
}

function bottle(ctx: CanvasRenderingContext2D, s: number, body: string, cap: string): void {
  ctx.fillStyle = cap;
  roundRect(ctx, -s * 0.1, -s * 0.42, s * 0.2, s * 0.12, 3);
  ctx.fill();
  ctx.fillStyle = body;
  roundRect(ctx, -s * 0.18, -s * 0.3, s * 0.36, s * 0.62, s * 0.12);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(-s * 0.12, -s * 0.2, s * 0.08, s * 0.3);
}

function carton(ctx: CanvasRenderingContext2D, s: number, body: string, top: string): void {
  ctx.fillStyle = body;
  roundRect(ctx, -s * 0.2, -s * 0.22, s * 0.4, s * 0.5, 4);
  ctx.fill();
  ctx.fillStyle = top;
  ctx.fillRect(-s * 0.2, -s * 0.34, s * 0.4, s * 0.14);
}

function pack(ctx: CanvasRenderingContext2D, s: number, color: string): void {
  ctx.fillStyle = color;
  roundRect(ctx, -s * 0.28, -s * 0.32, s * 0.56, s * 0.6, 8);
  ctx.fill();
}

function leaf(ctx: CanvasRenderingContext2D, s: number): void {
  ctx.fillStyle = "#1f5a32";
  ctx.beginPath();
  ctx.ellipse(s * 0.16, -s * 0.28, s * 0.1, s * 0.16, 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function sun(ctx: CanvasRenderingContext2D, r: number): void {
  ctx.fillStyle = "#e3b23c";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawParticles(ctx: CanvasRenderingContext2D, parts: Particle[], layout: PlayLayout): void {
  for (const p of parts) {
    const x = p.x * layout.w;
    const y = p.y * layout.h;
    const a = clamp01(p.life / p.max);
    ctx.globalAlpha = a;
    if (p.text) {
      ctx.fillStyle = p.color;
      ctx.font = "800 16px Nunito, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(p.text, x, y);
    } else {
      ctx.fillStyle = p.color;
      if (p.kind === "star") {
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;
  }
}

function drawHint(ctx: CanvasRenderingContext2D, layout: PlayLayout, text: string): void {
  ctx.fillStyle = "rgba(42,29,18,0.86)";
  const w = Math.min(layout.w - 24, 420);
  const x = (layout.w - w) / 2;
  const y = layout.shelves.y + layout.shelves.h - 34;
  roundRect(ctx, x, y, w, 28, 14);
  ctx.fill();
  ctx.fillStyle = "#f7ecd4";
  ctx.font = "700 13px Nunito, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, layout.w / 2, y + 19, w - 16);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number): void {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  ctx.textAlign = "center";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > max) {
      ctx.fillText(line, x, yy, max);
      line = word;
      yy += lh;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, yy, max);
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function hitProduct(layout: PlayLayout, run: Run, x: number, y: number): ProductId | null {
  const cells = applyShelfOrder(layout.cells, run.shelfOrder.length === layout.cells.length ? run.shelfOrder : layout.cells.map((c) => c.id));
  for (const cell of cells) {
    if (!contains(cell.rect, x, y, 2)) continue;
    if (run.chaos?.kind === "gato") {
      const cx = layout.shelves.x + run.catX * layout.shelves.w;
      if (contains(cell.rect, cx, layout.catY, 18)) return null;
    }
    return cell.id;
  }
  return null;
}

export function hitCustomer(layout: PlayLayout, run: Run, x: number, y: number): number | null {
  let bestId: number | null = null;
  let bestD = Infinity;
  for (let i = run.customers.length - 1; i >= 0; i--) {
    const c = run.customers[i]!;
    if (c.mood !== "wait" && c.mood !== "enter") continue;
    const r = layout.slots[c.slot];
    if (!r || !contains(r, x, y, 6)) continue;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h * 0.62;
    const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
    if (d < bestD) {
      bestD = d;
      bestId = c.id;
    }
  }
  return bestId;
}
