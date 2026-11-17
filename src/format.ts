// 출력 형식. text 는 사람이 읽는 한 줄 진단 + 허브 원문·제안 + 요약, json 은 CI 용 그대로의 결과.
import { plural, t } from "./i18n.js";
import type { Lang, LintResult } from "./types.js";

export interface FormatOptions {
  lang?: Lang;
  /** error 만 출력 */
  quiet?: boolean;
}

// 허브 원문 중 공식 목록 전체를 나열하는 문구(태스크 57개·하드웨어 29개)는 화면에서만 줄인다(json 은 전체)
const HUB_TEXT_MAX = 160;

export function formatText(results: LintResult[], options: FormatOptions = {}): string {
  const lang: Lang = options.lang === "ko" ? "ko" : "en";
  const lines: string[] = [];
  const total = { error: 0, warning: 0, lint: 0 };

  for (const r of results) {
    total.error += r.counts.error;
    total.warning += r.counts.warning;
    total.lint += r.counts.lint;
    for (const d of r.diagnostics) {
      if (options.quiet && d.severity !== "error") continue;
      // <파일>:<줄>:<열>  <등급>  <설명>  <규칙>
      const message = t(lang, `msg.${d.messageId}`, d.params);
      lines.push(`${r.file}:${d.line}:${d.column}  ${t(lang, `severity.${d.severity}`)}  ${message}  ${d.rule}`);
      if (d.hub) lines.push(`    ${t(lang, "label.hub")}: ${shorten(d.hub)}`);
      if (d.suggestion) lines.push(`    ${t(lang, "label.fix")}: ${t(lang, "fix.didYouMean", { value: d.suggestion })}`);
    }
  }

  const summary = [
    plural(lang, "summary.files", results.length),
    plural(lang, "summary.errors", total.error),
    plural(lang, "summary.warnings", total.warning),
    t(lang, "summary.lint", { n: total.lint }),
  ].join(" · ");
  if (lines.length) lines.push("");
  lines.push(summary);
  return lines.join("\n") + "\n";
}

export function formatJson(results: LintResult[], options: Pick<FormatOptions, "quiet"> = {}): string {
  const shown = options.quiet
    ? results.map((r) => ({ ...r, diagnostics: r.diagnostics.filter((d) => d.severity === "error") }))
    : results;
  return JSON.stringify(shown, null, 2) + "\n";
}

function shorten(s: string): string {
  return s.length > HUB_TEXT_MAX ? `${s.slice(0, HUB_TEXT_MAX - 1)}…` : s;
}
