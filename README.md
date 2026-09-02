# Balcão do Caos

Atenda o **Mercadinho Relâmpago** antes da paciência da fila acabar. Jogo **original** no navegador — nenhuma marca real, mascote emprestado ou IP de terceiros.

**Jogar agora:** [https://kt3746.github.io/balcao-do-caos/](https://kt3746.github.io/balcao-do-caos/)

## Como jogar

1. Abra o link (ou rode localmente).
2. Toque ou clique uma vez para liberar o áudio (obrigatório no Safari do iPhone).
3. Toque em **Abrir a loja**.
4. O cliente mostra o pedido num balão. Pegue o produto na prateleira e entregue nele.
5. Três clientes que vão embora furiosos encerram o expediente. O ritmo sobe a cada turno.

Dá para **tocar** o produto e depois o cliente, ou **arrastar** o item até a pessoa. Combo aumenta se você acerta em sequência. Produto errado zera o combo e come paciência.

Olho no sósia: **Guaraná Pingo** não é **Pingo Zero**. **Detergente Brilho** não é **Amaciante Brilho**.

O jogo detecta celular e computador. No telefone, só o dedo. No desktop, mouse e teclado juntos.

## Controles

### Toque (iPhone / Android)

- Toque no produto para pegar.
- Toque no cliente para entregar.
- Arraste o produto até o cliente.
- **Pausa** e **Som** ficam no topo.

### Teclado (desktop)

| Ação | Teclas |
| --- | --- |
| Pegar produto | `1`–`8`, depois `Q` `W` `E` `R` `A` `S` `D` `F` |
| Escolher cliente | `←` `→` |
| Entregar | Espaço ou Enter |
| Pausar | Esc |
| Som | M |

## O que vai acontecendo

- **Turno 1** — a loja abre, pedidos simples.
- **Turno 2** — mais gente, produtos parecidos.
- **Turno 3** — pedidos longos e eventos de caos.
- **Hora extra** — a fila não fecha até três clientes pirarem.

Eventos: **apagão** (a loja escurece), **liquidação** (as prateleiras trocam de lugar), **gato** (bloqueia uma gôndola) e **hora do rush** (dois clientes de uma vez).

O recorde fica salvo neste navegador.

## Rodar localmente

Precisa de Node 20+.

```bash
npm install
npm run dev
```

Abra `http://localhost:5173/balcao-do-caos/` (o `base` do Vite é `/balcao-do-caos/`, o mesmo do GitHub Pages).

```bash
npm run build
npm run preview
```

## Publicação

O workflow em `.github/workflows/deploy.yml` gera o site e publica no GitHub Pages a cada push em `main`. Assets saem com hash no nome; o `index.html` leva um `build-id` e `dist/version.txt` com o commit — isso evita ficar preso numa versão antiga no cache.

Pages já está em **GitHub Actions**. Depois do merge em `main`, o endereço é [https://kt3746.github.io/balcao-do-caos/](https://kt3746.github.io/balcao-do-caos/).

## Licença

MIT. Áudio é sintético (Web Audio). Nenhum sample protegido.
