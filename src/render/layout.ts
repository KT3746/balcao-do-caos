import { productsUnlocked } from "../data/catalog";
import type { ProductId } from "../types";

export type Rect = { x: number; y: number; w: number; h: number };

export type ShelfCell = { id: ProductId; rect: Rect };

export type PlayLayout = {
  w: number;
  h: number;
  landscape: boolean;
  hud: Rect;
  queue: Rect;
  slots: Rect[];
  counter: Rect;
  clerk: { x: number; y: number };
  hand: Rect;
  shelves: Rect;
  cells: ShelfCell[];
  catY: number;
};

export function contains(r: Rect, x: number, y: number, pad = 0): boolean {
  return x >= r.x - pad && y >= r.y - pad && x <= r.x + r.w + pad && y <= r.y + r.h + pad;
}

export function computeLayout(w: number, h: number, turno: number, slotCount: number): PlayLayout {
  const landscape = w > h * 1.12 && h < 620;
  const safeT = 8;
  const hudH = landscape ? 56 : 72;
  const hud: Rect = { x: 0, y: 0, w, h: hudH };
  const maxSlots = Math.max(2, slotCount);

  if (landscape) {
    const queue: Rect = { x: 10, y: hudH + 8, w: Math.min(280, w * 0.32), h: h - hudH - 18 };
    const shelves: Rect = { x: w * 0.46, y: hudH + 10, w: w * 0.52, h: h - hudH - 20 };
    const counter: Rect = { x: queue.x + queue.w + 6, y: hudH + 18, w: Math.max(70, w * 0.12), h: h - hudH - 36 };
    const slots: Rect[] = [];
    const inner = queue.h - 16;
    const sh = Math.min(150, inner / maxSlots - 8);
    for (let i = 0; i < maxSlots; i++) {
      slots.push({
        x: queue.x + 10,
        y: queue.y + 10 + i * (sh + 8),
        w: queue.w - 20,
        h: sh,
      });
    }
    const cells = gridCells(shelves, turno, landscape);
    return {
      w,
      h,
      landscape,
      hud,
      queue,
      slots,
      counter,
      clerk: { x: counter.x + counter.w * 0.5, y: counter.y + counter.h * 0.62 },
      hand: { x: counter.x + 8, y: counter.y + 12, w: counter.w - 16, h: 64 },
      shelves,
      cells,
      catY: shelves.y + shelves.h * 0.55,
    };
  }

  const queueH = Math.min(236, h * 0.3);
  const queue: Rect = { x: 10, y: hudH + safeT, w: w - 20, h: queueH };
  const counterH = Math.max(70, Math.min(92, h * 0.11));
  const counter: Rect = { x: 18, y: queue.y + queue.h + 6, w: w - 36, h: counterH };
  const shelves: Rect = {
    x: 12,
    y: counter.y + counter.h + 8,
    w: w - 24,
    h: Math.max(160, h - (counter.y + counter.h + 16)),
  };
  const slots: Rect[] = [];
  const sw = (queue.w - 12) / maxSlots;
  for (let i = 0; i < maxSlots; i++) {
    slots.push({
      x: queue.x + 6 + i * sw,
      y: queue.y + 8,
      w: sw - 8,
      h: queue.h - 16,
    });
  }
  return {
    w,
    h,
    landscape,
    hud,
    queue,
    slots,
    counter,
    clerk: { x: counter.x + counter.w * 0.5, y: counter.y + counter.h * 0.35 },
    hand: { x: counter.x + counter.w * 0.62, y: counter.y + 8, w: 72, h: 56 },
    shelves,
    cells: gridCells(shelves, turno, false),
    catY: shelves.y + 28,
  };
}

function gridCells(shelves: Rect, turno: number, landscape: boolean): ShelfCell[] {
  const ids = productsUnlocked(turno).map((p) => p.id);
  const n = ids.length;
  const cols = landscape ? (n > 12 ? 8 : 6) : n > 12 ? 4 : 4;
  const rows = Math.ceil(n / cols);
  const gap = 8;
  const cw = (shelves.w - gap * (cols + 1)) / cols;
  const ch = (shelves.h - gap * (rows + 1)) / rows;
  const cells: ShelfCell[] = [];
  ids.forEach((id, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    cells.push({
      id,
      rect: {
        x: shelves.x + gap + c * (cw + gap),
        y: shelves.y + gap + r * (ch + gap),
        w: cw,
        h: ch,
      },
    });
  });
  return cells;
}

export function applyShelfOrder(cells: ShelfCell[], order: ProductId[]): ShelfCell[] {
  if (order.length !== cells.length) return cells;
  return cells.map((cell, i) => ({ ...cell, id: order[i] ?? cell.id }));
}
