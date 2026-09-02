export type ProductId =
  | "guarana"
  | "guaranaZero"
  | "caju"
  | "choco"
  | "agua"
  | "lua"
  | "raio"
  | "pao"
  | "detergente"
  | "amaciante"
  | "macarrao"
  | "leite"
  | "picole"
  | "feijao"
  | "esponja"
  | "cafe";

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
