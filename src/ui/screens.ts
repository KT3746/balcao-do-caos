import { GAME_TITLE } from "../config";

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
  | { type: "menu" }
  | { type: "begin" };

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
      <section class="screen title-screen">
        <div class="screen-body">
          <div class="topbar">
            <div class="brand">
              <div class="eyebrow">Lojinha de esquina</div>
              <h1>${GAME_TITLE}</h1>
              <p class="lede">Fila na porta. Produto certo na mão. Entrega antes da paciência estourar.</p>
              ${best > 0 ? `<p class="best">Recorde local: <b>${best}</b></p>` : ""}
            </div>
            <button type="button" class="icon-btn mute-btn" data-act="mute" aria-label="${muted ? "Ativar som" : "Mudo"}">${muted ? "Som off" : "Som"}</button>
          </div>
        </div>
        <div class="screen-foot col">
          <button type="button" class="btn primary cta" data-act="play">Abrir a loja</button>
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
          <div class="eyebrow">Manual do mercadinho</div>
          <h2>Como jogar</h2>
          <div class="sheet">
            <p><b>1.</b> O cliente chega com um (ou mais) produtos no balão.</p>
            <p><b>2.</b> Toque no produto na prateleira — ou arraste até a pessoa.</p>
            <p><b>3.</b> Toque no cliente para entregar. Errar gasta paciência e zera o combo.</p>
            <p><b>4.</b> Quatro clientes furiosos encerram o expediente. O ritmo sobe a cada turno.</p>
            <p><b>Celular:</b> só o dedo. Toque vazio ou <b>Soltar</b> larga o item. Use <b>1x/2x/3x</b> no topo pra acelerar.</p>
            <p><b>Computador:</b> clique, arraste, ou teclas <b>1–8</b> (e Q W E R) nos produtos. <b>3</b> pega o terceiro item, não pausa. ← → escolhe o cliente, <b>Espaço</b> entrega no cliente marcado, <b>Esc</b> solta o item (ou pausa se a mão estiver vazia), botão direito também solta, M muda o som. O botão <b>1x/2x/3x</b> acelera o expediente.</p>
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
            <p><b>${GAME_TITLE}</b> é um jogo original de atendimento no navegador. Nenhuma marca de mercado real, mascote emprestado ou IP de terceiros — só um mercadinho inventado e uma fila impaciente.</p>
            <p>Canvas 2D · TypeScript · Vite · áudio procedural (Web Audio). Feito para celular e computador.</p>
            <p>MIT · KT3746</p>
          </div>
        </div>
        <div class="screen-foot">
          <button type="button" class="btn primary" data-act="back">Voltar</button>
        </div>
      </section>`);
  }

  intro(touch: boolean): void {
    const grab = touch
      ? "Toque no produto na prateleira — ou arraste até a pessoa."
      : "Clique no produto na prateleira — ou arraste até a pessoa.";
    const give = touch
      ? "Toque no cliente para entregar. O pedido está no balão."
      : "Clique no cliente para entregar. O pedido está no balão.";
    this.set(`
      <section class="overlay intro-overlay">
        <div class="panel">
          <h2>${GAME_TITLE}</h2>
          <p class="lede">A fila só anda quando você fechar este recado. Ninguém perde vida enquanto lê.</p>
          <div class="sheet">
            <p><b>1.</b> ${grab}</p>
            <p><b>2.</b> ${give}</p>
            <p><b>3.</b> Quatro clientes furiosos encerram o expediente. O ritmo sobe depois.</p>
          </div>
          <div class="stack">
            <button type="button" class="btn primary cta" data-act="begin">Entendi — abrir o caixa</button>
          </div>
        </div>
      </section>`);
  }

  pause(muted: boolean): void {
    this.set(`
      <section class="overlay">
        <div class="panel premium-panel">
          <div class="eyebrow">Expediente interrompido</div>
          <h2>Pausa</h2>
          <p class="lede">A fila congelou. Você não.</p>
          <div class="stack">
            <button type="button" class="btn primary cta" data-act="resume">Continuar</button>
            <button type="button" class="btn" data-act="mute">${muted ? "Ativar som" : "Mudo"}</button>
            <button type="button" class="btn danger" data-act="quit">Fechar a loja</button>
          </div>
        </div>
      </section>`);
  }

  over(score: number, served: number, turno: number, best: number, isBest: boolean): void {
    this.set(`
      <section class="screen solid over-screen">
        <div class="screen-body">
          <div class="eyebrow">${isBest ? "Novo recorde da esquina" : "Caixa fechado"}</div>
          <h2>${score >= 2000 ? "Mercado com classe" : score >= 800 ? "Quase deu conta" : "A fila venceu"}</h2>
          <div class="sheet stats">
            <p><b>Pontos:</b> ${score}</p>
            <p><b>Clientes atendidos:</b> ${served}</p>
            <p><b>Turno:</b> ${turno === 4 ? "hora extra" : turno}</p>
            <p><b>Recorde:</b> ${best}</p>
          </div>
        </div>
        <div class="screen-foot col">
          <button type="button" class="btn primary cta" data-act="retry">Outro expediente</button>
          <button type="button" class="btn ghost" data-act="menu">Menu</button>
        </div>
      </section>`);
  }
}
