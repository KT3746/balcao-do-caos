export type UiAction =
  | { type: "play" }
  | { type: "how" }
  | { type: "credits" }
  | { type: "back" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "quit" }
  | { type: "retry" }
  | { type: "mute" }
  | { type: "menu" };

export class Screens {
  root: HTMLElement;
  onAction: (a: UiAction) => void = () => undefined;
  private lastFire = 0;

  constructor(root: HTMLElement) {
    this.root = root;
    this.root.addEventListener("click", (e) => {
      const t = (e.target as HTMLElement | null)?.closest("[data-act]") as HTMLElement | null;
      if (!t) return;
      const now = performance.now();
      if (now - this.lastFire < 220) return;
      this.lastFire = now;
      this.onAction({ type: t.dataset.act as UiAction["type"] });
    });
  }

  private set(html: string): void {
    this.root.innerHTML = html;
  }

  title(muted: boolean, best: number): void {
    this.set(`
      <section class="screen">
        <div class="screen-body">
          <div class="topbar">
            <div class="brand">
              <div class="eyebrow">Lojinha original</div>
              <h1>Balcão do Caos</h1>
              <p class="lede">No Mercadinho do Caos, clientes pedem. Você pega o produto certo. A paciência acaba primeiro — a não ser que você seja mais rápido.</p>
              ${best > 0 ? `<p class="best">Recorde local: <b>${best}</b></p>` : ""}
            </div>
            <button type="button" class="icon-btn mute-btn" data-act="mute" aria-label="${muted ? "Ativar som" : "Mudo"}">${muted ? "Som off" : "Som"}</button>
          </div>
        </div>
        <div class="screen-foot col">
          <button type="button" class="btn primary" data-act="play">Abrir a loja</button>
          <div class="row">
            <button type="button" class="btn ghost" data-act="how">Como jogar</button>
            <button type="button" class="btn ghost" data-act="credits">Créditos</button>
          </div>
        </div>
      </section>`);
  }

  how(): void {
    this.set(`
      <section class="screen solid">
        <div class="screen-body">
          <div class="eyebrow">Manual de balcão</div>
          <h2>Como jogar</h2>
          <div class="sheet">
            <p><b>1.</b> O cliente chega com um (ou mais) produtos no balão.</p>
            <p><b>2.</b> Toque no produto na prateleira — ou arraste até a pessoa.</p>
            <p><b>3.</b> Toque no cliente para entregar. Errar gasta paciência e zera o combo.</p>
            <p><b>4.</b> Três clientes furiosos encerram o expediente. O ritmo sobe a cada turno.</p>
            <p><b>Celular:</b> só o dedo. <b>Computador:</b> clique, arraste, ou teclas 1–8 / Q–R nos produtos, ← → escolhe o cliente, Espaço entrega, Esc pausa, M muda o som.</p>
            <p>Olho no sósia: <b>Pingo</b> não é <b>Pingo Zero</b>. <b>Detergente</b> não é <b>Amaciante</b>.</p>
          </div>
        </div>
        <div class="screen-foot">
          <button type="button" class="btn primary" data-act="back">Voltar</button>
        </div>
      </section>`);
  }

  credits(): void {
    this.set(`
      <section class="screen solid">
        <div class="screen-body">
          <div class="eyebrow">Ficha técnica</div>
          <h2>Créditos</h2>
          <div class="sheet">
            <p><b>Balcão do Caos</b> é um jogo original de atendimento no navegador. Nenhuma marca de mercado real, mascote emprestado ou IP de terceiros — só uma esquina inventada e uma fila impaciente.</p>
            <p>Canvas 2D · TypeScript · Vite · áudio procedural (Web Audio). Feito para celular e computador.</p>
            <p>MIT · KT3746</p>
          </div>
        </div>
        <div class="screen-foot">
          <button type="button" class="btn primary" data-act="back">Voltar</button>
        </div>
      </section>`);
  }

  pause(muted: boolean): void {
    this.set(`
      <section class="overlay">
        <div class="panel">
          <div class="eyebrow">Expediente interrompido</div>
          <h2>Pausa</h2>
          <p class="lede">A fila congelou. Você não.</p>
          <div class="stack">
            <button type="button" class="btn primary" data-act="resume">Continuar</button>
            <button type="button" class="btn" data-act="mute">${muted ? "Ativar som" : "Mudo"}</button>
            <button type="button" class="btn danger" data-act="quit">Fechar a loja</button>
          </div>
        </div>
      </section>`);
  }

  over(score: number, served: number, turno: number, best: number, isBest: boolean): void {
    this.set(`
      <section class="screen solid">
        <div class="screen-body">
          <div class="eyebrow">${isBest ? "Novo recorde da esquina" : "Caixa fechado"}</div>
          <h2>${score >= 2000 ? "Caos com classe" : score >= 800 ? "Quase deu conta" : "A fila venceu"}</h2>
          <div class="sheet stats">
            <p><b>Pontos:</b> ${score}</p>
            <p><b>Clientes atendidos:</b> ${served}</p>
            <p><b>Turno:</b> ${turno === 4 ? "hora extra" : turno}</p>
            <p><b>Recorde:</b> ${best}</p>
          </div>
        </div>
        <div class="screen-foot col">
          <button type="button" class="btn primary" data-act="retry">Outro expediente</button>
          <button type="button" class="btn" data-act="menu">Menu</button>
        </div>
      </section>`);
  }
}
