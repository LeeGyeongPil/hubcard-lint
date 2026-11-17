export declare function normalize(value: string): string;
export declare function suggest(value: unknown, candidates: readonly string[]): string | undefined;
/** 레벤슈타인 거리. limit 이상이 확실하면 일찍 멈춘다(후보 수백 개를 빠르게 훑기 위해). */
export declare function editDistance(a: string, b: string, limit?: number): number;
