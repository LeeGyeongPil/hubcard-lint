// 화면 언어. 사용자에게 보이는 문구는 전부 i18n/en.json · i18n/ko.json 한 곳에 모은다(두 파일의 키가 같아야 한다).
// 언어 결정 순서: --lang > HUBCARD_LINT_LANG > LC_ALL > LC_MESSAGES > LANG. 한국어(ko…)가 아니면 영어.
import { createRequire } from "node:module";
import type { Lang } from "./types.js";

const require = createRequire(import.meta.url);
export const MESSAGES: Record<Lang, Record<string, string>> = {
  en: require("./i18n/en.json") as Record<string, string>,
  ko: require("./i18n/ko.json") as Record<string, string>,
};

export const LANGS: readonly Lang[] = ["en", "ko"];

/** 환경 변수 순서대로 처음 값이 있는 것 하나로 정한다(POSIX 로캘과 같은 방식). */
export function resolveLang(flag: string | undefined, env: NodeJS.ProcessEnv = process.env): Lang {
  const sources = [flag, env.HUBCARD_LINT_LANG, env.LC_ALL, env.LC_MESSAGES, env.LANG];
  const first = sources.find((v) => v !== undefined && v !== "");
  return first !== undefined && first.toLowerCase().startsWith("ko") ? "ko" : "en";
}

/** 메시지 키를 언어에 맞게 채운다. {name} 자리에 params 값. 없는 키는 영어로, 영어에도 없으면 키 그대로. */
export function t(lang: Lang, key: string, params: Record<string, string | number> = {}): string {
  const template = MESSAGES[lang][key] ?? MESSAGES.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole));
}

/** 수 표현(영어 단수·복수). */
export function plural(lang: Lang, base: string, n: number): string {
  return t(lang, `${base}.${n === 1 ? "one" : "other"}`, { n });
}
