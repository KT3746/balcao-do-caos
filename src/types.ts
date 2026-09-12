export type ProductId =
  | "refri"
  | "refriZero"
  | "suco"
  | "leite"
  | "agua"
  | "pao"
  | "biscoito"
  | "salgadinho"
  | "chocolate"
  | "ovos"
  | "macarrao"
  | "arroz"
  | "feijao"
  | "cafe"
  | "detergente"
  | "amaciante";

export type CustomerMood = "enter" | "wait" | "happy" | "leave" | "rage";

export type ChaosKind = "apagao" | "liquidacao" | "gato" | "rush";

export type View = "title" | "how" | "credits" | "play" | "paused" | "over";

export type SaveData = {
  best: number;
  bestTurno: number;
  muted: boolean;
  seenHow: boolean;
  plays: number;
};
