// AC-7 화면 언어(en/ko): 메시지 키 동일, 결정 순서, 실제 출력 전환, 허브 원문은 영어 그대로
import { describe, expect, it } from "vitest";
import { MESSAGES, resolveLang, t } from "../src/i18n.js";
import { RULES, formatText, lintCard } from "../src/index.js";
import { fixture, fixturePath, runCli } from "./helpers.js";

const HANGUL = /[가-힣]/;

describe("message tables", () => {
  it("en.json and ko.json have identical keys", () => {
    expect(Object.keys(MESSAGES.ko).sort()).toEqual(Object.keys(MESSAGES.en).sort());
  });

  it("every rule has a message and a description in both languages", () => {
    for (const lang of ["en", "ko"] as const) {
      for (const r of RULES) {
        expect(MESSAGES[lang][`msg.${r.id}`], `${lang} msg.${r.id}`).toBeTruthy();
        expect(MESSAGES[lang][`desc.${r.id}`], `${lang} desc.${r.id}`).toBeTruthy();
      }
    }
  });

  it("placeholders match between languages", () => {
    const names = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const key of Object.keys(MESSAGES.en)) {
      expect(names(MESSAGES.ko[key]!), key).toEqual(names(MESSAGES.en[key]!));
    }
  });

  it("Korean texts are actually Korean (except technical labels)", () => {
    const untranslated = Object.keys(MESSAGES.en).filter(
      (k) => MESSAGES.en[k] === MESSAGES.ko[k] && !["severity.lint", "summary.lint", "usage.prefix", "rules.basis.package", "rules.notObserved"].includes(k) && !k.startsWith("summary.lint"),
    );
    expect(untranslated).toEqual([]);
  });
});

describe("language resolution order", () => {
  it.each([
    [undefined, {}, "en"],
    ["ko", {}, "ko"],
    ["en", { HUBCARD_LINT_LANG: "ko", LANG: "ko_KR.UTF-8" }, "en"],
    [undefined, { HUBCARD_LINT_LANG: "ko", LANG: "en_US.UTF-8" }, "ko"],
    [undefined, { HUBCARD_LINT_LANG: "en", LC_ALL: "ko_KR.UTF-8" }, "en"],
    [undefined, { LC_ALL: "ko_KR.UTF-8", LANG: "en_US.UTF-8" }, "ko"],
    [undefined, { LC_ALL: "C", LANG: "ko_KR.UTF-8" }, "en"],
    [undefined, { LC_MESSAGES: "ko_KR.UTF-8", LANG: "en_US.UTF-8" }, "ko"],
    [undefined, { LANG: "ko_KR.UTF-8" }, "ko"],
    [undefined, { LANG: "fr_FR.UTF-8" }, "en"],
    [undefined, { LANG: "" }, "en"],
  ] as const)("flag %s env %j -> %s", (flag, env, expected) => {
    expect(resolveLang(flag, env as NodeJS.ProcessEnv)).toBe(expected);
  });
});

describe("output in the chosen language", () => {
  it("help", () => {
    const en = runCli(["--help", "--lang", "en"]);
    const ko = runCli(["--help", "--lang", "ko"]);
    expect(en.code).toBe(0);
    expect(en.stdout).toContain("Usage: hubcard-lint");
    expect(en.stdout).not.toMatch(HANGUL);
    expect(ko.stdout).toContain("사용법: hubcard-lint");
  });

  it("diagnostics and summary, with the Hub original kept in English", () => {
    const en = runCli(["--lang", "en", fixturePath("space_bad.md")]);
    const ko = runCli(["--lang=ko", fixturePath("space_bad.md")]);
    expect(en.stdout).toContain('colorFrom "orange" is not one of');
    expect(en.stdout).toContain("1 file · 3 errors · 0 warnings · 1 lint");
    expect(en.stdout).not.toMatch(HANGUL);
    expect(ko.stdout).toContain('colorFrom "orange" 은(는)');
    expect(ko.stdout).toContain("파일 1개 · 오류 3 · 경고 0 · lint 1");
    // 허브 원문은 두 언어 모두 영어 그대로
    const hub = '"colorFrom" must be one of [red, yellow, green, blue, indigo, purple, pink, gray]';
    expect(en.stdout).toContain(`hub: ${hub}`);
    expect(ko.stdout).toContain(`허브 원문: ${hub}`);
  });

  it("usage errors", () => {
    const en = runCli(["--lang", "en", "missing.md"]);
    const ko = runCli(["--lang", "ko", "missing.md"]);
    expect(en.code).toBe(2);
    expect(en.stderr).toContain("path not found: missing.md");
    expect(ko.code).toBe(2);
    expect(ko.stderr).toContain("경로가 없습니다: missing.md");
    expect(runCli(["--lang", "ko", "--bogus"]).stderr).toContain('알 수 없는 옵션 "--bogus"');
  });

  it("environment variables pick the language when --lang is absent", () => {
    expect(runCli(["--version"], { env: { HUBCARD_LINT_LANG: "ko" } }).stdout).toContain("규칙 스냅샷");
    expect(runCli(["--version"], { env: { LANG: "ko_KR.UTF-8" } }).stdout).toContain("규칙 스냅샷");
    expect(runCli(["--version"], { env: { LANG: "ko_KR.UTF-8", LC_ALL: "en_US.UTF-8" } }).stdout).toContain("rules snapshot");
    expect(runCli(["--version", "--lang", "en"], { env: { HUBCARD_LINT_LANG: "ko" } }).stdout).toContain("rules snapshot");
  });

  it("rejects languages other than en/ko", () => {
    const r = runCli(["--lang", "fr", fixturePath("good.md")]);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain('invalid value "fr" for --lang');
  });

  it("library: message and formatText follow lang; hub stays English", () => {
    const ko = lintCard(fixture("bad_values.md"), { lang: "ko" });
    const en = lintCard(fixture("bad_values.md"));
    const koLicense = ko.diagnostics.find((d) => d.rule === "license/unknown")!;
    const enLicense = en.diagnostics.find((d) => d.rule === "license/unknown")!;
    expect(koLicense.message).toMatch(HANGUL);
    expect(enLicense.message).not.toMatch(HANGUL);
    expect(koLicense.hub).toBe(enLicense.hub);
    // 같은 결과를 다른 언어로 다시 그릴 수 있다(messageId + params)
    expect(formatText([en], { lang: "ko" })).toContain(t("ko", "msg.license/unknown", { value: "Apache 2.0" }));
  });
});
