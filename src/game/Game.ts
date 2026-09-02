import { Sfx } from "../audio/sfx";
import { BUILD_ID } from "../config";
import { TOASTS, productsUnlocked } from "../data/catalog";
import { createRun, floatText, livesGlyph, maxSlotsFor, tick, toastFor, tryDeliver, tryPickup, type Run, type SimEvent } from "./sim";
import { loadSave, writeSave } from "../persist";
import { computeLayout, contains, type PlayLayout } from "../render/layout";
import { drawProduct, drawShop, hitCustomer, hitProduct, type PointerGhost } from "../render/draw";
import type { ProductId, SaveData, View } from "../types";
import { Screens, type UiAction } from "../ui/screens";

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  ui: Screens;
  audio = new Sfx();
  save: SaveData;
  view: View = "title";
  run: Run | null = null;
  layout: PlayLayout | null = null;
  ghost: PointerGhost = null;
  selected: number | null = null;
  private last = 0;
  private hidden = false;
  private dpr = 1;
  private toastEl: HTMLElement;
  private bannerEl: HTMLElement;
  private hud: HTMLElement;
  private dragging: ProductId | null = null;
  private pointerId: number | null = null;
  private cssW = 0;
  private cssH = 0;

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement) {
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Balcão do Caos: canvas 2D indisponível");
    this.canvas = canvas;
    this.ctx = ctx;
    this.ui = new Screens(uiRoot);
    this.ui.onAction = (a) => this.handle(a);
    this.save = loadSave();
    this.audio.setMuted(this.save.muted);
    this.toastEl = document.getElementById("toast")!;
    this.bannerEl = document.getElementById("banner")!;
    this.hud = document.getElementById("hud")!;
    this.bind();
    this.showTitle();
    window.addEventListener("resize", () => this.resize());
    window.addEventListener("orientationchange", () => this.resize());
    document.addEventListener("visibilitychange", () => {
      this.hidden = document.hidden;
      if (document.hidden && this.view === "play") this.pause();
    });
    const unlock = () => {
      void this.audio.unlock();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    this.resize();
    console.info(`Balcão do Caos build ${BUILD_ID}`);
  }

  start(): void {
    this.last = performance.now();
    const loop = (now: number) => {
      requestAnimationFrame(loop);
      if (this.hidden) {
        this.last = now;
        return;
      }
      let dt = (now - this.last) / 1000;
      this.last = now;
      if (dt > 0.12) dt = 0.12;
      try {
        this.tick(dt);
      } catch (err) {
        console.error("Balcão do Caos: falha no frame", err);
      }
    };
    requestAnimationFrame(loop);
  }

  private bind(): void {
    document.getElementById("btn-pause")?.addEventListener("click", () => this.handle({ type: "pause" }));
    document.getElementById("btn-mute")?.addEventListener("click", () => this.handle({ type: "mute" }));

    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    this.canvas.addEventListener("pointerdown", (e) => this.onDown(e));
    this.canvas.addEventListener("pointermove", (e) => this.onMove(e));
    this.canvas.addEventListener("pointerup", (e) => this.onUp(e));
    this.canvas.addEventListener("pointercancel", () => this.clearDrag());
    window.addEventListener("keydown", (e) => this.onKey(e));

    document.body.addEventListener(
      "touchmove",
      (ev) => {
        if (!document.body.classList.contains("is-play")) return;
        const t = ev.target as HTMLElement | null;
        if (t?.closest("#ui, .btn, .icon-btn")) return;
        ev.preventDefault();
      },
      { passive: false },
    );
  }

  private pos(e: PointerEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private onDown(e: PointerEvent): void {
    if (this.view !== "play" || !this.run || !this.layout) return;
    if (e.button !== 0 && e.pointerType === "mouse") return;
    void this.audio.unlock();
    const p = this.pos(e);
    const cust = hitCustomer(this.layout, this.run, p.x, p.y);
    const prod = hitProduct(this.layout, this.run, p.x, p.y);
    if (!prod && this.tappedBlockedShelf(p.x, p.y)) {
      this.toast("O gato da loja assumiu a prateleira.");
      this.audio.wrong();
      return;
    }
    if (prod) {
      const ev = tryPickup(this.run, prod);
      if (ev) {
        this.audio.pickup();
        this.dragging = prod;
        this.pointerId = e.pointerId;
        this.ghost = { x: p.x, y: p.y, id: prod };
        try {
          this.canvas.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
      return;
    }
    if (cust != null) {
      this.selected = cust;
      if (this.run.holding) this.deliver(cust, p);
    }
  }

  private tappedBlockedShelf(x: number, y: number): boolean {
    if (!this.run || !this.layout || this.run.chaos?.kind !== "gato") return false;
    const cx = this.layout.shelves.x + this.run.catX * this.layout.shelves.w;
    const cy = this.layout.catY;
    for (const cell of this.layout.cells) {
      if (contains(cell.rect, x, y, 2) && contains(cell.rect, cx, cy, 18)) return true;
    }
    return false;
  }

  private onMove(e: PointerEvent): void {
    if (this.view !== "play" || !this.dragging || e.pointerId !== this.pointerId) return;
    const p = this.pos(e);
    if (this.ghost) {
      this.ghost.x = p.x;
      this.ghost.y = p.y;
    }
  }

  private onUp(e: PointerEvent): void {
    if (this.view !== "play" || !this.run || !this.layout) return;
    if (this.dragging && e.pointerId === this.pointerId) {
      const p = this.pos(e);
      const cust = hitCustomer(this.layout, this.run, p.x, p.y);
      if (cust != null) this.deliver(cust, p);
    }
    this.clearDrag();
  }

  private clearDrag(): void {
    this.dragging = null;
    this.pointerId = null;
    this.ghost = null;
  }

  private deliver(customerId: number, at: { x: number; y: number }): void {
    if (!this.run) return;
    const ev = tryDeliver(this.run, customerId, {
      x: at.x / Math.max(1, this.cssW),
      y: at.y / Math.max(1, this.cssH),
    });
    if (!ev) return;
    this.applyEvent(ev, at);
  }

  private onKey(e: KeyboardEvent): void {
    if (e.code === "Escape") {
      if (this.view === "play") this.pause();
      else if (this.view === "paused") this.resume();
      return;
    }
    if (e.code === "KeyM") {
      this.handle({ type: "mute" });
      return;
    }
    if (this.view !== "play" || !this.run || !this.layout) return;
    const order = this.run.shelfOrder;
    const ids =
      order.length === this.layout.cells.length ? order.slice() : this.layout.cells.map((c) => c.id);
    const map: Record<string, number> = {
      Digit1: 0,
      Digit2: 1,
      Digit3: 2,
      Digit4: 3,
      Digit5: 4,
      Digit6: 5,
      Digit7: 6,
      Digit8: 7,
      KeyQ: 8,
      KeyW: 9,
      KeyE: 10,
      KeyR: 11,
      KeyA: 12,
      KeyS: 13,
      KeyD: 14,
      KeyF: 15,
    };
    const idx = map[e.code];
    if (idx != null && ids[idx]) {
      const ev = tryPickup(this.run, ids[idx]!);
      if (ev) this.audio.pickup();
      e.preventDefault();
      return;
    }
    const waiting = this.run.customers.filter((c) => c.mood === "wait" || c.mood === "enter");
    if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
      if (!waiting.length) return;
      const i = waiting.findIndex((c) => c.id === this.selected);
      const next = e.code === "ArrowRight" ? i + 1 : i - 1;
      const wrap = (next + waiting.length) % waiting.length;
      this.selected = waiting[wrap]!.id;
      e.preventDefault();
      return;
    }
    if (e.code === "Space" || e.code === "Enter") {
      const id = this.selected ?? waiting[0]?.id;
      if (id != null) this.deliver(id, { x: this.cssW / 2, y: this.cssH * 0.3 });
      e.preventDefault();
    }
  }

  private applyEvent(ev: SimEvent, at?: { x: number; y: number }): void {
    if (!this.run) return;
    switch (ev.type) {
      case "spawn":
        this.audio.bell();
        break;
      case "deliver": {
        this.audio.cash();
        if (ev.combo >= 3) this.audio.combo(ev.combo);
        if (at) {
          floatText(
            this.run,
            at.x / Math.max(1, this.cssW),
            at.y / Math.max(1, this.cssH) - 0.04,
            `+${ev.score}`,
            "#2f6b4f",
          );
        }
        if (ev.combo >= 4) this.toast(TOASTS.combo[Math.min(TOASTS.combo.length - 1, ev.combo - 4)]!);
        break;
      }
      case "wrong":
        this.audio.wrong();
        this.toast(TOASTS.wrong[0]!);
        break;
      case "rage":
        this.audio.slam();
        this.toast(`${ev.name} foi embora.`);
        break;
      case "shift":
        this.audio.shift();
        break;
      case "chaos":
        this.audio.chaos();
        this.toast(toastFor(ev.kind));
        break;
      case "over":
        this.audio.over();
        this.finish();
        break;
      default:
        break;
    }
  }

  private tick(dt: number): void {
    this.resizeIfNeeded();
    if (this.view === "play" && this.run) {
      this.layout = computeLayout(this.cssW, this.cssH, this.run.turno, maxSlotsFor(this.run.turno));
      const events = tick(this.run, dt);
      for (const ev of events) this.applyEvent(ev);
      if (this.run.over && this.view === "play") this.finish();
      this.syncHud();
      this.syncBanner();
    }
    this.paint();
  }

  private paint(): void {
    const { ctx, cssW, cssH } = this;
    if ((this.view === "play" || this.view === "paused") && this.run && this.layout) {
      drawShop(ctx, this.run, this.layout, this.run.t, this.view === "play" ? this.ghost : null, this.selected);
      return;
    }
    this.paintMenuBg(cssW, cssH);
  }

  private paintMenuBg(w: number, h: number): void {
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#d9b07a");
    g.addColorStop(1, "#7a4a28");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const tile = 36;
    ctx.globalAlpha = 0.18;
    for (let y = h * 0.45; y < h; y += tile) {
      for (let x = 0; x < w; x += tile) {
        ctx.fillStyle = ((x / tile) | 0) % 2 === ((y / tile) | 0) % 2 ? "#f7ecd4" : "#c4491d";
        ctx.fillRect(x, y, tile, tile);
      }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#5c3318";
    ctx.fillRect(0, h * 0.58, w, 28);
    const ids = productsUnlocked(3).map((p) => p.id);
    const t = performance.now() / 1000;
    ids.slice(0, 8).forEach((id, i) => {
      const x = w * 0.12 + i * ((w * 0.76) / 8);
      drawProduct(ctx, id, x, h * 0.52, 28, t, false);
    });
  }

  private resizeIfNeeded(): void {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    if (w === this.cssW && h === this.cssH) return;
    this.resize();
  }

  private resize(): void {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    this.cssW = w;
    this.cssH = h;
    this.dpr = Math.min(window.devicePixelRatio || 1, w < 700 ? 1.5 : 2);
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.run) this.layout = computeLayout(w, h, this.run.turno, maxSlotsFor(this.run.turno));
  }

  private showTitle(): void {
    this.view = "title";
    this.run = null;
    this.ui.title(this.save.muted, this.save.best);
    this.syncChrome();
  }

  private play(): void {
    this.run = createRun();
    this.selected = null;
    this.view = "play";
    this.ui.root.innerHTML = "";
    this.save.plays += 1;
    writeSave(this.save);
    this.resize();
    this.syncChrome();
    this.syncHud();
    this.audio.shift();
  }

  private pause(): void {
    if (this.view !== "play") return;
    this.view = "paused";
    this.ui.pause(this.save.muted);
    this.syncChrome();
  }

  private resume(): void {
    if (this.view !== "paused") return;
    this.view = "play";
    this.ui.root.innerHTML = "";
    this.syncChrome();
  }

  private finish(): void {
    if (!this.run) return;
    if (this.view === "over") return;
    const score = this.run.score;
    const served = this.run.served;
    const turno = this.run.turno;
    const isBest = score > this.save.best;
    if (isBest) this.save.best = score;
    if (turno > this.save.bestTurno) this.save.bestTurno = turno;
    writeSave(this.save);
    this.view = "over";
    this.ui.over(score, served, turno, this.save.best, isBest);
    this.syncChrome();
  }

  private handle(a: UiAction): void {
    void this.audio.unlock();
    switch (a.type) {
      case "play":
        this.play();
        break;
      case "how":
        this.view = "how";
        this.ui.how();
        this.syncChrome();
        break;
      case "credits":
        this.view = "credits";
        this.ui.credits();
        this.syncChrome();
        break;
      case "back":
      case "menu":
        this.showTitle();
        break;
      case "pause":
        this.pause();
        break;
      case "resume":
        this.resume();
        break;
      case "quit":
        this.showTitle();
        break;
      case "retry":
        this.play();
        break;
      case "mute": {
        const muted = this.audio.toggleMute();
        this.save.muted = muted;
        writeSave(this.save);
        this.syncMuteButtons();
        if (this.view === "title") this.ui.title(muted, this.save.best);
        if (this.view === "paused") this.ui.pause(muted);
        this.audio.click();
        break;
      }
      default:
        break;
    }
  }

  private syncChrome(): void {
    const playing = this.view === "play";
    document.body.classList.toggle("is-play", playing);
    document.body.dataset.view = this.view;
    this.hud.hidden = !playing;
    if (!playing) {
      this.bannerEl.hidden = true;
      this.toastEl.hidden = true;
    }
    this.syncMuteButtons();
  }

  private syncMuteButtons(): void {
    const label = this.save.muted ? "Som off" : "Som";
    const btn = document.getElementById("btn-mute");
    if (btn) btn.textContent = label;
  }

  private syncHud(): void {
    if (!this.run) return;
    const score = document.getElementById("hud-score");
    const combo = document.getElementById("hud-combo");
    const turno = document.getElementById("hud-turno");
    const lives = document.getElementById("hud-lives");
    if (score) score.textContent = String(this.run.score);
    if (turno) turno.textContent = this.run.turno >= 4 ? "Hora extra" : `Turno ${this.run.turno}`;
    if (lives) lives.textContent = livesGlyph(this.run.lives);
    if (combo) {
      if (this.run.combo >= 2) {
        combo.hidden = false;
        combo.textContent = `Combo ×${this.run.combo}`;
      } else combo.hidden = true;
    }
  }

  private syncBanner(): void {
    if (!this.run) return;
    if (this.run.banner && this.run.bannerT > 0) {
      this.bannerEl.hidden = false;
      this.bannerEl.textContent = this.run.banner;
    } else this.bannerEl.hidden = true;
  }

  private toast(text: string): void {
    this.toastEl.hidden = false;
    this.toastEl.textContent = text;
    window.setTimeout(() => {
      if (this.toastEl.textContent === text) this.toastEl.hidden = true;
    }, 1600);
  }
}
