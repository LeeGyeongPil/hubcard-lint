// AC-8 오프라인·스냅샷: src/ 에 네트워크 사용 없음, 스냅샷 = 설치된 @huggingface/tasks, --version 에 버전·날짜
import { execFileSync, spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SNAPSHOT_INFO } from "../src/index.js";
import { SNAPSHOT } from "../src/rules/index.js";
import { ROOT, cleanEnv, runCli } from "./helpers.js";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? sourceFiles(join(dir, e.name)) : e.name.endsWith(".ts") ? [join(dir, e.name)] : [],
  );
}

describe("offline", () => {
  it("src/ uses no network modules", () => {
    const files = sourceFiles(join(ROOT, "src"));
    expect(files.length).toBeGreaterThan(10);
    const banned = [/["']node:(http|https|net|tls|dgram|dns|http2)["']/, /["'](http|https|net|tls|dgram|dns|http2)["']/, /\bfetch\s*\(/, /XMLHttpRequest|WebSocket/];
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      for (const re of banned) expect(re.test(text), `${f} matches ${re}`).toBe(false);
    }
  });

  it("runtime dependencies are only the two YAML parsers", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    expect(Object.keys(pkg.dependencies).sort()).toEqual(["js-yaml", "yaml"]);
    expect(pkg.devDependencies["@huggingface/tasks"]).toBe("0.22.16");
  });
});

describe("rule docs", () => {
  it("docs/rules.md and docs/rules.ko.md list every rule with its level", async () => {
    const { RULES } = await import("../src/index.js");
    for (const doc of ["docs/rules.md", "docs/rules.ko.md"]) {
      const text = readFileSync(join(ROOT, doc), "utf8");
      for (const r of RULES) expect(text, `${doc} ${r.id}`).toContain(`| \`${r.id}\` | ${r.severity} |`);
    }
  });
});

describe("snapshot", () => {
  it("records the source version and date", () => {
    expect(SNAPSHOT_INFO).toEqual({ tasksVersion: "0.22.16", checked: "2026-11-17" });
    expect(SNAPSHOT.pipelineTypes).toHaveLength(57);
    expect(SNAPSHOT.subtaskTypes).toHaveLength(75);
    expect(SNAPSHOT.modelLibraries).toHaveLength(296);
    expect(SNAPSHOT.licenses).toContain("apache-2.0");
    expect(SNAPSHOT.licenses).toHaveLength(83); // repositories-licenses 표 83행(2026-11-17)
    expect(SNAPSHOT.suggestedHardware).toHaveLength(29);
  });

  it("refresh-snapshot --check reports zero difference against the installed package", () => {
    const out = execFileSync(process.execPath, [join(ROOT, "scripts/refresh-snapshot.mjs"), "--check"], { encoding: "utf8", env: cleanEnv() });
    expect(out).toContain("@huggingface/tasks installed 0.22.16, snapshot 0.22.16");
    expect(out).toContain("pipelineTypes: 57 entries, +0 -0");
    expect(out).toContain("modelLibraries: 296 entries, +0 -0");
    expect(out).toContain("difference: 0");
  });

  it("refresh-snapshot --check exits 0 (1 would mean drift)", () => {
    const r = spawnSync(process.execPath, [join(ROOT, "scripts/refresh-snapshot.mjs"), "--check"], { encoding: "utf8" });
    expect(r.status).toBe(0);
  });

  it("--version shows the snapshot version and date", () => {
    const r = runCli(["--version"]);
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/^hubcard-lint \d+\.\d+\.\d+ \(rules snapshot: @huggingface\/tasks 0\.22\.16, checked 2026-11-17\)$/m);
  });
});
