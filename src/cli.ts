#!/usr/bin/env node
// hubcard-lint CLI. 종료 코드: 0 = error 없음, 1 = error 있음(--strict 면 모든 진단), 2 = 사용 오류
import { readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { formatJson, formatText } from "./format.js";
import { LANGS, resolveLang, t } from "./i18n.js";
import { lintFile } from "./lint.js";
import { RULES, SNAPSHOT_INFO } from "./rules/index.js";
import { HubcardLintError, type CardType, type Lang, type LintResult } from "./types.js";

const require = createRequire(import.meta.url);
const VERSION = (require("../package.json") as { version: string }).version;

const TYPES = ["auto", "model", "dataset", "space"];
const FORMATS = ["text", "json"];
const SKIP_DIRS = new Set(["node_modules", ".git"]);

/** 사용 오류: 메시지 키와 자리 값을 들고 다니다가 고른 언어로 찍는다 */
class UsageError extends Error {
  constructor(
    readonly key: string,
    readonly params: Record<string, string>,
  ) {
    super(key);
  }
}

async function main(argv: string[]): Promise<number> {
  // 오류 문구도 고른 언어로 내야 하므로 --lang 은 인자 해석 전에 먼저 본다
  const lang = resolveLang(peekLang(argv));
  try {
    return await run(argv, lang);
  } catch (err) {
    if (err instanceof UsageError) {
      process.stderr.write(`${t(lang, "usage.prefix")}${t(lang, err.key, err.params)}\n${t(lang, "usage.hint")}\n`);
      return 2;
    }
    throw err;
  }
}

async function run(argv: string[], lang: Lang): Promise<number> {
  const { values, positionals } = parse(argv);

  if (values.lang !== undefined && !LANGS.includes(values.lang as Lang)) {
    throw new UsageError("usage.badValue", { option: "--lang", value: values.lang, expected: LANGS.join(", ") });
  }
  if (values.help) {
    process.stdout.write(t(lang, "help", { version: VERSION }) + "\n");
    return 0;
  }
  if (values.version) {
    process.stdout.write(t(lang, "version", { version: VERSION, ...SNAPSHOT_INFO }) + "\n");
    return 0;
  }
  if (values["list-rules"]) {
    process.stdout.write(listRules(lang));
    return 0;
  }

  const type = values.type ?? "auto";
  if (!TYPES.includes(type)) throw new UsageError("usage.badValue", { option: "--type", value: type, expected: TYPES.join(", ") });
  const format = values.format ?? "text";
  if (!FORMATS.includes(format)) throw new UsageError("usage.badValue", { option: "--format", value: format, expected: FORMATS.join(", ") });

  // 검사할 파일 모으기(경로가 없으면 ./README.md)
  const files = collect(positionals.length ? positionals : ["README.md"]);

  const results: LintResult[] = [];
  for (const file of files) {
    try {
      results.push(await lintFile(file, { type: type as CardType | "auto", lang }));
    } catch (err) {
      if (err instanceof HubcardLintError && err.code === "E_READ") {
        const reason = err.cause instanceof Error ? err.cause.message : err.message;
        throw new UsageError("usage.readFailed", { path: file, reason });
      }
      throw err;
    }
  }

  const quiet = values.quiet === true;
  process.stdout.write(format === "json" ? formatJson(results, { quiet }) : formatText(results, { lang, quiet }));

  if (values["exit-zero"]) return 0;
  const errors = results.reduce((n, r) => n + r.counts.error, 0);
  const others = results.reduce((n, r) => n + r.counts.warning + r.counts.lint, 0);
  return errors > 0 || (values.strict && others > 0) ? 1 : 0;
}

function parse(argv: string[]) {
  try {
    return parseArgs({
      args: argv,
      allowPositionals: true,
      strict: true,
      options: {
        type: { type: "string" },
        format: { type: "string" },
        strict: { type: "boolean" },
        "exit-zero": { type: "boolean" },
        quiet: { type: "boolean" },
        lang: { type: "string" },
        "list-rules": { type: "boolean" },
        version: { type: "boolean" },
        help: { type: "boolean", short: "h" },
      },
    });
  } catch (err) {
    // node:util parseArgs 의 영어 오류를 메시지 키로 바꾼다
    const e = err as { code?: string; message?: string };
    const option = /'(-[^' ]+)/.exec(e.message ?? "")?.[1] ?? "";
    if (e.code === "ERR_PARSE_ARGS_UNKNOWN_OPTION") throw new UsageError("usage.unknownOption", { option });
    if (e.code === "ERR_PARSE_ARGS_INVALID_OPTION_VALUE") {
      const key = /does not take an argument/.test(e.message ?? "") ? "usage.unexpectedArgument" : "usage.missingValue";
      throw new UsageError(key, { option });
    }
    if (e.code === "ERR_PARSE_ARGS_UNEXPECTED_POSITIONAL") throw new UsageError("usage.unknownOption", { option });
    throw err;
  }
}

/** --lang ko · --lang=ko 를 해석 전에 엿본다. 값이 en/ko 가 아니면 무시(나중에 사용 오류로 알린다) */
function peekLang(argv: string[]): string | undefined {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--") break;
    const v = a === "--lang" ? argv[i + 1] : a.startsWith("--lang=") ? a.slice(7) : undefined;
    if (v !== undefined && LANGS.includes(v as Lang)) return v;
  }
  return undefined;
}

/** 파일은 그대로, 폴더는 하위 README.md 를 모은다(node_modules·.git 건너뜀, 심볼릭 링크 폴더는 따라가지 않음) */
function collect(paths: string[]): string[] {
  const files: string[] = [];
  for (const p of paths) {
    let isDir: boolean;
    try {
      isDir = statSync(p).isDirectory();
    } catch {
      throw new UsageError("usage.pathNotFound", { path: p });
    }
    if (!isDir) {
      files.push(p);
      continue;
    }
    const found = walk(p);
    if (found.length === 0) throw new UsageError("usage.noReadme", { path: p });
    files.push(...found);
  }
  return files;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const e of entries) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) out.push(...walk(join(dir, e.name)));
    } else if (e.isFile() && e.name === "README.md") {
      out.push(join(dir, e.name));
    }
  }
  // 폴더 자신의 README.md 를 먼저 보여 준다
  return out.sort((a, b) => depth(a) - depth(b) || (a < b ? -1 : a > b ? 1 : 0));
}

function depth(p: string): number {
  return p.split(/[\\/]/).length;
}

function listRules(lang: Lang): string {
  const rows = [t(lang, "rules.header")];
  for (const r of RULES) {
    rows.push([r.id, t(lang, `severity.${r.severity}`), r.types.join(","), t(lang, `rules.basis.${r.basis}`), r.observed ?? t(lang, "rules.notObserved"), r.source].join("\t"));
    rows.push(`    ${t(lang, `desc.${r.id}`)}`);
  }
  return rows.join("\n") + "\n";
}

main(process.argv.slice(2)).then(
  (code) => {
    // process.exit 대신 exitCode — 파이프로 넘기는 출력이 다 쓰인 뒤에 끝난다
    process.exitCode = code;
  },
  (err: unknown) => {
    process.stderr.write(`hubcard-lint: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`);
    process.exitCode = 2;
  },
);
