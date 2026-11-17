import type { CardType } from "./types.js";
export declare function detectType(data: unknown): CardType;
export declare function isRecord(v: unknown): v is Record<string, unknown>;
