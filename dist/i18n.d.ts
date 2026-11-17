import type { Lang } from "./types.js";
export declare const MESSAGES: Record<Lang, Record<string, string>>;
export declare const LANGS: readonly Lang[];
/** 환경 변수 순서대로 처음 값이 있는 것 하나로 정한다(POSIX 로캘과 같은 방식). */
export declare function resolveLang(flag: string | undefined, env?: NodeJS.ProcessEnv): Lang;
/** 메시지 키를 언어에 맞게 채운다. {name} 자리에 params 값. 없는 키는 영어로, 영어에도 없으면 키 그대로. */
export declare function t(lang: Lang, key: string, params?: Record<string, string | number>): string;
/** 수 표현(영어 단수·복수). */
export declare function plural(lang: Lang, base: string, n: number): string;
