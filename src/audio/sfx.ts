export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;
  unlocked = false;

  async unlock(): Promise<void> {
    if (this.unlocked && this.ctx?.state === "running") return;
    if (!this.ctx) this.build();
    if (!this.ctx) return;
    await this.ctx.resume();
    this.unlocked = true;
  }

  private build(): void {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.28;
    this.master.connect(this.ctx.destination);
    // Sem zumbido/ambiente contínuo — só efeitos curtos nas ações.
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.28;
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain = 0.12, slide?: number): void {
    if (!this.ctx || !this.master || this.muted) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), this.ctx.currentTime + dur);
    g.gain.setValueAtTime(gain, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g);
    g.connect(this.master);
    o.start();
    o.stop(this.ctx.currentTime + dur + 0.02);
  }

  bell(): void {
    this.tone(880, 0.12, "sine", 0.09);
    this.tone(1320, 0.18, "triangle", 0.05);
  }

  pickup(): void {
    this.tone(420, 0.07, "square", 0.05);
    this.tone(640, 0.09, "triangle", 0.06);
  }

  cash(): void {
    this.tone(523, 0.07, "square", 0.06);
    this.tone(784, 0.12, "triangle", 0.07);
    this.tone(1046, 0.16, "sine", 0.04);
  }

  combo(n: number): void {
    const f = 520 + Math.min(8, n) * 40;
    this.tone(f, 0.1, "triangle", 0.07);
    this.tone(f * 1.5, 0.14, "sine", 0.05);
  }

  wrong(): void {
    this.tone(180, 0.16, "sawtooth", 0.08, 90);
  }

  slam(): void {
    this.tone(90, 0.22, "sawtooth", 0.11, 50);
  }

  shift(): void {
    this.tone(392, 0.1, "triangle", 0.06);
    window.setTimeout(() => this.tone(523, 0.12, "triangle", 0.06), 90);
    window.setTimeout(() => this.tone(659, 0.16, "triangle", 0.07), 180);
  }

  over(): void {
    this.tone(330, 0.18, "triangle", 0.07, 200);
    window.setTimeout(() => this.tone(247, 0.22, "sine", 0.07, 140), 160);
    window.setTimeout(() => this.tone(196, 0.3, "sine", 0.08, 110), 320);
  }

  chaos(): void {
    this.tone(200, 0.2, "square", 0.04, 140);
  }

  click(): void {
    this.tone(700, 0.05, "square", 0.035);
  }
}
